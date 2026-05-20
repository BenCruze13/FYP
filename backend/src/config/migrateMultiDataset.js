const db = require('./db');

async function migrate() {
    console.log("Starting Optify Multi-Dataset DB Schema Upgrades...");
    const connection = await db.getConnection();
    try {
        await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

        // 1. Create uploads table if not exists
        console.log("Creating uploads table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS uploads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 2. Add upload_id to products if not exists
        const [prodCols] = await connection.query("SHOW COLUMNS FROM products LIKE 'upload_id'");
        if (prodCols.length === 0) {
            console.log("Adding upload_id to products table...");
            await connection.query("ALTER TABLE products ADD COLUMN upload_id INT NULL");
            await connection.query("ALTER TABLE products ADD FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE");
        }

        // 3. Create forecast_runs table if not exists
        console.log("Creating forecast_runs table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS forecast_runs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 4. Add run_id to forecasts if not exists
        const [foreCols] = await connection.query("SHOW COLUMNS FROM forecasts LIKE 'run_id'");
        if (foreCols.length === 0) {
            console.log("Adding run_id to forecasts table...");
            await connection.query("ALTER TABLE forecasts ADD COLUMN run_id INT NULL");
            await connection.query("ALTER TABLE forecasts ADD FOREIGN KEY (run_id) REFERENCES forecast_runs(id) ON DELETE CASCADE");
        }

        // 5. Backfill default uploads and runs for existing data
        const [users] = await connection.query("SELECT id FROM users");
        for (const user of users) {
            const userId = user.id;
            
            // Check if user already has an upload record
            const [existingUploads] = await connection.query("SELECT id FROM uploads WHERE user_id = ? LIMIT 1", [userId]);
            let uploadId;
            if (existingUploads.length === 0) {
                const [newUpload] = await connection.query(
                    "INSERT INTO uploads (user_id, filename) VALUES (?, ?)", 
                    [userId, "sample_backfill_data.csv"]
                );
                uploadId = newUpload.insertId;
            } else {
                uploadId = existingUploads[0].id;
            }

            // Assign existing products for this user to this default upload
            await connection.query("UPDATE products SET upload_id = ? WHERE user_id = ? AND upload_id IS NULL", [uploadId, userId]);

            // Create a default forecast run for existing forecasts
            const [existingRuns] = await connection.query("SELECT id FROM forecast_runs WHERE user_id = ? LIMIT 1", [userId]);
            let runId;
            if (existingRuns.length === 0) {
                const [newRun] = await connection.query("INSERT INTO forecast_runs (user_id) VALUES (?)", [userId]);
                runId = newRun.insertId;
            } else {
                runId = existingRuns[0].id;
            }

            // Assign existing forecasts of the user's products to this run_id
            await connection.query(`
                UPDATE forecasts f
                JOIN products p ON f.product_id = p.id
                SET f.run_id = ?
                WHERE p.user_id = ? AND f.run_id IS NULL
            `, [runId, userId]);
        }

        await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
        console.log("Optify Multi-Dataset Database Schema Upgrades Completed Successfully!");
    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

migrate();
