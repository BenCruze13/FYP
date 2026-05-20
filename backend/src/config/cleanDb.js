const db = require('./db');

async function cleanDatabase() {
    console.log("Cleaning database tables for testing...");
    let connection;
    try {
        connection = await db.getConnection();
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('TRUNCATE TABLE transactions');
        await connection.execute('TRUNCATE TABLE products');
        await connection.execute('TRUNCATE TABLE forecasts');
        await connection.execute('TRUNCATE TABLE optimizations');
        await connection.execute('TRUNCATE TABLE optimization_allocations');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log("✅ Database cleared successfully!");
    } catch (err) {
        console.error("❌ Error clearing database:", err);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

cleanDatabase();
