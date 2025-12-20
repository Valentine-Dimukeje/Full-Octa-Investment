import React, { useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch';
import AdminLayout from './AdminLayout';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, transactions: 0, pending: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [uRes, tRes] = await Promise.all([
                    authFetch('/api/admin/users'),
                    authFetch('/api/admin/transactions')
                ]);
                
                if (uRes.ok && tRes.ok) {
                    const users = await uRes.json();
                    const txns = await tRes.json();
                    setStats({
                        users: users.length,
                        transactions: txns.length,
                        pending: txns.filter(t => t.status === 'pending').length
                    });
                } else {
                    console.error("Failed to fetch dashboard stats.");
                }
            } catch (error) {
                console.error("Dashboard fetch failed", error);
            }
        };

        fetchData(); // Initial fetch

        const handleRefresh = () => {
            fetchData(); // Call fetchData on refresh event
            toast.success("Dashboard updated", { id: 'admin-refresh-toast' });
        };

        window.addEventListener('admin-refresh', handleRefresh);
        
        // Cleanup function
        return () => {
            window.removeEventListener('admin-refresh', handleRefresh);
        };
    }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

    return (
        <AdminLayout title="Dashboard Overview">
            <div style={styles.grid}>
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Total Users</h3>
                        <span style={styles.icon}>👥</span>
                    </div>
                    <p style={styles.cardValue}>{stats.users}</p>
                    <p style={styles.cardSub}>Active platform members</p>
                </div>
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Total Transactions</h3>
                        <span style={styles.icon}>📊</span>
                    </div>
                    <p style={styles.cardValue}>{stats.transactions}</p>
                    <p style={styles.cardSub}>All time records</p>
                </div>
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Pending Actions</h3>
                        <span style={{...styles.icon, color: '#f59e0b'}}>⚠️</span>
                    </div>
                    <p style={styles.cardValue}>{stats.pending}</p>
                    <p style={styles.cardSub}>Requires attention</p>
                </div>
            </div>
        </AdminLayout>
    );
};

const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
    },
    card: {
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    cardTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#64748b',
        margin: 0,
    },
    icon: {
        fontSize: '24px',
        color: '#3b82f6',
    },
    cardValue: {
        fontSize: '36px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 8px 0',
    },
    cardSub: {
        fontSize: '14px',
        color: '#94a3b8',
        margin: 0,
    },
};

export default AdminDashboard;

