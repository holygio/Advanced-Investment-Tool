import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PYTHON_API_PORT = 8000;
const PYTHON_API_URL = `http://localhost:${PYTHON_API_PORT}`;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start Python FastAPI server
  const isDev = app.get("env") === "development";
  const uvicornArgs = [
    '-m', 'uvicorn', 
    'api.main:app', 
    '--host', '0.0.0.0', 
    '--port', '8000'
  ];
  
  // Only use --reload in development
  if (isDev) {
    uvicornArgs.push('--reload');
  }
  
  const pythonServer = spawn('python', uvicornArgs, {
    cwd: isDev ? 'server' : 'dist',
    stdio: 'inherit'
  });

  pythonServer.on('error', (err) => {
    console.error('Failed to start Python API server:', err);
  });

  pythonServer.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`Python API server exited with code ${code}`);
    }
  });

  // Wait for Python server to start (longer in production for cold starts)
  const pythonStartDelay = isDev ? 3000 : 8000;
  await new Promise(resolve => setTimeout(resolve, pythonStartDelay));
  
  // Verify Python API is running (non-blocking)
  try {
    const healthCheck = await fetch(`${PYTHON_API_URL}/api/health`, {
      signal: AbortSignal.timeout(2000)
    });
    if (healthCheck.ok) {
      const health = await healthCheck.json();
      log(`✅ Python API: ${health.message}`);
    } else {
      log(`⚠️ Python API health check failed (status ${healthCheck.status})`);
    }
  } catch (err) {
    log(`⚠️ Python API health check failed - will retry on first API call`);
  }

  // Serve credentials.json before Vite middleware (editable file)
  app.get('/credentials.json', (_req, res) => {
    // In production, credentials are in dist/public, in dev they're in public/
    const isDev = app.get("env") === "development";
    const credentialsPath = isDev 
      ? path.resolve(process.cwd(), 'public', 'credentials.json')
      : path.resolve(process.cwd(), 'dist', 'public', 'credentials.json');
    
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      log(`Serving credentials from ${isDev ? 'public' : 'dist/public'}`);
      res.json(credentials);
    } catch (err) {
      log(`Failed to load credentials from ${credentialsPath}: ${err}`);
      res.status(500).json({ error: 'Failed to load credentials' });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    pythonServer.kill();
    process.exit();
  });
})();
