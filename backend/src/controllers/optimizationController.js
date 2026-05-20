const axios = require('axios');
const db = require('../config/db');

exports.optimizeBudget = async (req, res) => {
    try {
        const { 
            total_budget, 
            storage_limit = null, 
            min_stock_ratio = 0.0, 
            product_constraints = [],
            upload_id 
        } = req.body;

        if (!total_budget || isNaN(total_budget) || total_budget <= 0) {
            return res.status(400).json({ message: 'Please provide a valid working capital budget greater than 0' });
        }

        const userId = req.user.id;
        let selectedUploadId = upload_id;

        // Fallback to latest upload if empty
        if (!selectedUploadId) {
            const [latestUploads] = await db.query(
                'SELECT id FROM uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            if (latestUploads.length > 0) {
                selectedUploadId = latestUploads[0].id;
            }
        }

        if (!selectedUploadId) {
            return res.status(400).json({ message: 'Please import or select a dataset first.' });
        }

        // Call Python ML/Optimization Service
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        
        const response = await axios.post(`${mlServiceUrl}/api/ml/optimize/optimize`, {
            user_id: userId,
            upload_id: parseInt(selectedUploadId),
            total_budget: parseFloat(total_budget),
            storage_limit: storage_limit ? parseInt(storage_limit) : null,
            min_stock_ratio: parseFloat(min_stock_ratio),
            product_constraints: product_constraints || []
        });

        const { total_budget_allocated, expected_total_profit, expected_total_revenue, allocations } = response.data;

        // Save optimization run to DB
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Insert into optimizations table
            const [optResult] = await connection.execute(
                'INSERT INTO optimizations (total_budget, expected_profit, expected_revenue, storage_limit, user_id) VALUES (?, ?, ?, ?, ?)',
                [
                    parseFloat(total_budget), 
                    parseFloat(expected_total_profit), 
                    parseFloat(expected_total_revenue), 
                    storage_limit ? parseInt(storage_limit) : null,
                    userId
                ]
            );
            
            const optimizationId = optResult.insertId;

            // 2. Insert allocations into optimization_allocations table
            for (const item of allocations) {
                await connection.execute(
                    `INSERT INTO optimization_allocations 
                     (optimization_id, product_id, allocated_quantity, allocated_budget) 
                     VALUES (?, ?, ?, ?)`,
                    [
                        optimizationId,
                        item.product_id,
                        item.allocated_quantity,
                        parseFloat(item.allocated_budget)
                    ]
                );
            }

            await connection.commit();

            // Return optimized results with database action plan ID
            res.status(200).json({
                message: 'Budget optimization executed successfully',
                data: {
                    optimization_id: optimizationId,
                    total_budget_allocated,
                    expected_total_profit,
                    expected_total_revenue,
                    allocations
                }
            });

        } catch (dbError) {
            await connection.rollback();
            console.error('Database transaction error during optimization save:', dbError);
            
            // Still return the results even if saving to history failed
            res.status(200).json({
                message: 'Budget optimization executed successfully (failed to record history)',
                data: {
                    total_budget_allocated,
                    expected_total_profit,
                    expected_total_revenue,
                    allocations
                }
            });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Optimization Orchestration Error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Error executing budget optimization',
            error: error.response?.data?.detail || error.message
        });
    }
};

exports.getOptimizationRuns = async (req, res) => {
    try {
        const userId = req.user.id;
        const [runs] = await db.query(
            'SELECT id, total_budget, expected_profit, expected_revenue, storage_limit, created_at FROM optimizations WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.status(200).json(runs);
    } catch (error) {
        console.error('Error fetching optimization history:', error);
        res.status(500).json({ message: 'Error retrieving optimization history', error: error.message });
    }
};

exports.getOptimizationRunDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const runId = req.params.runId;

        // Fetch core details
        const [optDetails] = await db.query(
            'SELECT id, total_budget, expected_profit, expected_revenue, storage_limit, created_at FROM optimizations WHERE id = ? AND user_id = ? LIMIT 1',
            [runId, userId]
        );

        if (optDetails.length === 0) {
            return res.status(404).json({ message: 'Historical optimization plan not found.' });
        }

        // Fetch product allocations
        const [allocations] = await db.query(`
            SELECT oa.product_id, p.name as product_name, oa.allocated_quantity, oa.allocated_budget,
                   (p.selling_price - p.cost_price) * oa.allocated_quantity as expected_profit
            FROM optimization_allocations oa
            JOIN products p ON oa.product_id = p.id
            WHERE oa.optimization_id = ? AND p.user_id = ?
        `, [runId, userId]);

        // Sum up the actual allocated budget from allocations
        let totalBudgetAllocated = 0;
        for (const a of allocations) {
            totalBudgetAllocated += parseFloat(a.allocated_budget);
        }

        res.status(200).json({
            message: 'Historical optimization plan retrieved successfully',
            data: {
                optimization_id: optDetails[0].id,
                total_budget: parseFloat(optDetails[0].total_budget),
                total_budget_allocated: totalBudgetAllocated,
                expected_total_profit: parseFloat(optDetails[0].expected_profit),
                expected_total_revenue: parseFloat(optDetails[0].expected_revenue || 0),
                storage_limit: optDetails[0].storage_limit,
                created_at: optDetails[0].created_at,
                allocations
            }
        });
    } catch (error) {
        console.error('Error fetching historical plan details:', error);
        res.status(500).json({ message: 'Failed to retrieve plan details', error: error.message });
    }
};

exports.getLatestOptimization = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find the latest optimization run for this user
        const [latestOpt] = await db.query(
            'SELECT id FROM optimizations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (latestOpt.length === 0) {
            return res.status(200).json({ message: 'No existing optimization logs found.', data: null });
        }

        const runId = latestOpt[0].id;

        // Reuse the logic from getOptimizationRunDetails to retrieve full details
        req.params.runId = runId;
        return exports.getOptimizationRunDetails(req, res);
    } catch (error) {
        console.error('Error fetching latest optimization plan:', error);
        res.status(500).json({ message: 'Failed to check latest optimization plan.', error: error.message });
    }
};
