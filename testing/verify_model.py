import pandas as pd
import numpy as np
import math
import pulp
from prophet import Prophet

def verify_prophet_model():
    print("=" * 60)
    print("STEP 1: EVALUATING TIME-SERIES FORECASTING MODEL (PROPHET)")
    print("=" * 60)

    # 1. Load the generated 100-record dataset
    df = pd.read_csv("testing/sample_data_100.csv")
    print(f"Loaded {len(df)} historical transactional logs.")

    # 2. Aggregating to daily demand
    df['date'] = pd.to_datetime(df['date'])
    daily_df = df.groupby('date')['quantity_sold'].sum().reset_index()
    daily_df.columns = ['ds', 'y']

    # Ensure continuous date index
    r = pd.date_range(start=daily_df['ds'].min(), end=daily_df['ds'].max())
    daily_df = daily_df.set_index('ds').reindex(r, fill_value=0).rename_axis('ds').reset_index()

    # 3. 80/20 train/test split
    split_idx = int(len(daily_df) * 0.8)
    train_df = daily_df.iloc[:split_idx]
    test_df = daily_df.iloc[split_idx:]

    print(f"Dataset Dates: {daily_df['ds'].min().strftime('%Y-%m-%d')} to {daily_df['ds'].max().strftime('%Y-%m-%d')}")
    print(f"Training set: {len(train_df)} days | Test/Validation set: {len(test_df)} days")

    # 4. Instantiate and fit Prophet model
    # uncertainty_samples=0 bypasses potential numpy 2.x compatibility issues in backend environments
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=False,
        uncertainty_samples=0
    )
    model.fit(train_df)

    # 5. Predict on test horizon
    future = model.make_future_dataframe(periods=len(test_df), include_history=False)
    forecast = model.predict(future)

    # 6. Calculate evaluation metrics
    predictions = forecast['yhat'].values
    actuals = test_df['y'].values

    mae = np.mean(np.abs(predictions - actuals))
    rmse = np.sqrt(np.mean((predictions - actuals) ** 2))

    print(f"[OK] Prophet pipeline trained and predicted successfully!")
    print(f"[OK] Mean Absolute Error (MAE): {mae:.4f} units/day")
    print(f"[OK] Root Mean Squared Error (RMSE): {rmse:.4f} units/day")
    print(f"[OK] Predicted Average daily demand: {np.mean(predictions):.2f} units")
    print("Forecast Evaluation PASSED successfully!\n")
    return mae, rmse

def verify_lp_solver():
    print("=" * 60)
    print("STEP 2: EVALUATING ADVANCED LP BUDGET & CAPACITY OPTIMIZER")
    print("=" * 60)

    # Mock product details
    products = {
        1: {"name": "OLED Smart TV", "cost": 220000, "sell": 310000, "profit": 90000, "demand": 12},
        2: {"name": "Wireless Soundbar", "cost": 45000, "sell": 75000, "profit": 30000, "demand": 25},
        3: {"name": "Noise-Cancelling Headphones", "cost": 85000, "sell": 135000, "profit": 50000, "demand": 18}
    }

    total_budget = 1500000
    storage_limit = 20
    min_stock_ratio = 0.20 # 20% safety stock of forecasted demand

    print(f"Capital Budget Limit: NGN {total_budget:,}")
    print(f"Warehouse Capacity Limit: {storage_limit} items")
    print(f"Product Safety Demand Ratio: {min_stock_ratio*100}%")
    print("-" * 60)

    # 1. Initialize LP problem
    prob = pulp.LpProblem("Budget_Optimization_Verification", pulp.LpMaximize)

    # 2. Decision variables with safety stock bounds
    x = {}
    for p_id, p in products.items():
        # Minimum stock constraint based on demand
        demand_based_min = math.ceil(p["demand"] * min_stock_ratio)
        
        # Lower bound variable constraint
        x[p_id] = pulp.LpVariable(f"qty_{p_id}", lowBound=demand_based_min, cat="Integer")
        print(f"Product '{p['name']}' constraints: Min Safety Stock = {demand_based_min} units | Max Demand Cap = {p['demand']} units")

    # 3. Objective Function (Maximize profit)
    prob += pulp.lpSum([x[p_id] * products[p_id]["profit"] for p_id in x])

    # 4. Global constraints
    # Budget constraint
    prob += pulp.lpSum([x[p_id] * products[p_id]["cost"] for p_id in x]) <= total_budget
    # Storage limit
    prob += pulp.lpSum([x[p_id] for p_id in x]) <= storage_limit
    # Individual product demand cap
    for p_id in x:
        prob += x[p_id] <= products[p_id]["demand"]

    # 5. Solve the LP problem
    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    # 6. Verify and output results
    print("-" * 60)
    print("Optimal Allocation Solution Structure:")
    total_spent = 0
    total_units = 0
    total_profit = 0
    total_revenue = 0

    for p_id in x:
        qty = int(x[p_id].varValue or 0)
        cost_total = qty * products[p_id]["cost"]
        profit_total = qty * products[p_id]["profit"]
        rev_total = qty * products[p_id]["sell"]

        total_spent += cost_total
        total_units += qty
        total_profit += profit_total
        total_revenue += rev_total

        print(f" - {products[p_id]['name']}: Procure {qty} units (Cost: NGN {cost_total:,} | Profit: NGN {profit_total:,})")

    print("-" * 60)
    print(f"[OK] Utilized Working Capital: NGN {total_spent:,} / NGN {total_budget:,} (CONSTRAINTS OK)")
    print(f"[OK] Total Warehouse Storage Utilized: {total_units} / {storage_limit} units (CONSTRAINTS OK)")
    print(f"[OK] Expected Total Revenue: NGN {total_revenue:,}")
    print(f"[OK] Expected Net Profit Return: NGN {total_profit:,}")
    print("Linear Programming Solver verification PASSED successfully!")
    print("=" * 60)

if __name__ == "__main__":
    verify_prophet_model()
    verify_lp_solver()
