import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/common/Sidebar';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';
import { 
    Sliders, 
    DollarSign, 
    BarChart3, 
    Activity, 
    Award, 
    BadgeAlert, 
    ShoppingCart, 
    Settings, 
    ChevronDown, 
    ChevronUp,
    Clock,
    FileText,
    TrendingUp,
    ShieldAlert
} from 'lucide-react';
import './Optimization.css';

const Optimization = () => {
    const { showToast } = useToast();
    const { activeUploadId } = useDataset();
    const [budget, setBudget] = useState('');
    const [storageLimit, setStorageLimit] = useState('');
    const [minStockRatio, setMinStockRatio] = useState(0); // in percent, e.g. 0 to 100%
    const [products, setProducts] = useState([]);
    const [constraints, setConstraints] = useState({});
    const [showConstraints, setShowConstraints] = useState(false);
    const [loading, setLoading] = useState(false);
    const [optResults, setOptResults] = useState(null);
    const [history, setHistory] = useState([]);
    const [activeRunId, setActiveRunId] = useState(null);

    const fetchHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.get('http://localhost:5000/api/optimize/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error('Error fetching optimization history list:', err);
        }
    }, []);

    const loadPastRun = async (runId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.get(`http://localhost:5000/api/optimize/run/${runId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const payload = res.data.data;
            setOptResults(payload);
            setActiveRunId(runId);
            setBudget(payload.total_budget);
            setStorageLimit(payload.storage_limit || '');
            
            showToast('Historical optimization run loaded.', 'success');
        } catch (err) {
            console.error('Failed to load past run:', err);
            showToast('Failed to load selected optimization run.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestOptimization = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.get('http://localhost:5000/api/optimize/latest', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.data) {
                const payload = res.data.data;
                setOptResults(payload);
                setActiveRunId(payload.optimization_id || null);
                setBudget(payload.total_budget);
                setStorageLimit(payload.storage_limit || '');
            } else {
                setOptResults(null);
                setActiveRunId(null);
            }
        } catch (err) {
            console.error('Error checking latest optimization plan:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load products list based on active selected dataset
    useEffect(() => {
        const fetchProducts = async () => {
            if (!activeUploadId) {
                setProducts([]);
                setConstraints({});
                return;
            }
            try {
                const token = localStorage.getItem('optify_token');
                const res = await axios.get(`http://localhost:5000/api/dashboard/products?upload_id=${activeUploadId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setProducts(res.data);
                
                const initConstraints = {};
                res.data.forEach(p => {
                    initConstraints[p.id] = { min_quantity: '', max_quantity: '' };
                });
                setConstraints(initConstraints);
            } catch (err) {
                console.error('Error fetching products list:', err);
            }
        };

        fetchProducts();
        fetchLatestOptimization();
        fetchHistory();
    }, [activeUploadId, fetchLatestOptimization, fetchHistory]);

    const handleConstraintChange = (productId, field, value) => {
        setConstraints(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [field]: value
            }
        }));
    };

    const handleRunOptimization = async (e) => {
        e.preventDefault();
        if (!activeUploadId) {
            showToast('Please select or upload a dataset in the Import section first.', 'error');
            return;
        }

        setLoading(true);
        setOptResults(null);

        const product_constraints = Object.entries(constraints).map(([pId, val]) => ({
            product_id: parseInt(pId),
            min_quantity: val.min_quantity !== '' ? parseInt(val.min_quantity) : 0,
            max_quantity: val.max_quantity !== '' ? parseInt(val.max_quantity) : null
        })).filter(c => c.min_quantity > 0 || c.max_quantity !== null);

        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.post('http://localhost:5000/api/optimize/run', {
                total_budget: parseFloat(budget),
                storage_limit: storageLimit !== '' ? parseInt(storageLimit) : null,
                min_stock_ratio: parseFloat(minStockRatio / 100),
                product_constraints,
                upload_id: activeUploadId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            showToast('Linear Programming procurement allocations computed successfully!', 'success');
            setOptResults(res.data.data);
            setActiveRunId(res.data.data.optimization_id);
            await fetchHistory();
        } catch (err) {
            console.error('Optimization error:', err);
            showToast(err.response?.data?.message || 'LP Optimization Solver failed. Ensure time-series forecasts exist first.', 'error');
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

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1>Working Capital Optimizer</h1>
                        <p className="subtitle">Optimize procurement quantities using linear programming algorithms</p>
                    </div>
                </header>

                <div className="opt-layout-grid">
                    
                    {/* Left Column: Form & History */}
                    <div className="opt-controls-col">
                        
                        <div className="glass-panel parameters-card animate-slide-down">
                            <div className="card-header-icon">
                                <Settings size={18} />
                                <h3>Allocation Bounds</h3>
                            </div>

                            <form onSubmit={handleRunOptimization}>
                                <div className="form-group">
                                    <label className="form-label">Available Budget limit (NGN)</label>
                                    <div className="input-with-icon">
                                        <DollarSign className="input-icon" size={16} />
                                        <input 
                                            type="number" 
                                            className="form-input" 
                                            placeholder="e.g. 500000"
                                            value={budget}
                                            onChange={(e) => setBudget(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <span className="helper-label">Maximum procurement investment limit.</span>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Physical Storage Capacity (Units)</label>
                                    <div className="input-with-icon">
                                        <ShoppingCart className="input-icon" size={16} />
                                        <input 
                                            type="number" 
                                            className="form-input" 
                                            placeholder="e.g. 1000 (Optional)"
                                            value={storageLimit}
                                            onChange={(e) => setStorageLimit(e.target.value)}
                                        />
                                    </div>
                                    <span className="helper-label">Total units limits for warehouse capacity.</span>
                                </div>

                                <div className="form-group-slider">
                                    <div className="slider-header">
                                        <label>Demand Stock Coverage: <strong>{minStockRatio}%</strong></label>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={minStockRatio} 
                                        onChange={(e) => setMinStockRatio(e.target.value)}
                                        className="slider-bar"
                                    />
                                    <span className="helper-label">Procures safety stock to cover demand.</span>
                                </div>

                                {/* Custom bounds accordion */}
                                <div className="constraints-accordion">
                                    <button 
                                        type="button"
                                        className="accordion-toggle-btn"
                                        onClick={() => setShowConstraints(!showConstraints)}
                                    >
                                        <span>Custom SKU Allocation Limits</span>
                                        {showConstraints ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {showConstraints && (
                                        <div className="accordion-content animate-fade-in">
                                            {products.length === 0 ? (
                                                <p className="empty-accordion-text">Please select a dataset to configure product bounds.</p>
                                            ) : (
                                                <div className="accordion-inputs-list">
                                                    {products.map(p => (
                                                        <div key={p.id} className="accordion-product-row">
                                                            <span className="product-row-name">{p.name}</span>
                                                            <div className="product-row-inputs">
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Min Qty"
                                                                    value={constraints[p.id]?.min_quantity || ''}
                                                                    onChange={(e) => handleConstraintChange(p.id, 'min_quantity', e.target.value)}
                                                                />
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Max Qty"
                                                                    value={constraints[p.id]?.max_quantity || ''}
                                                                    onChange={(e) => handleConstraintChange(p.id, 'max_quantity', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn btn-primary run-opt-btn"
                                    disabled={loading || products.length === 0}
                                >
                                    {loading ? (
                                        <>
                                            <Activity className="spinner" size={16} />
                                            <span>Running LP Simplex...</span>
                                        </>
                                    ) : (
                                        'Solve Allocation Model'
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* History Log */}
                        <div className="glass-panel history-card animate-slide-down">
                            <div className="card-header-icon">
                                <Clock size={18} />
                                <h3>Optimization Run History</h3>
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

                    {/* Right Column: LP Results Panel */}
                    <div className="opt-results-col">
                        
                        {loading ? (
                            <div className="glass-panel results-loading-placeholder animate-fade-in">
                                <Activity className="spinner loader-icon-big" size={56} />
                                <h3>Formulating Simplex Matrix Constraints...</h3>
                                <p>PuLP is configuring slack variables and minimizing cost structures under working capital bounds. Calculated in milliseconds.</p>
                            </div>
                        ) : optResults ? (
                            <div className="opt-results-container animate-slide-down">
                                
                                {/* Key Output Metric Cards */}
                                <div className="opt-metric-row">
                                    <div className="glass-panel metric-card">
                                        <div className="metric-icon profit-color">
                                            <Award size={20} />
                                        </div>
                                        <div className="metric-details">
                                            <span>General Expected Profit</span>
                                            <h3>{formatCurrency(optResults.expected_total_profit)}</h3>
                                        </div>
                                    </div>

                                    <div className="glass-panel metric-card">
                                        <div className="metric-icon revenue-color">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div className="metric-details">
                                            <span>General Expected Revenue</span>
                                            <h3>{formatCurrency(optResults.expected_total_revenue || 0)}</h3>
                                        </div>
                                    </div>

                                    <div className="glass-panel metric-card">
                                        <div className="metric-icon budget-color">
                                            <DollarSign size={20} />
                                        </div>
                                        <div className="metric-details">
                                            <span>Utilized Capital</span>
                                            <h3>{formatCurrency(optResults.total_budget_allocated)}</h3>
                                        </div>
                                    </div>
                                </div>

                                {/* Procurement Allocation List */}
                                <div className="glass-panel allocations-card">
                                    <div className="card-title-header">
                                        <BarChart3 size={20} className="allocations-chart-icon" />
                                        <div>
                                            <h3>Optimal Procurement Quantities</h3>
                                            <span>Strictly adheres to demand forecasts and safety stocks</span>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="allocations-table">
                                            <thead>
                                                <tr>
                                                    <th>Product Name</th>
                                                    <th>Allocated Purchase Units</th>
                                                    <th>Allocated Purchase Cost</th>
                                                    <th>Gross profit Return</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {optResults.allocations.map((a) => (
                                                    <tr key={a.product_id}>
                                                        <td className="product-name-cell">{a.product_name}</td>
                                                        <td>
                                                            <span className="qty-tag">{a.allocated_quantity} units</span>
                                                        </td>
                                                        <td className="cost-cell">{formatCurrency(a.allocated_budget)}</td>
                                                        <td className="profit-cell">{formatCurrency(a.expected_profit)}</td>
                                                    </tr>
                                                ))}
                                                {optResults.allocations.length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="empty-cell">
                                                            <div className="empty-solver-error">
                                                                <ShieldAlert size={28} className="warn-icon" />
                                                                <div>
                                                                    <h4>Solver yielded zero allocations!</h4>
                                                                    <p>Your capital budget is either too low or your safety stocks exceed available funds. Relax constraints and try again.</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="glass-panel empty-results-placeholder animate-slide-down">
                                <BarChart3 className="empty-chart-icon" size={64} />
                                <h2>No Allocation Results Loaded</h2>
                                <p>Select an optimization run from your history log on the left or tap <strong>Solve Allocation Model</strong> to compute procurement parameters using mathematical modeling!</p>
                            </div>
                        )}

                    </div>

                </div>
            </main>
        </div>
    );
};

export default Optimization;
