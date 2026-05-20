import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('optify_token') || null);
    const [loading, setLoading] = useState(true);

    // Backend URL
    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        const storedUser = localStorage.getItem('optify_user');
        const storedToken = localStorage.getItem('optify_token');

        if (storedUser && storedToken) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });
            const { token: loggedToken, user: loggedUser } = res.data;

            localStorage.setItem('optify_token', loggedToken);
            localStorage.setItem('optify_user', JSON.stringify(loggedUser));
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${loggedToken}`;
            setUser(loggedUser);
            setToken(loggedToken);
            return { success: true };
        } catch (err) {
            console.error('Login error:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || 'Login failed. Please check credentials.' 
            };
        }
    };

    const register = async (name, email, password, role = 'analyst') => {
        try {
            await axios.post(`${API_URL}/auth/register`, { name, email, password, role });
            return { success: true };
        } catch (err) {
            console.error('Registration error:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || 'Registration failed. Try again.' 
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('optify_token');
        localStorage.removeItem('optify_user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setToken(null);
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
