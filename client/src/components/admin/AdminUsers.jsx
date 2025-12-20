import React, { useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch';
import AdminLayout from './AdminLayout';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

    const fetchUsers = async () => {
        try {
            const res = await authFetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();

        const handleRefresh = () => {
            fetchUsers();
            toast.success("User list updated", { id: 'admin-refresh-toast' });
        };

        window.addEventListener('admin-refresh', handleRefresh);
        return () => window.removeEventListener('admin-refresh', handleRefresh);
    }, []);

    const handleDelete = async (id) => {
        const loadingToast = toast.loading("Deleting user...");
        try {
            const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("User deleted successfully", { id: loadingToast });
                fetchUsers();
            } else {
                toast.error("Failed to delete user", { id: loadingToast });
            }
        } catch (error) {
            console.error("Delete error", error);
            toast.error("Server error occurred", { id: loadingToast });
        } finally {
            setConfirmModal({ isOpen: false, id: null });
        }
    };

    if (loading) return <AdminLayout title="User Management"><div>Loading...</div></AdminLayout>;

    return (
        <AdminLayout title="User Management">
            <div style={styles.tableContainer}>
                <div style={styles.scrollWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.trHead}>
                                <th style={styles.th}>User</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Main Wallet</th>
                                <th style={styles.th}>Profit Wallet</th>
                                <th style={styles.th}>Joined</th>
                                <th style={styles.th}>Last Method</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const meta = user.lastTransactionMeta || {};
                                const lastMethod = meta.method || meta.plan || 'N/A';

                                return (
                                    <tr key={user.id} style={styles.tr}>
                                        <td style={styles.td}>
                                            <div style={styles.userInfo}>
                                                <div style={styles.userAvatar}>{user.username.charAt(0).toUpperCase()}</div>
                                                <span>{user.username}</span>
                                            </div>
                                        </td>
                                        <td style={styles.td}>{user.email}</td>
                                        <td style={styles.td}>${user.profile?.mainWallet || '0.00'}</td>
                                        <td style={styles.td}>${user.profile?.profitWallet || '0.00'}</td>
                                        <td style={styles.td}>{new Date(user.date_joined).toLocaleDateString()}</td>
                                        <td style={styles.td}>
                                            <span style={styles.methodBadge}>{lastMethod}</span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.badge,
                                                background: user.is_active ? '#dcfce7' : '#fee2e2',
                                                color: user.is_active ? '#166534' : '#991b1b'
                                            }}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button 
                                                onClick={() => setConfirmModal({ isOpen: true, id: user.id })}
                                                style={styles.deleteBtn}
                                                title="Delete User"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, id: null })}
                onConfirm={() => handleDelete(confirmModal.id)}
                title="Delete User"
                message="Are you sure you want to delete this user? This action is IRREVERSIBLE and will delete all associated profiles and transactions."
                type="danger"
                confirmText="Delete User"
            />
        </AdminLayout>
    );
};

const styles = {
    tableContainer: {
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
    },
    scrollWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        minWidth: '800px',
    },
    trHead: {
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
    },
    th: {
        padding: '16px 24px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    tr: {
        borderBottom: '1px solid #f1f5f9',
        transition: 'background 0.2s',
    },
    td: {
        padding: '16px 24px',
        fontSize: '14px',
        color: '#334155',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontWeight: '500',
        color: '#0f172a',
    },
    userAvatar: {
        width: '32px',
        height: '32px',
        background: '#e2e8f0',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
    },
    badge: {
        padding: '4px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '600',
    },
    methodBadge: {
        background: '#f5f3ff',
        color: '#7c3aed',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    deleteBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '6px',
        borderRadius: '6px',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
    }
};

export default AdminUsers;
