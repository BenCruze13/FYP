from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.forecast_schema import ForecastRequest, ForecastResult
from app.forecasting.prophet_model import generate_forecast

router = APIRouter()

@router.post("/predict", response_model=List[ForecastResult])
async def predict_sales(request: ForecastRequest):
    try:
        results = generate_forecast(request.model_dump())
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
