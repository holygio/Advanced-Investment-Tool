import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Python API configuration (matches server/index.ts)
const PYTHON_API_PORT = 8000;
const PYTHON_API_URL = `http://localhost:${PYTHON_API_PORT}`;

export async function registerRoutes(app: Express): Promise<Server> {
  // Proxy all /api requests to Python FastAPI server
  app.all("/api/*", async (req, res) => {
    try {
      const pythonUrl = `${PYTHON_API_URL}${req.path}`;
      
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(pythonUrl, fetchOptions);
      const data = await response.json();
      
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error('Error proxying to Python API:', error);
      res.status(500).json({ 
        message: 'Error communicating with Python API', 
        detail: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
