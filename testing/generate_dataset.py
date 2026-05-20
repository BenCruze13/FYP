import csv
import random
from datetime import datetime, timedelta

products = [
    {"name": '55" OLED Smart TV', "category": "Electronics", "cost": 220000, "sell": 310000},
    {"name": "Wireless Soundbar", "category": "Electronics", "cost": 45000, "sell": 75000},
    {"name": "Noise-Cancelling Headphones", "category": "Accessories", "cost": 85000, "sell": 135000},
    {"name": "Bluetooth Home Speaker", "category": "Accessories", "cost": 30000, "sell": 55000}
]

start_date = datetime(2026, 1, 1)
data = []

# Generate exactly 100 random transactions over time
for i in range(100):
    prod = random.choice(products)
    tx_date = start_date + timedelta(days=random.randint(0, 95))
    qty = random.randint(1, 4)
    rev = qty * prod["sell"]
    
    data.append({
        "date": tx_date.strftime("%Y-%m-%d"),
        "product_name": prod["name"],
        "category": prod["category"],
        "cost_price": prod["cost"],
        "selling_price": prod["sell"],
        "quantity_sold": qty,
        "revenue": rev
    })

# Sort by date
data.sort(key=lambda x: x["date"])

# Write to CSV
filepath = "c:/Users/hp/Desktop/mini/CHAPTER 3/optify/testing/sample_data_100.csv"
import os
os.makedirs(os.path.dirname(filepath), exist_ok=True)

with open(filepath, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["date", "product_name", "category", "cost_price", "selling_price", "quantity_sold", "revenue"])
    writer.writeheader()
    writer.writerows(data)

print(f"Generated 100 high-quality records successfully at: {filepath}")
