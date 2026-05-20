import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DatasetContext = createContext(null);

export const DatasetProvider = ({ children }) => {
    const { token, isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const [uploads, setUploads] = useState([]);
    const [activeUploadId, setActiveUploadId] = useState(null);
    const [loading, setLoading] = useState(false);

    const refreshUploads = useCallback(async () => {
        if (!isAuthenticated || !token) return;
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/data/uploads', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUploads(res.data);
            
            // If activeUploadId is not set yet, or is no longer in the list, set to the latest upload
            if (res.data.length > 0) {
                const ids = res.data.map(u => u.id);
                if (!activeUploadId || !ids.includes(activeUploadId)) {
                    setActiveUploadId(res.data[0].id);
                }
            } else {
                setActiveUploadId(null);
            }
        } catch (error) {
            console.error('Error loading datasets:', error);
            showToast('Failed to retrieve your custom datasets list.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, token, activeUploadId, showToast]);

    useEffect(() => {
        if (isAuthenticated) {
            refreshUploads();
        } else {
            setUploads([]);
            setActiveUploadId(null);
        }
    }, [isAuthenticated]); // Only refresh on login changes

    const selectDataset = useCallback((id) => {
        setActiveUploadId(id);
        const name = uploads.find(u => u.id === id)?.filename || 'selected dataset';
        showToast(`Dataset switched to: ${name}`, 'success');
    }, [uploads, showToast]);

    const performDeleteUpload = useCallback(async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/data/uploads/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Dataset deleted permanently.', 'success');
            
            // If we deleted the active one, clear activeUploadId so refreshUploads selects a new one
            if (activeUploadId === id) {
                setActiveUploadId(null);
            }
            
            await refreshUploads();
        } catch (error) {
            console.error('Delete Dataset Error:', error);
            showToast(error.response?.data?.message || 'Failed to delete dataset.', 'error');
        }
    }, [token, activeUploadId, refreshUploads, showToast]);

    return (
        <DatasetContext.Provider value={{
            uploads,
            activeUploadId,
            loading,
            refreshUploads,
            selectDataset,
            deleteUpload: performDeleteUpload
        }}>
            {children}
        </DatasetContext.Provider>
    );
};

export const useDataset = () => {
    const context = useContext(DatasetContext);
    if (!context) {
        throw new Error('useDataset must be used within a DatasetProvider');
    }
    return context;
};
