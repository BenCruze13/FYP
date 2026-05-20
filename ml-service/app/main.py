from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import forecast_routes, optimize_routes

app = FastAPI(
    title="Optify ML Service",
    description="Python microservice for forecasting and optimization",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(forecast_routes.router, prefix="/api/ml/forecast", tags=["Forecasting"])
app.include_router(optimize_routes.router, prefix="/api/ml/optimize", tags=["Optimization"])

@app.get("/api/ml/health")
async def health_check():
    return {"status": "ok", "message": "ML Service is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
