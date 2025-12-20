import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

const AdminLayout = ({ children, title }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div style={styles.container}>
            {/* Sidebar with state and toggle */}
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            <main style={styles.main} className="transition-all duration-300">
                <header style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Hamburger Menu - Visible on all sizes */}
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            style={styles.mobileMenuBtn}
                        >
                            <span style={{ fontSize: '24px' }}>☰</span>
                        </button>
                        <h1 style={styles.title}>{title}</h1>
                    </div>
                    
                    <div style={styles.userProfile}>
                        <div style={styles.avatar}>A</div>
                        <span style={styles.adminBadge} className="hidden sm:inline">Admin</span>
                    </div>
                </header>
                <div style={styles.content}>
                    {children}
                </div>
            </main>

            {/* Overlay for all sizes when sidebar is open */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: "'Inter', sans-serif",
    },
    main: {
        width: '100%',
        marginLeft: 0, // Reset for mobile
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        // Responsive margin added via className: lg:ml-[260px]
    },
    mobileMenuBtn: {
        background: 'transparent',
        border: 'none',
        color: '#1e293b',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        background: '#fff',
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 30,
    },
    title: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    userProfile: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    avatar: {
        width: '32px',
        height: '32px',
        background: '#3b82f6',
        color: '#fff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '14px',
    },
    adminBadge: {
        background: '#dbeafe',
        color: '#1e40af',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
    },
    content: {
        padding: '24px',
        flex: 1,
        background: '#f1f5f9',
    },
};

export default AdminLayout;
