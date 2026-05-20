const axios = require('axios');
const db = require('../config/db');

exports.generateForecast = async (req, res) => {
    try {
        const { 
            metric = 'revenue', 
            horizon_days = 30, 
            yearly_seasonality = true, 
            weekly_seasonality = true, 
            holidays_country = 'NG', 
            trend_flexibility = 0.05,
            upload_id
        } = req.body;

        const userId = req.user.id;
        let selectedUploadId = upload_id;

        // Fallback to latest upload if not provided
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
            return res.status(400).json({ message: 'Please upload or select a dataset first.' });
        }

        // Call the Python ML Service, passing multi-tenant scope parameters
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        
        const response = await axios.post(`${mlServiceUrl}/api/ml/forecast/predict`, {
            user_id: userId,
            upload_id: parseInt(selectedUploadId),
            metric,
            horizon_days: parseInt(horizon_days),
            yearly_seasonality: Boolean(yearly_seasonality),
            weekly_seasonality: Boolean(weekly_seasonality),
            holidays_country,
            trend_flexibility: parseFloat(trend_flexibility)
        });

        const forecasts = response.data;
        if (forecasts.length === 0) {
            return res.status(400).json({ message: 'Dataset was too small to train time-series models (minimum 2 historical dates required).' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Create a forecast run record
            const [runResult] = await connection.execute(
                'INSERT INTO forecast_runs (user_id) VALUES (?)',
                [userId]
            );
            const runId = runResult.insertId;

            // 2. Insert forecasted coordinates
            for (const product of forecasts) {
                const productId = product.product_id;
                for (const f of product.forecast) {
                    await connection.execute(
                        `INSERT INTO forecasts (product_id, forecast_date, predicted_demand, lower_confidence, upper_confidence, run_id) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            productId, 
                            f.ds, 
                            Math.round(f.yhat), 
                            Math.round(f.yhat_lower), 
                            Math.round(f.yhat_upper),
                            runId
                        ]
                    );
                }
            }

            await connection.commit();
            
            res.status(200).json({
                message: 'Forecast generated successfully',
                data: response.data,
                runId
            });

        } catch (dbError) {
            await connection.rollback();
            console.error("Failed to save forecast run details in MySQL:", dbError);
            res.status(500).json({ message: 'Failed to write forecast logs to local database.', error: dbError.message });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Forecast Orchestration Error:', error.response?.data || error.message);
        res.status(500).json({ 
            message: 'Error generating forecast', 
            error: error.response?.data?.detail || error.message 
        });
    }
};

exports.getForecastRuns = async (req, res) => {
    try {
        const userId = req.user.id;
        const [runs] = await db.query(
            'SELECT id, created_at FROM forecast_runs WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.status(200).json(runs);
    } catch (error) {
        console.error('Error retrieving forecast history:', error);
        res.status(500).json({ message: 'Error retrieving forecast history', error: error.message });
    }
};

exports.getForecastRunDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const runId = req.params.runId;

        const [forecastRows] = await db.query(`
            SELECT f.product_id, p.name as product_name, f.forecast_date, f.predicted_demand, f.lower_confidence, f.upper_confidence 
            FROM forecasts f
            JOIN products p ON f.product_id = p.id
            WHERE f.run_id = ? AND p.user_id = ?
            ORDER BY f.product_id, f.forecast_date ASC
        `, [runId, userId]);

        if (forecastRows.length === 0) {
            return res.status(404).json({ message: 'Historical forecast run not found.' });
        }

        // Group rows by product_id
        const grouped = {};
        for (const row of forecastRows) {
            const pId = row.product_id;
            if (!grouped[pId]) {
                grouped[pId] = {
                    product_id: pId,
                    product_name: row.product_name,
                    forecast: []
                };
            }
            
            const formattedDate = row.forecast_date instanceof Date 
                ? row.forecast_date.toISOString().split('T')[0]
                : row.forecast_date;

            grouped[pId].forecast.push({
                ds: formattedDate,
                yhat: parseFloat(row.predicted_demand),
                yhat_lower: parseFloat(row.lower_confidence),
                yhat_upper: parseFloat(row.upper_confidence)
            });
        }

        res.status(200).json({
            message: 'Historical forecast retrieved successfully',
            data: Object.values(grouped),
            runId: parseInt(runId)
        });
    } catch (error) {
        console.error('Error fetching historical forecast details:', error);
        res.status(500).json({ message: 'Failed to retrieve forecast details', error: error.message });
    }
};

exports.getLatestForecast = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find the most recent run ID belonging to this user
        const [latestRuns] = await db.query(
            'SELECT id FROM forecast_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (latestRuns.length === 0) {
            return res.status(200).json({ message: 'No existing forecasts found', data: [] });
        }

        const runId = latestRuns[0].id;

        const [forecastRows] = await db.query(`
            SELECT f.product_id, p.name as product_name, f.forecast_date, f.predicted_demand, f.lower_confidence, f.upper_confidence 
            FROM forecasts f
            JOIN products p ON f.product_id = p.id
            WHERE f.run_id = ? AND p.user_id = ?
            ORDER BY f.product_id, f.forecast_date ASC
        `, [runId, userId]);

        // Group rows by product_id
        const grouped = {};
        for (const row of forecastRows) {
            const pId = row.product_id;
            if (!grouped[pId]) {
                grouped[pId] = {
                    product_id: pId,
                    product_name: row.product_name,
                    forecast: []
                };
            }
            
            const formattedDate = row.forecast_date instanceof Date 
                ? row.forecast_date.toISOString().split('T')[0]
                : row.forecast_date;

            grouped[pId].forecast.push({
                ds: formattedDate,
                yhat: parseFloat(row.predicted_demand),
                yhat_lower: parseFloat(row.lower_confidence),
                yhat_upper: parseFloat(row.upper_confidence)
            });
        }

        res.status(200).json({
            message: 'Latest forecasts retrieved successfully',
            data: Object.values(grouped),
            runId
        });

    } catch (error) {
        console.error('Error fetching latest forecast:', error);
        res.status(500).json({ message: 'Error fetching latest forecast', error: error.message });
    }
};
