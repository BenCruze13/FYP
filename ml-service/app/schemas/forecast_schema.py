from pydantic import BaseModel, Field
from typing import Optional, List

class ForecastRequest(BaseModel):
    user_id: int = Field(..., description="Currently authenticated user ID")
    upload_id: int = Field(..., description="Selected active upload dataset ID")
    metric: str = Field(..., description="Metric to predict: 'revenue' or 'quantity_sold'")
    horizon_days: int = Field(30, description="How far ahead to look: 30, 60, 90, 365")
    yearly_seasonality: bool = Field(True, description="Capture annual cycles")
    weekly_seasonality: bool = Field(True, description="Capture weekly patterns")
    holidays_country: Optional[str] = Field("NG", description="Country code for holidays, e.g. 'NG' for Nigeria")
    trend_flexibility: float = Field(0.05, description="Model sensitivity to trend changes (0.001 to 0.5)")

class ForecastResponse(BaseModel):
    ds: str
    yhat: float
    yhat_lower: float
    yhat_upper: float

class ForecastResult(BaseModel):
    product_id: int
    product_name: str
    forecast: List[ForecastResponse]
