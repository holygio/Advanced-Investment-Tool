from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import data, portfolio, model, risk, utility, fixedincome

app = FastAPI(title="Advanced Investments Interactive Lab API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(data.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(model.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(utility.router, prefix="/api")
app.include_router(fixedincome.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Advanced Investments API is running"}
