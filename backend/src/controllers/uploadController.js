const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/db');

exports.uploadFinancialData = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const results = [];

    // Parse CSV - disable string quoting to support literal double-quotes in product names (e.g. 55")
    fs.createReadStream(filePath)
        .pipe(csv({ quote: '' }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let connection;
            try {
                connection = await db.getConnection();
                await connection.beginTransaction();

                const userId = req.user.id;
                const filename = req.file.originalname || 'imported_dataset.csv';

                // 1. Insert into uploads table
                const [uploadResult] = await connection.execute(
                    'INSERT INTO uploads (user_id, filename) VALUES (?, ?)',
                    [userId, filename]
                );
                const uploadId = uploadResult.insertId;

                let importedRecords = 0;

                for (const row of results) {
                    // Expected CSV columns: date, product_name, category, cost_price, selling_price, quantity_sold, revenue
                    const { 
                        date, 
                        product_name, 
                        category, 
                        cost_price, 
                        selling_price, 
                        quantity_sold, 
                        revenue 
                    } = row;

                    if (!date || !product_name || !quantity_sold || !revenue) {
                        continue; // Skip invalid rows
                    }

                    // 2. Check if product exists in THIS upload
                    let productId;
                    const [existingProduct] = await connection.execute(
                        'SELECT id FROM products WHERE name = ? AND user_id = ? AND upload_id = ? LIMIT 1',
                        [product_name, userId, uploadId]
                    );

                    if (existingProduct.length > 0) {
                        productId = existingProduct[0].id;
                    } else {
                        // Insert new product under this user & upload
                        const [newProduct] = await connection.execute(
                            'INSERT INTO products (name, category, cost_price, selling_price, user_id, upload_id) VALUES (?, ?, ?, ?, ?, ?)',
                            [product_name, category || 'Uncategorized', cost_price || 0, selling_price || 0, userId, uploadId]
                        );
                        productId = newProduct.insertId;
                    }

                    // 3. Insert transaction
                    await connection.execute(
                        'INSERT INTO transactions (product_id, sale_date, quantity_sold, revenue) VALUES (?, ?, ?, ?)',
                        [productId, date, parseInt(quantity_sold), parseFloat(revenue)]
                    );
                    
                    importedRecords++;
                }

                await connection.commit();
                
                // Remove the uploaded file after processing
                fs.unlinkSync(filePath);

                res.status(200).json({ 
                    message: 'Historical retail records imported successfully!', 
                    recordsImported: importedRecords,
                    uploadId
                });

            } catch (error) {
                if (connection) await connection.rollback();
                console.error('Database Error during upload processing:', error);
                
                // Clean up file on error
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                res.status(500).json({ message: 'Error processing data', error: error.message });
            } finally {
                if (connection) connection.release();
            }
        })
        .on('error', (error) => {
            console.error('CSV Parsing Error:', error);
            res.status(500).json({ message: 'Error parsing CSV file', error: error.message });
        });
};

exports.getUploads = async (req, res) => {
    try {
        const userId = req.user.id;
        const [uploads] = await db.query(
            'SELECT id, filename, created_at FROM uploads WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.status(200).json(uploads);
    } catch (error) {
        console.error('Error fetching uploads list:', error);
        res.status(500).json({ message: 'Error retrieving uploads list', error: error.message });
    }
};

exports.deleteUpload = async (req, res) => {
    const userId = req.user.id;
    const uploadId = req.params.id;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Delete the upload. The database will CASCADE delete all products, transactions, forecasts under it!
        const [result] = await connection.execute(
            'DELETE FROM uploads WHERE id = ? AND user_id = ?',
            [uploadId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Upload not found or access denied.' });
        }

        await connection.commit();
        res.status(200).json({ message: 'Dataset upload and all related products/transactions permanently deleted.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error deleting upload:', error);
        res.status(500).json({ message: 'Failed to delete upload', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.resetUserData = async (req, res) => {
    const userId = req.user.id;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Delete all uploads (this will CASCADE delete all products, transactions, forecasts, and allocations!)
        await connection.execute('DELETE FROM uploads WHERE user_id = ?', [userId]);

        // 2. Delete all optimization logs belonging to this user
        await connection.execute('DELETE FROM optimizations WHERE user_id = ?', [userId]);

        await connection.commit();
        res.status(200).json({ status: 'ok', message: 'All transaction history and optimization history cleared successfully.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error resetting user data:', error);
        res.status(500).json({ message: 'Failed to reset all transaction history.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};
