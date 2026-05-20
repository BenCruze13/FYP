import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import UploadData from '../pages/UploadData';
import Forecast from '../pages/Forecast';
import Optimization from '../pages/Optimization';

// Helper component for Route Guarding
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifycontent: 'center',
                backgroundColor: '#090a0f',
                color: '#64748b',
                fontFamily: 'sans-serif'
            }}>
                <h3>Loading system session...</h3>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            {/* Guest Entry Ports */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Workspace Channels */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />
            <Route path="/upload" element={
                <ProtectedRoute>
                    <UploadData />
                </ProtectedRoute>
            } />
            <Route path="/forecast" element={
                <ProtectedRoute>
                    <Forecast />
                </ProtectedRoute>
            } />
            <Route path="/optimization" element={
                <ProtectedRoute>
                    <Optimization />
                </ProtectedRoute>
            } />

            {/* Default Channel Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};

export default AppRoutes;
