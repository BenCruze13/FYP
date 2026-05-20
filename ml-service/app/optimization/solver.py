import pulp
from sqlalchemy import create_engine, text
import os
import math
from dotenv import load_dotenv

load_dotenv()

def get_engine():
    host = os.getenv("DB_HOST", "localhost")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    db = os.getenv("DB_NAME", "optify_db")
    port = os.getenv("DB_PORT", 3306)
    conn_str = f"mysql+mysqlconnector://{user}:{password}@{host}:{port}/{db}"
    return create_engine(conn_str)

def solve_budget_allocation(
    user_id: int,
    upload_id: int,
    total_budget: float,
    storage_limit: int = None,
    min_stock_ratio: float = 0.0,
    product_constraints: list = None
):
    engine = get_engine()

    # Parse custom min/max constraints
    constraints_map = {}
    if product_constraints:
        for c in product_constraints:
            p_id = getattr(c, "product_id", None) or c.get("product_id")
            if p_id is not None:
                min_q = getattr(c, "min_quantity", 0)
                if min_q is None: min_q = 0
                
                max_q = getattr(c, "max_quantity", None)
                if max_q is None:
                    if isinstance(c, dict):
                        max_q = c.get("max_quantity")
                
                constraints_map[p_id] = {
                    "min_quantity": int(min_q),
                    "max_quantity": int(max_q) if max_q is not None else None
                }

    # 1. Fetch products belonging to user & upload
    with engine.connect() as conn:
        products = conn.execute(
            text("SELECT id, name, cost_price, selling_price FROM products WHERE user_id = :u AND upload_id = :up"),
            {"u": user_id, "up": upload_id}
        ).fetchall()

    # 2. Fetch aggregate demand from the LATEST forecast run for this user
    with engine.connect() as conn:
        run_row = conn.execute(
            text("SELECT id FROM forecast_runs WHERE user_id = :u ORDER BY created_at DESC LIMIT 1"),
            {"u": user_id}
        ).fetchone()
        
        run_id = run_row[0] if run_row else None

        if run_id:
            forecast_data = conn.execute(
                text("""
                    SELECT product_id, SUM(predicted_demand) as total_demand 
                    FROM forecasts 
                    WHERE run_id = :r
                    GROUP BY product_id
                """),
                {"r": run_id}
            ).fetchall()
        else:
            forecast_data = []

    demand_map = {row[0]: float(row[1]) for row in forecast_data}

    # 3. Formulate the PuLP Linear Programming model
    prob = pulp.LpProblem("Budget_Optimization", pulp.LpMaximize)

    # Decision variables: quantity of each product to buy
    x = {}
    product_details = {}

    for prod in products:
        p_id, name, cost, sell = prod[0], prod[1], float(prod[2]), float(prod[3])
        profit = sell - cost

        # Skip products with non-positive profit margin to prevent LP model from bleeding capital
        if profit <= 0:
            continue

        # Get forecasted demand
        forecasted_demand = demand_map.get(p_id, 0.0)

        # Get custom bounds
        custom_min = constraints_map.get(p_id, {}).get("min_quantity", 0)
        custom_max = constraints_map.get(p_id, {}).get("max_quantity")

        # Demand-based minimum stock constraint
        demand_based_min = 0
        if min_stock_ratio and min_stock_ratio > 0:
            demand_based_min = math.ceil(forecasted_demand * min_stock_ratio)

        # Final lower bound is the maximum of custom min and demand-based safety stock
        min_bound = max(custom_min, demand_based_min)

        # Final ceiling limit
        if custom_max is not None:
            demand_limit = float(custom_max)
        else:
            demand_limit = forecasted_demand

        # Ensure bounds are feasible
        if demand_limit < min_bound:
            demand_limit = float(min_bound)

        # Decision variable (Integer >= min_bound)
        x[p_id] = pulp.LpVariable(f"qty_{p_id}", lowBound=min_bound, cat="Integer")
        
        product_details[p_id] = {
            "name": name,
            "cost": cost,
            "sell": sell,
            "profit": profit,
            "demand": demand_limit
        }

    if not x:
        return {
            "total_budget_allocated": 0.0,
            "expected_total_profit": 0.0,
            "expected_total_revenue": 0.0,
            "allocations": []
        }

    # Objective Function: Maximize expected total profit margin
    prob += pulp.lpSum([x[p_id] * product_details[p_id]["profit"] for p_id in x])

    # Constraint 1: Working Capital Budget Limit
    prob += pulp.lpSum([x[p_id] * product_details[p_id]["cost"] for p_id in x]) <= total_budget

    # Constraint 2: Physical Storage Capacity Limit (Total Units Cap)
    if storage_limit is not None and storage_limit > 0:
        prob += pulp.lpSum([x[p_id] for p_id in x]) <= storage_limit

    # Constraint 3: Demand/Max Ceiling Caps per Product
    for p_id in x:
        prob += x[p_id] <= product_details[p_id]["demand"]

    # Solve optimization problem silently
    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    # 4. Construct response allocations
    allocations = []
    total_budget_allocated = 0.0
    expected_total_profit = 0.0
    expected_total_revenue = 0.0

    for p_id in x:
        qty = int(x[p_id].varValue or 0)
        if qty > 0:
            cost_total = qty * product_details[p_id]["cost"]
            profit_total = qty * product_details[p_id]["profit"]
            revenue_total = qty * product_details[p_id]["sell"]

            total_budget_allocated += cost_total
            expected_total_profit += profit_total
            expected_total_revenue += revenue_total

            allocations.append({
                "product_id": p_id,
                "product_name": product_details[p_id]["name"],
                "allocated_quantity": qty,
                "allocated_budget": cost_total,
                "expected_profit": profit_total
            })

    return {
        "total_budget_allocated": total_budget_allocated,
        "expected_total_profit": expected_total_profit,
        "expected_total_revenue": expected_total_revenue,
        "allocations": allocations
    }
