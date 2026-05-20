import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/common/Sidebar';
import { useDataset } from '../context/DatasetContext';
import { DollarSign, ShoppingBag, Layers, Activity, Calendar } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
    const { activeUploadId } = useDataset();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('optify_token');
                const url = activeUploadId 
                    ? `http://localhost:5000/api/dashboard/stats?upload_id=${activeUploadId}`
                    : 'http://localhost:5000/api/dashboard/stats';
                const res = await axios.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
                setError('Failed to fetch store statistics. Please import some data first.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [activeUploadId]);

    // Format currency helper
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0
        }).format(val);
    };

    // Chart Data Config
    const chartData = stats ? {
        labels: stats.categoryBreakdown.map(item => item.category),
        datasets: [
            {
                data: stats.categoryBreakdown.map(item => item.revenue),
                backgroundColor: [
                    '#6366f1', // Indigo
                    '#d946ef', // Fuchsia
                    '#3b82f6', // Blue
                    '#10b981', // Emerald
                ],
                borderWidth: 1,
                borderColor: '#11131c'
            }
        ]
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#94a3b8',
                    padding: 16,
                    font: { size: 12, weight: '500' }
                }
            }
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1>Operations Hub</h1>
                        <p className="subtitle">Real-time summaries of your retail sales aggregates</p>
                    </div>
                    <div className="time-badge">
                        <Calendar size={16} />
                        <span>Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </header>

                {loading ? (
                    <div className="loader-container">
                        <Activity className="spinner loader-icon" size={48} />
                        <p>Aggregating store metrics...</p>
                    </div>
                ) : error ? (
                    <div className="dashboard-error glass-panel">
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="dashboard-grid-container">
                        
                        {/* 1. Stat Cards Row */}
                        <div className="stats-row">
                            <div className="glass-panel stat-card">
                                <div className="stat-icon-wrapper rev-icon">
                                    <DollarSign size={24} />
                                </div>
                                <div className="stat-content">
                                    <span>Gross Sales Revenue</span>
                                    <h2>{formatCurrency(stats.totalRevenue)}</h2>
                                </div>
                            </div>

                            <div className="glass-panel stat-card">
                                <div className="stat-icon-wrapper product-icon">
                                    <Layers size={24} />
                                </div>
                                <div className="stat-content">
                                    <span>Product Classes</span>
                                    <h2>{stats.productCount}</h2>
                                </div>
                            </div>

                            <div className="glass-panel stat-card">
                                <div className="stat-icon-wrapper txn-icon">
                                    <ShoppingBag size={24} />
                                </div>
                                <div className="stat-content">
                                    <span>Total Transaction Logs</span>
                                    <h2>{stats.transactionCount}</h2>
                                </div>
                            </div>
                        </div>

                        {/* 2. Visual Graphs & Tables Grid */}
                        <div className="visuals-grid">
                            
                            {/* Category Shares Chart */}
                            <div className="glass-panel chart-card">
                                <h3>Category Share</h3>
                                <p className="card-subtitle">Revenue distribution by retail classifications</p>
                                <div className="doughnut-container">
                                    {chartData ? (
                                        <Doughnut data={chartData} options={chartOptions} />
                                    ) : (
                                        <p>No category data found</p>
                                    )}
                                </div>
                            </div>

                            {/* Recent Sales Journal */}
                            <div className="glass-panel table-card">
                                <h3>Recent Sales Journal</h3>
                                <p className="card-subtitle">Latest transactional uploads in storage</p>
                                
                                <div className="table-responsive">
                                    <table className="recent-table">
                                        <thead>
                                            <tr>
                                                <th>Product Name</th>
                                                <th>Category</th>
                                                <th>Qty</th>
                                                <th>Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentTransactions.map((txn) => (
                                                <tr key={txn.id}>
                                                    <td className="product-cell">{txn.product_name}</td>
                                                    <td>
                                                        <span className={`tag tag-${txn.category.toLowerCase().replace(/\s+/g, '')}`}>
                                                            {txn.category}
                                                        </span>
                                                    </td>
                                                    <td>{txn.quantity_sold} units</td>
                                                    <td className="rev-cell">{formatCurrency(txn.revenue)}</td>
                                                </tr>
                                            ))}
                                            {stats.recentTransactions.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="empty-cell">No transaction records found. Please upload a CSV.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
