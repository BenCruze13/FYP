import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        
        setToasts((prevToasts) => [
            ...prevToasts, 
            { id, message, type }
        ]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prevToasts) => prevToasts.filter(t => t.id !== id));
    }, []);

    const renderIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="toast-icon success" size={20} />;
            case 'error':
                return <AlertCircle className="toast-icon error" size={20} />;
            case 'info':
            default:
                return <Info className="toast-icon info" size={20} />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-portal-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast-card glass-panel toast-${t.type} animate-slide-in`}>
                        {renderIcon(t.type)}
                        <div className="toast-body">
                            <p>{t.message}</p>
                        </div>
                        <button className="toast-close-btn" onClick={() => removeToast(t.id)}>
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
