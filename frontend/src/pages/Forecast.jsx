import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/common/Sidebar';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';
import { 
    LineElement, 
    PointElement, 
    LinearScale, 
    Title, 
    CategoryScale, 
    Chart as ChartJS,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Play, TrendingUp, Sliders, Calendar, HelpCircle, Activity, Clock, FileText } from 'lucide-react';
import './Forecast.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Filler);

const Forecast = () => {
    const { showToast } = useToast();
    const { activeUploadId } = useDataset();
    const [horizon, setHorizon] = useState(30);
    const [sensitivity, setSensitivity] = useState(0.05);
    const [holidays, setHolidays] = useState('NG');
    const [loading, setLoading] = useState(false);
    const [forecastData, setForecastData] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [activeRunId, setActiveRunId] = useState(null);

    const fetchHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.get('http://localhost:5000/api/forecast/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error('Error fetching history list:', err);
        }
    }, []);

    const loadPastRun = async (runId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.get(`http://localhost:5000/api/forecast/run/${runId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setForecastData(res.data.data);
            setActiveRunId(runId);
            if (res.data.data && res.data.data.length > 0) {
                setSelectedProduct(res.data.data[0]);
            }
            showToast('Past forecast run loaded successfully.', 'success');
        } catch (err) {
            console.error('Failed to load past run:', err);
            showToast('Failed to load this past run.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestForecast = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.get('http://localhost:5000/api/forecast/latest', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.data.data && res.data.data.length > 0) {
                setForecastData(res.data.data);
                setSelectedProduct(res.data.data[0]);
                setActiveRunId(res.data.runId || null);
            } else {
                setForecastData(null);
                setSelectedProduct(null);
                setActiveRunId(null);
            }
        } catch (err) {
            console.error('Error fetching existing forecast:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh history and load latest predictions on mount or active dataset change
    useEffect(() => {
        fetchLatestForecast();
        fetchHistory();
    }, [activeUploadId, fetchLatestForecast, fetchHistory]);

    const handleRunForecast = async () => {
        if (!activeUploadId) {
            showToast('Please upload or select a dataset first in the Import section.', 'error');
            return;
        }

        setLoading(true);
        setForecastData(null);
        setSelectedProduct(null);

        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.post('http://localhost:5000/api/forecast/generate', {
                metric: 'revenue',
                horizon_days: parseInt(horizon),
                yearly_seasonality: true,
                weekly_seasonality: true,
                holidays_country: holidays,
                trend_flexibility: parseFloat(sensitivity),
                upload_id: activeUploadId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            showToast('Facebook Prophet time-series forecast generated successfully!', 'success');
            const data = res.data.data;
            setForecastData(data);
            setActiveRunId(res.data.runId);
            if (data && data.length > 0) {
                setSelectedProduct(data[0]);
            }
            await fetchHistory();
        } catch (err) {
            console.error('Error generating forecast:', err);
            showToast(err.response?.data?.message || 'Error executing ML forecasting pipeline.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0
        }).format(val);
    };

    const getChartData = () => {
        if (!selectedProduct) return null;

        const forecast = selectedProduct.forecast;
        
        return {
            labels: forecast.map(f => f.ds),
            datasets: [
                {
                    label: 'Predicted Demand Value (Expected)',
                    data: forecast.map(f => f.yhat),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointHoverRadius: 6,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Confidence Upper limit (+15%)',
                    data: forecast.map(f => f.yhat_upper),
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Confidence Lower limit (-15%)',
                    data: forecast.map(f => f.yhat_lower),
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false
                }
            ]
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#94a3b8',
                    font: { family: 'Outfit', size: 12, weight: '500' }
                }
            },
            tooltip: {
                padding: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatCurrency(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.02)' },
                ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.02)' },
                ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            }
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1>Demand Forecasting Engine</h1>
                        <p className="subtitle">Scope target items and train Facebook Prophet time-series models</p>
                    </div>
                </header>

                <div className="forecast-layout-grid">
                    
                    {/* Left Column: Control Panel & History Log */}
                    <div className="forecast-controls-col">
                        
                        {/* Interactive Parameters Card */}
                        <div className="glass-panel parameters-card animate-slide-down">
                            <div className="card-header-icon">
                                <Sliders size={18} />
                                <h3>Prophet Hyperparameters</h3>
                            </div>
                            
                            <div className="form-group-slider">
                                <div className="slider-header">
                                    <label>Horizon (Days): <strong>{horizon}d</strong></label>
                                </div>
                                <input 
                                    type="range" 
                                    min="7" 
                                    max="90" 
                                    value={horizon} 
                                    onChange={(e) => setHorizon(e.target.value)}
                                    className="slider-bar"
                                />
                                <span className="helper-label">Number of days to project forward.</span>
                            </div>

                            <div className="form-group-slider">
                                <div className="slider-header">
                                    <label>Sensitivity Ratio: <strong>{sensitivity}</strong></label>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.001" 
                                    max="0.5" 
                                    step="0.01"
                                    value={sensitivity} 
                                    onChange={(e) => setSensitivity(e.target.value)}
                                    className="slider-bar"
                                />
                                <span className="helper-label">Higher values capture volatile demand shifts.</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Regional Holidays Calendar</label>
                                <select 
                                    className="form-select" 
                                    value={holidays}
                                    onChange={(e) => setHolidays(e.target.value)}
                                >
                                    <option value="NG">Nigeria (NG)</option>
                                    <option value="US">United States (US)</option>
                                    <option value="GB">United Kingdom (GB)</option>
                                    <option value="ZA">South Africa (ZA)</option>
                                </select>
                            </div>

                            <button 
                                className="btn btn-primary run-forecast-btn"
                                onClick={handleRunForecast}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Activity className="spinner" size={16} />
                                        <span>Training Models...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} />
                                        <span>Generate Predictions</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Past Runs History List */}
                        <div className="glass-panel history-card animate-slide-down">
                            <div className="card-header-icon">
                                <Clock size={18} />
                                <h3>Forecast Run History</h3>
                            </div>
                            <div className="history-list-scroll">
                                {history.length === 0 ? (
                                    <div className="empty-history-text">
                                        <FileText size={28} className="empty-history-icon" />
                                        <p>No historical runs logged yet.</p>
                                    </div>
                                ) : (
                                    history.map((run) => {
                                        const isCurrent = run.id === activeRunId;
                                        return (
                                            <div 
                                                key={run.id}
                                                className={`history-item-row glass-panel ${isCurrent ? 'history-active' : ''}`}
                                                onClick={() => loadPastRun(run.id)}
                                            >
                                                <div className="history-item-left">
                                                    <strong>Run #{run.id}</strong>
                                                    <span>{new Date(run.created_at).toLocaleString()}</span>
                                                </div>
                                                {isCurrent && <span className="active-dot"></span>}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Dynamic Prophet Chart Visualizer */}
                    <div className="forecast-chart-col">
                        
                        {loading ? (
                            <div className="glass-panel chart-loading-placeholder animate-fade-in">
                                <Activity className="spinner loader-icon-big" size={56} />
                                <h3>Prophet model fitting is in progress...</h3>
                                <p>Calculating historical standard deviations and training Prophet regression splines. This takes about 5 seconds.</p>
                            </div>
                        ) : forecastData ? (
                            <div className="glass-panel visualizer-card animate-slide-down">
                                <div className="product-selector-tabs">
                                    {forecastData.map((p) => {
                                        const isSelected = selectedProduct?.product_id === p.product_id;
                                        return (
                                            <button 
                                                key={p.product_id}
                                                className={`prod-tab ${isSelected ? 'tab-selected' : ''}`}
                                                onClick={() => setSelectedProduct(p)}
                                            >
                                                {p.product_name}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="chart-main-header">
                                    <div className="chart-title-box">
                                        <TrendingUp size={20} className="chart-trend-icon" />
                                        <div>
                                            <h3>{selectedProduct?.product_name} Curve</h3>
                                            <span>Target Horizon Forecast limits (+15% / -15% Standard Confidence bounds)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="forecast-chart-container">
                                    <Line data={getChartData()} options={chartOptions} />
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel empty-chart-placeholder animate-slide-down">
                                <TrendingUp className="empty-chart-icon" size={64} />
                                <h2>No Forecast Curve Loaded</h2>
                                <p>Select a historical run from your history log on the left or tap <strong>Generate Predictions</strong> to run a brand new Facebook Prophet regression model!</p>
                            </div>
                        )}

                    </div>

                </div>
            </main>
        </div>
    );
};

export default Forecast;
