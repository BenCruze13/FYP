const db = require('./db');

async function migrate() {
    console.log("Adding expected_revenue and storage_limit to optimizations table...");
    const connection = await db.getConnection();
    try {
        const [revCols] = await connection.query("SHOW COLUMNS FROM optimizations LIKE 'expected_revenue'");
        if (revCols.length === 0) {
            console.log("Adding expected_revenue...");
            await connection.query("ALTER TABLE optimizations ADD COLUMN expected_revenue DECIMAL(15, 2) NULL");
        }

        const [limCols] = await connection.query("SHOW COLUMNS FROM optimizations LIKE 'storage_limit'");
        if (limCols.length === 0) {
            console.log("Adding storage_limit...");
            await connection.query("ALTER TABLE optimizations ADD COLUMN storage_limit INT NULL");
        }

        console.log("Optimizations table migration completed!");
    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

migrate();
