import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const AdminSidebar = ({ isOpen, setIsOpen }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        navigate('/admin/login');
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        // Dispatch custom event for admin pages to listen to
        window.dispatchEvent(new CustomEvent('admin-refresh'));
        
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: '📊' },
        { path: '/admin/users', label: 'Users', icon: '👥' },
        { path: '/admin/fund', label: 'Fund User', icon: '💰' },
        { path: '/admin/transactions', label: 'Transactions', icon: '💳' },
        { path: '/admin/withdrawals', label: 'Withdrawals', icon: '💸' },
        { path: '/admin/referrals', label: 'Referrals', icon: '🔗' },
    ];

    return (
        <div 
            style={styles.sidebar}
            className={`transition-all duration-300 z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
            <div style={styles.logoArea}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={styles.logoText}>Admin<span style={{color: '#3b82f6'}}>Panel</span></h2>
                    
                    {/* Close button - Visible on all sizes when sidebar is open */}
                    <button 
                        onClick={() => setIsOpen(false)}
                        style={styles.closeBtn}
                    >
                        <span style={{ fontSize: '20px' }}>✕</span>
                    </button>
                </div>
            </div>
            
            <nav style={styles.nav}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        onClick={() => setIsOpen(false)} // Close on click for all sizes
                        style={({ isActive }) => ({
                            ...styles.navItem,
                            ...(isActive ? styles.activeNavItem : {})
                        })}
                    >
                        <span style={styles.navIcon}>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}

                <div style={styles.sectionLabel}>Tools</div>
                <button 
                    onClick={handleRefresh} 
                    style={{
                        ...styles.refreshBtn,
                        opacity: isRefreshing ? 0.7 : 1
                    }}
                    disabled={isRefreshing}
                >
                    <span style={{
                        ...styles.navIcon,
                        display: 'inline-block',
                        animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                    }}>🔄</span>
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </nav>

            <div style={styles.footer}>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                    <span style={styles.navIcon}>🚪</span> Logout
                </button>
            </div>

            <style>
                {`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                `}
            </style>
        </div>
    );
};

const styles = {
    sidebar: {
        width: '260px',
        height: '100vh',
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
    },
    logoArea: {
        padding: '24px',
        borderBottom: '1px solid #1e293b',
    },
    logoText: {
        color: '#fff',
        fontSize: '20px',
        fontWeight: 'bold',
        margin: 0,
        letterSpacing: '0.5px',
    },
    nav: {
        padding: '24px 16px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        color: '#94a3b8',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '500',
        transition: 'all 0.2s',
        marginBottom: '4px',
    },
    activeNavItem: {
        background: 'rgba(59, 130, 246, 0.1)',
        color: '#3b82f6',
    },
    sectionLabel: {
        color: '#475569',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        margin: '20px 16px 8px',
    },
    refreshBtn: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        color: '#94a3b8',
        background: 'transparent',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
        width: '100%',
    },
    navIcon: {
        marginRight: '12px',
        fontSize: '18px',
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: '24px',
        borderTop: '1px solid #1e293b',
    },
    logoutBtn: {
        width: '100%',
        padding: '12px',
        background: 'transparent',
        border: '1px solid #ef4444',
        color: '#ef4444',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
    },
};

export default AdminSidebar;
