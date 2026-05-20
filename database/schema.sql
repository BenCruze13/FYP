-- Create Database
CREATE DATABASE IF NOT EXISTS optify_db;
USE optify_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'analyst') DEFAULT 'analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table (Generic Retail)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions Table (Historical Sales)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    sale_date DATE NOT NULL,
    quantity_sold INT NOT NULL,
    revenue DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 4. Forecasts Table (Prophet Output)
CREATE TABLE IF NOT EXISTS forecasts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_demand INT NOT NULL,
    lower_confidence INT,
    upper_confidence INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 5. Optimizations Table (LP Output)
CREATE TABLE IF NOT EXISTS optimizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_budget DECIMAL(15, 2) NOT NULL,
    expected_profit DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS optimization_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    optimization_id INT NOT NULL,
    product_id INT NOT NULL,
    allocated_quantity INT NOT NULL,
    allocated_budget DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (optimization_id) REFERENCES optimizations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
