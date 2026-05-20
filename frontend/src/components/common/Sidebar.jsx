import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
    LayoutDashboard, 
    UploadCloud, 
    TrendingUp, 
    Sliders, 
    User, 
    LogOut,
    TrendingDown
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <Sliders className="logo-icon" size={28} />
                <span>Optify</span>
            </div>
            
            <nav className="sidebar-nav">
                <NavLink 
                    to="/dashboard" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink 
                    to="/upload" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <UploadCloud size={20} />
                    <span>Upload CSV</span>
                </NavLink>

                <NavLink 
                    to="/forecast" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <TrendingUp size={20} />
                    <span>Forecast Engine</span>
                </NavLink>

                <NavLink 
                    to="/optimization" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <Sliders size={20} />
                    <span>Optimization Plan</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="avatar">
                        <User size={18} />
                    </div>
                    <div className="user-info">
                        <p className="username">{user?.name || 'Guest User'}</p>
                        <p className="role">{user?.role === 'admin' ? 'Administrator' : 'Analyst'}</p>
                    </div>
                </div>

                <button onClick={handleLogout} className="logout-btn" title="Logout">
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
