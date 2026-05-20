const express = require('express');
const router = express.Router();
const optimizationController = require('../controllers/optimizationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/run', authMiddleware, optimizationController.optimizeBudget);
router.get('/history', authMiddleware, optimizationController.getOptimizationRuns);
router.get('/run/:runId', authMiddleware, optimizationController.getOptimizationRunDetails);
router.get('/latest', authMiddleware, optimizationController.getLatestOptimization);

module.exports = router;
