const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function setupDatabase() {
    try {
        console.log('Connecting to MySQL server...');
        const pass = process.env.DB_PASSWORD || '';
        console.log('Using password length:', pass.length);
        // Connect without database first to create it
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: pass,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected. Reading schema.sql...');
        const schemaPath = path.join(__dirname, '../../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await connection.query(schema);
        
        console.log('Database setup complete!');
        await connection.end();
    } catch (error) {
        console.error('Failed to setup database:', error);
        process.exit(1);
    }
}

setupDatabase();
