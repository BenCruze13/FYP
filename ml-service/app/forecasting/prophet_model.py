import pandas as pd
import numpy as np
from prophet import Prophet
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# -----------------------------------------------------------------------
# Numpy 2.x compatibility patch for Prophet
# Prophet's internal fourier_series has a shape mismatch with numpy >= 2.0
# -----------------------------------------------------------------------
def _patched_fourier_series(dates, period, series_order):
    t = np.array(
        (dates - dates.iloc[0]).dt.total_seconds().astype(float)
    ) / (3600 * 24.0)
    return np.column_stack([
        fun((2.0 * (i + 1) * np.pi * t / period))
        for i in range(series_order)
        for fun in (np.sin, np.cos)
    ])

try:
    from prophet import utilities
    utilities.fourier_series = _patched_fourier_series
except Exception:
    pass
# -----------------------------------------------------------------------

def get_engine():
    host = os.getenv("DB_HOST", "localhost")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    db = os.getenv("DB_NAME", "optify_db")
    port = os.getenv("DB_PORT", 3306)
    # Build connection URL. Empty password is handled by leaving it out.
    conn_str = f"mysql+mysqlconnector://{user}:{password}@{host}:{port}/{db}"
    return create_engine(conn_str)

def generate_forecast(config: dict):
    """
    config keys:
      user_id, upload_id, metric, horizon_days, yearly_seasonality,
      weekly_seasonality, holidays_country, trend_flexibility
    """
    engine = get_engine()
    userId = config.get("user_id")
    uploadId = config.get("upload_id")

    # 1. Fetch products belonging to user & upload
    with engine.connect() as conn:
        products = conn.execute(
            text("SELECT id, name FROM products WHERE user_id = :u AND upload_id = :up"),
            {"u": userId, "up": uploadId}
        ).fetchall()

    metric = config.get("metric", "revenue")

    # 2. Fetch historical data via SQLAlchemy for user & upload
    query = text(f"""
        SELECT t.product_id, t.sale_date as ds, t.{metric} as y 
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = :u AND p.upload_id = :up
    """)
    df = pd.read_sql(query, engine, params={"u": userId, "up": uploadId})

    if df.empty:
        raise ValueError("No historical data available for this dataset forecast.")

    results = []

    # 3. Train a Prophet model per product
    for product in products:
        product_data = df[df['product_id'] == product[0]].copy()

        # Prophet needs at least 2 data points
        if len(product_data) < 2:
            continue

        product_data['ds'] = pd.to_datetime(product_data['ds'])
        product_data['y'] = product_data['y'].astype(float)
        product_data = product_data.sort_values('ds').reset_index(drop=True)

        # Build model with user config
        # uncertainty_samples=0 disables bootstrap sampling which has a
        # shape mismatch bug in Prophet + numpy 2.x
        model = Prophet(
            yearly_seasonality=config.get("yearly_seasonality", True),
            weekly_seasonality=config.get("weekly_seasonality", True),
            daily_seasonality=False,
            changepoint_prior_scale=float(config.get("trend_flexibility", 0.05)),
            uncertainty_samples=0  # Bypasses the numpy 2.x broadcast bug
        )

        # Add country holidays
        country = config.get("holidays_country")
        if country:
            try:
                model.add_country_holidays(country_name=country)
            except Exception:
                pass  # Country not found - continue without holidays

        # Train
        model.fit(product_data[['ds', 'y']])

        # Generate future dates
        future = model.make_future_dataframe(periods=config.get("horizon_days", 30))
        forecast = model.predict(future)

        # Only return future predictions (not the historical fitted values)
        last_date = product_data['ds'].max()
        future_forecast = forecast[forecast['ds'] > last_date][['ds', 'yhat']].copy()

        # Clip negatives to 0
        future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)

        # Approximate ±15% confidence bands (Prophet bootstrap disabled for numpy 2.x compat)
        future_forecast['yhat_lower'] = (future_forecast['yhat'] * 0.85).clip(lower=0)
        future_forecast['yhat_upper'] = future_forecast['yhat'] * 1.15

        future_forecast['ds'] = future_forecast['ds'].dt.strftime('%Y-%m-%d')

        results.append({
            "product_id": product[0],
            "product_name": product[1],
            "forecast": future_forecast.to_dict('records')
        })

    return results
