from pydantic import BaseModel, Field
from typing import List, Optional

class ProductConstraint(BaseModel):
    product_id: int
    min_quantity: Optional[int] = 0
    max_quantity: Optional[int] = None

class OptimizationRequest(BaseModel):
    user_id: int = Field(..., description="Currently authenticated user ID")
    upload_id: int = Field(..., description="Selected active upload dataset ID")
    total_budget: float = Field(..., description="Maximum budget available for procurement")
    storage_limit: Optional[int] = Field(None, description="Maximum total items storage capacity")
    min_stock_ratio: Optional[float] = Field(0.0, description="Minimum coverage ratio of forecasted demand, e.g. 0.20 for 20%")
    product_constraints: Optional[List[ProductConstraint]] = Field(default_factory=list)

class ProductAllocation(BaseModel):
    product_id: int
    product_name: str = None # Optional
    allocated_quantity: int
    allocated_budget: float
    expected_profit: float

class OptimizationResponse(BaseModel):
    total_budget_allocated: float
    expected_total_profit: float
    expected_total_revenue: float
    allocations: List[ProductAllocation]
