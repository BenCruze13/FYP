import React, { useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/common/Sidebar';
import { useToast } from '../context/ToastContext';
import { useDataset } from '../context/DatasetContext';
import { Upload, FileSpreadsheet, RefreshCw, Layers, Calendar, Trash2, Check, X, Database } from 'lucide-react';
import './UploadData.css';

const UploadData = () => {
    const { showToast } = useToast();
    const { uploads, activeUploadId, selectDataset, deleteUpload, refreshUploads } = useDataset();
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (file) => {
        if (!file.name.endsWith('.csv')) {
            showToast('Please upload a valid CSV spreadsheet file (.csv)', 'error');
            return;
        }
        setFile(file);
        showToast(`Spreadsheet loaded: ${file.name}`, 'info');
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.post('http://localhost:5000/api/data/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            showToast(`Historical retail records imported! Added ${res.data.recordsImported || 9} transactions.`, 'success');
            setFile(null);
            
            // Reload uploads list
            await refreshUploads();
            
            // Auto select newly uploaded dataset
            if (res.data.uploadId) {
                selectDataset(res.data.uploadId);
            }
        } catch (err) {
            console.error('File upload error:', err);
            showToast(err.response?.data?.message || 'Error processing spreadsheet. Ensure column headers match.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const [resetLoading, setResetLoading] = useState(false);

    const handleResetAllData = async () => {
        const confirmWipe = window.confirm("Are you absolutely sure you want to clear your entire database environment? This will permanently delete all your products, uploaded transactions, forecasting models, and optimization action plans. This action cannot be undone.");
        if (!confirmWipe) return;

        setResetLoading(true);
        try {
            const token = localStorage.getItem('optify_token');
            const res = await axios.post('http://localhost:5000/api/data/reset', {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            showToast(res.data.message || 'Entire database environment cleared successfully.', 'success');
            await refreshUploads();
        } catch (err) {
            console.error('Reset error:', err);
            showToast(err.response?.data?.message || 'Failed to wipe database environment.', 'error');
        } finally {
            setResetLoading(false);
        }
    };

    const activeDataset = uploads.find(u => u.id === activeUploadId);

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1>Historical Data Import</h1>
                        <p className="subtitle">Upload your retail transactional logs to train forecasting models</p>
                    </div>

                    <div className="active-dataset-badge glass-panel animate-slide-down">
                        <Database size={16} className="badge-icon-db" />
                        <div>
                            <span>Active Dataset:</span>
                            <strong>{activeDataset ? activeDataset.filename : 'None (No Data Loaded)'}</strong>
                        </div>
                        <button className="btn btn-secondary btn-sm select-dataset-btn" onClick={() => setShowModal(true)}>
                            Change
                        </button>
                    </div>
                </header>

                <div className="upload-container">
                    <div className="upload-grid">
                        
                        {/* Interactive Drag & Drop Box */}
                        <div className="glass-panel upload-box-wrapper animate-slide-down">
                            <form 
                                className={`upload-form-box ${dragActive ? 'drag-active' : ''}`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onSubmit={handleUploadSubmit}
                            >
                                <input 
                                    type="file" 
                                    id="file-upload-input" 
                                    className="file-hidden"
                                    onChange={handleFileChange}
                                    accept=".csv"
                                />
                                
                                <div className="upload-box-content">
                                    <div className="icon-glow-box">
                                        <Upload className="upload-arrow" size={32} />
                                    </div>
                                    <h3>Drag & Drop Transaction CSV</h3>
                                    <p>or <label htmlFor="file-upload-input" className="file-select-label">browse your computer</label></p>
                                    
                                    {file && (
                                        <div className="selected-file-badge animate-fade-in">
                                            <FileSpreadsheet size={16} />
                                            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn btn-primary upload-btn" 
                                    disabled={!file || loading}
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="spinner" size={18} />
                                            <span>Processing Data...</span>
                                        </>
                                    ) : (
                                        'Process & Store Records'
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Formatting Instructions Panel */}
                        <div className="glass-panel instructions-card animate-slide-down">
                            <h2>Required CSV Format</h2>
                            <p className="card-desc">Your spreadsheet must contain these exact headers to match the Optify database schema:</p>
                            
                            <ul className="format-list">
                                <li>
                                    <strong>date</strong>
                                    <span>Date of sales transaction (YYYY-MM-DD)</span>
                                </li>
                                <li>
                                    <strong>product_name</strong>
                                    <span>Exact retail name (supports inches, e.g. 55")</span>
                                </li>
                                <li>
                                    <strong>category</strong>
                                    <span>Product category classification</span>
                                </li>
                                <li>
                                    <strong>cost_price</strong>
                                    <span>Wholesale cost price of the item</span>
                                </li>
                                <li>
                                    <strong>selling_price</strong>
                                    <span>Retail selling price of the item</span>
                                </li>
                                <li>
                                    <strong>quantity_sold</strong>
                                    <span>Units sold in this specific transaction</span>
                                </li>
                                <li>
                                    <strong>revenue</strong>
                                    <span>Total earnings generated (qty * selling_price)</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Reset Database environment card */}
                    <div className="glass-panel reset-data-card animate-slide-down">
                        <div className="reset-left">
                            <h3>Wipe Database Environment</h3>
                            <p className="reset-desc">
                                Looking to restart your optimization logs or test another dataset? Clears all products, sales records, confidence limits, and procurement allocations belonging to your account.
                            </p>
                        </div>
                        <button 
                            type="button" 
                            className="btn btn-danger reset-wipe-btn" 
                            disabled={resetLoading}
                            onClick={handleResetAllData}
                        >
                            {resetLoading ? (
                                <>
                                    <RefreshCw className="spinner" size={16} />
                                    <span>Clearing Systems...</span>
                                </>
                            ) : (
                                'Wipe All My Data'
                            )}
                        </button>
                    </div>
                </div>
            </main>

            {/* Datasets Selection Modal Popup */}
            {showModal && (
                <div className="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="modal-content glass-panel animate-zoom-in" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-desc">
                                <h2>Manage Uploaded Datasets</h2>
                                <p>Select which spreadsheet context to utilize for all charts, forecasts, and solvers</p>
                            </div>
                            <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body-list">
                            {uploads.length === 0 ? (
                                <div className="empty-datasets-placeholder">
                                    <FileSpreadsheet size={48} className="empty-datasets-icon" />
                                    <h3>No Datasets Found</h3>
                                    <p>Upload a CSV file first to train your time-series models.</p>
                                </div>
                            ) : (
                                <div className="datasets-list-grid">
                                    {uploads.map((u) => {
                                        const isActive = u.id === activeUploadId;
                                        return (
                                            <div 
                                                key={u.id} 
                                                className={`dataset-row-card glass-panel ${isActive ? 'dataset-active' : ''}`}
                                                onClick={() => {
                                                    selectDataset(u.id);
                                                    setShowModal(false);
                                                }}
                                            >
                                                <div className="dataset-card-left">
                                                    <div className="dataset-icon-badge">
                                                        <FileSpreadsheet size={18} />
                                                    </div>
                                                    <div className="dataset-card-details">
                                                        <h4>{u.filename}</h4>
                                                        <span>Uploaded on {new Date(u.created_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="dataset-card-actions">
                                                    {isActive && (
                                                        <span className="active-pill animate-fade-in">
                                                            <Check size={12} /> Active
                                                        </span>
                                                    )}
                                                    <button 
                                                        className="dataset-delete-btn"
                                                        title="Delete dataset"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const conf = window.confirm(`Are you sure you want to delete dataset "${u.filename}"? This will permanently delete all related products and transaction graphs.`);
                                                            if (conf) {
                                                                deleteUpload(u.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UploadData;
