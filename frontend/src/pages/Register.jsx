import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import './Register.css';

const Register = () => {
    const { register } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('analyst');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        const result = await register(name, email, password, role);
        setLoading(false);

        if (result.success) {
            setSuccessMsg('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    <div className="logo-box">
                        <ShieldAlert className="auth-logo" size={32} />
                    </div>
                    <h1>Create Account</h1>
                    <p>Access our inventory forecasting & optimization tools</p>
                </div>

                {error && <div className="auth-error">{error}</div>}
                {successMsg && <div className="auth-success">{successMsg}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Full Name</label>
                        <div className="input-wrapper">
                            <User className="input-icon" size={18} />
                            <input 
                                type="text" 
                                className="glass-input" 
                                placeholder="John Doe" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={18} />
                            <input 
                                type="email" 
                                className="glass-input" 
                                placeholder="name@example.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input 
                                type="password" 
                                className="glass-input" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Role</label>
                        <select 
                            className="glass-input select-input" 
                            value={role} 
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="analyst">Analyst</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Register'}
                        <ArrowRight size={18} />
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Sign in here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
