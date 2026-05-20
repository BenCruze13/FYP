from fastapi import APIRouter, HTTPException
from app.schemas.optimize_schema import OptimizationRequest, OptimizationResponse
from app.optimization.solver import solve_budget_allocation

router = APIRouter()

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_budget(request: OptimizationRequest):
    try:
        result = solve_budget_allocation(
            user_id=request.user_id,
            upload_id=request.upload_id,
            total_budget=request.total_budget,
            storage_limit=request.storage_limit,
            min_stock_ratio=request.min_stock_ratio,
            product_constraints=request.product_constraints
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
