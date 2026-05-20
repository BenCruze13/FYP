const db = require('./db');

async function migrate() {
    console.log("Starting Optify Multi-Tenant DB Migration...");
    const connection = await db.getConnection();
    try {
        // 1. Add user_id column to products if not exists
        const [prodCols] = await connection.query("SHOW COLUMNS FROM products LIKE 'user_id'");
        if (prodCols.length === 0) {
            console.log("Adding user_id to products table...");
            await connection.query("ALTER TABLE products ADD COLUMN user_id INT NULL");
            await connection.query("ALTER TABLE products ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
            console.log("Successfully added user_id to products.");
        } else {
            console.log("user_id column already exists in products table.");
        }

        // 2. Add user_id column to optimizations if not exists
        const [optCols] = await connection.query("SHOW COLUMNS FROM optimizations LIKE 'user_id'");
        if (optCols.length === 0) {
            console.log("Adding user_id to optimizations table...");
            await connection.query("ALTER TABLE optimizations ADD COLUMN user_id INT NULL");
            await connection.query("ALTER TABLE optimizations ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
            console.log("Successfully added user_id to optimizations.");
        } else {
            console.log("user_id column already exists in optimizations table.");
        }

        // 3. Backfill any existing products and optimizations to first user if exists
        const [users] = await connection.query("SELECT id FROM users LIMIT 1");
        if (users.length > 0) {
            const firstUserId = users[0].id;
            console.log(`Backfilling existing products and optimizations with user_id = ${firstUserId}...`);
            await connection.query("UPDATE products SET user_id = ? WHERE user_id IS NULL", [firstUserId]);
            await connection.query("UPDATE optimizations SET user_id = ? WHERE user_id IS NULL", [firstUserId]);
        }

        console.log("Optify DB Multi-Tenant Migration Completed Successfully!");
    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

migrate();
