import React, { useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch';
import AdminLayout from './AdminLayout';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

const AdminTransactions = () => {
    const [txns, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, action: null, type: 'info' });

    const fetchTransactions = async () => {
        try {
            const res = await authFetch('/api/admin/transactions');
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error("Failed to fetch transactions", error);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();

        const handleRefresh = () => {
            fetchTransactions();
            toast.success("Transactions updated", { id: 'admin-refresh-toast' });
        };

        window.addEventListener('admin-refresh', handleRefresh);
        return () => window.removeEventListener('admin-refresh', handleRefresh);
    }, []);

    const processAction = async (id, action) => {
        const isDelete = action === 'delete';
        const loadingToast = toast.loading(`${isDelete ? 'Deleting' : action === 'approve' ? 'Approving' : 'Rejecting'} transaction...`);
        
        try {
            const url = isDelete ? `/api/admin/transactions/${id}` : `/api/admin/transactions/${id}/admin-action`;
            const method = isDelete ? 'DELETE' : 'POST';
            const body = isDelete ? null : JSON.stringify({ action });

            const res = await authFetch(url, {
                method,
                headers: isDelete ? {} : { 'Content-Type': 'application/json' },
                body
            });

            if (res.ok) {
                toast.success(`Transaction ${isDelete ? 'deleted' : action + 'd'} successfully`, { id: loadingToast });
                fetchTransactions();
            } else {
                toast.error("Action failed", { id: loadingToast });
            }
        } catch (error) {
            console.error("Action error", error);
            toast.error("Server error occurred", { id: loadingToast });
        } finally {
            setConfirmModal({ isOpen: false, id: null, action: null, type: 'info' });
        }
    };

    if (loading) return <AdminLayout title="Transactions"><div>Loading...</div></AdminLayout>;

    return (
        <AdminLayout title="Transactions">
            <div style={styles.tableContainer}>
                <div style={styles.scrollWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.trHead}>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>User</th>
                                <th style={styles.th}>Type</th>
                                <th style={styles.th}>Amount</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {txns.map(t => (
                                <tr key={t.id} style={styles.tr}>
                                    <td style={styles.td}>#{t.id}</td>
                                    <td style={styles.td}>
                                        <span style={{fontWeight: '500', color: '#0f172a'}}>{t.email}</span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{t.type}</span>
                                            {(t.meta?.method || t.meta?.plan) && (
                                                <span style={styles.methodTag}>
                                                    {t.meta.method || t.meta.plan}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={styles.td}>${t.amount}</td>
                                    <td style={styles.td}>
                                        <StatusBadge status={t.status} />
                                    </td>
                                    <td style={styles.td}>{new Date(t.createdAt).toLocaleString()}</td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {t.status === 'pending' ? (
                                                <select 
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                id: t.id,
                                                                action: e.target.value,
                                                                type: e.target.value === 'reject' ? 'danger' : 'info'
                                                            });
                                                        }
                                                        e.target.value = ""; 
                                                    }}
                                                    style={styles.select}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Action</option>
                                                    <option value="approve">Approve</option>
                                                    <option value="reject">Reject</option>
                                                </select>
                                            ) : (
                                                <span style={{color: '#94a3b8', fontSize: '12px'}}>Processed</span>
                                            )}
                                            <button 
                                                onClick={() => setConfirmModal({
                                                    isOpen: true,
                                                    id: t.id,
                                                    action: 'delete',
                                                    type: 'danger'
                                                })}
                                                style={styles.deleteBtn}
                                                title="Delete Transaction"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => processAction(confirmModal.id, confirmModal.action)}
                title={`${confirmModal.action === 'delete' ? 'Delete' : confirmModal.action === 'approve' ? 'Approve' : 'Reject'} Transaction`}
                message={`Are you sure you want to ${confirmModal.action} transaction #${confirmModal.id}? ${confirmModal.action === 'delete' ? 'This action is irreversible.' : 'This will update the user\'s wallet balance.'}`}
                type={confirmModal.type}
                confirmText={confirmModal.action?.charAt(0).toUpperCase() + confirmModal.action?.slice(1)}
            />
        </AdminLayout>
    );
};

const StatusBadge = ({ status }) => {
    let bg = '#f1f5f9';
    let color = '#64748b';

    if (status === 'completed' || status === 'active') {
        bg = '#dcfce7';
        color = '#166534';
    } else if (status === 'pending') {
        bg = '#fef3c7';
        color = '#b45309';
    } else if (status === 'rejected') {
        bg = '#fee2e2';
        color = '#991b1b';
    }

    return (
        <span style={{
            background: bg,
            color: color,
            padding: '4px 8px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'capitalize'
        }}>
            {status}
        </span>
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
    methodTag: {
        background: '#f0f9ff',
        color: '#0369a1',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
    },
    select: {
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '13px',
        color: '#334155',
        background: '#fff',
        cursor: 'pointer',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    deleteBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
    }
};

export default AdminTransactions;

