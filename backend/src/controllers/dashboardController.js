const db = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        let uploadId = req.query.upload_id;

        // If no upload_id specified, grab their most recent upload
        if (!uploadId) {
            const [latestUploads] = await db.query(
                'SELECT id FROM uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            if (latestUploads.length > 0) {
                uploadId = latestUploads[0].id;
            }
        }

        // If user still has no uploads at all, return empty metrics cleanly
        if (!uploadId) {
            return res.status(200).json({
                totalRevenue: 0,
                productCount: 0,
                transactionCount: 0,
                recentTransactions: [],
                categoryBreakdown: []
            });
        }

        const [revenueResult] = await db.query(`
            SELECT SUM(t.revenue) as total_rev 
            FROM transactions t 
            JOIN products p ON t.product_id = p.id 
            WHERE p.user_id = ? AND p.upload_id = ?
        `, [userId, uploadId]);

        const [productsResult] = await db.query(
            'SELECT COUNT(*) as prod_cnt FROM products WHERE user_id = ? AND upload_id = ?', 
            [userId, uploadId]
        );

        const [transactionsResult] = await db.query(`
            SELECT COUNT(*) as txn_cnt 
            FROM transactions t 
            JOIN products p ON t.product_id = p.id 
            WHERE p.user_id = ? AND p.upload_id = ?
        `, [userId, uploadId]);
        
        const [recentTxns] = await db.query(`
            SELECT t.id, t.sale_date as date, p.name as product_name, p.category, t.quantity_sold, t.revenue 
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE p.user_id = ? AND p.upload_id = ?
            ORDER BY t.sale_date DESC
            LIMIT 5
        `, [userId, uploadId]);

        const [categoryBreakdown] = await db.query(`
            SELECT p.category, SUM(t.revenue) as revenue
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE p.user_id = ? AND p.upload_id = ?
            GROUP BY p.category
        `, [userId, uploadId]);

        res.status(200).json({
            totalRevenue: parseFloat(revenueResult[0]?.total_rev || 0),
            productCount: productsResult[0]?.prod_cnt || 0,
            transactionCount: transactionsResult[0]?.txn_cnt || 0,
            recentTransactions: recentTxns,
            categoryBreakdown: categoryBreakdown.map(item => ({
                category: item.category,
                revenue: parseFloat(item.revenue)
            })),
            activeUploadId: parseInt(uploadId)
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        let uploadId = req.query.upload_id;

        if (!uploadId) {
            const [latestUploads] = await db.query(
                'SELECT id FROM uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            if (latestUploads.length > 0) {
                uploadId = latestUploads[0].id;
            }
        }

        if (!uploadId) {
            return res.status(200).json([]);
        }

        const [products] = await db.query(
            'SELECT id, name, cost_price, selling_price, category FROM products WHERE user_id = ? AND upload_id = ?', 
            [userId, uploadId]
        );
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products list:', error);
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
};
