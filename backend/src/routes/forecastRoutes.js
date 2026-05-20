const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/generate', authMiddleware, forecastController.generateForecast);
router.get('/history', authMiddleware, forecastController.getForecastRuns);
router.get('/run/:runId', authMiddleware, forecastController.getForecastRunDetails);
router.get('/latest', authMiddleware, forecastController.getLatestForecast);

module.exports = router;
