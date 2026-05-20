const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const optimizationRoutes = require('./routes/optimizationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logger

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', uploadRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/optimize', optimizationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

module.exports = app;
