import React, { useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch';
import AdminLayout from './AdminLayout';
import toast from 'react-hot-toast';

const AdminReferrals = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReferrals = async () => {
        try {
            const res = await authFetch('/api/admin/referrals');
            if (res.ok) {
                const data = await res.json();
                setReferrals(data);
            }
        } catch (error) {
            console.error("Failed to fetch referrals", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();

        const handleRefresh = () => {
            fetchReferrals();
            toast.success("Referrals updated", { id: 'admin-refresh-toast' });
        };

        window.addEventListener('admin-refresh', handleRefresh);
        return () => window.removeEventListener('admin-refresh', handleRefresh);
    }, []);

    if (loading) return <AdminLayout title="Referral Network"><div>Loading...</div></AdminLayout>;

    return (
        <AdminLayout title="Referral Network">
            <div style={styles.tableContainer}>
                <div style={styles.scrollWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.trHead}>
                                <th style={styles.th}>Referrer</th>
                                <th style={styles.th}>Referred User</th>
                                <th style={styles.th}>Bonus Earned</th>
                                <th style={styles.th}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {referrals.map(ref => (
                                <tr key={ref.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <span style={{fontWeight: '500', color: '#0f172a'}}>{ref.referrer}</span>
                                    </td>
                                    <td style={styles.td}>{ref.referred}</td>
                                    <td style={styles.td}>
                                        <span style={styles.bonusBadge}>${ref.bonus}</span>
                                    </td>
                                    <td style={styles.td}>{new Date(ref.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
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
        minWidth: '600px',
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
    bonusBadge: {
        background: '#ecfdf5',
        color: '#059669',
        padding: '4px 8px',
        borderRadius: '6px',
        fontWeight: '600',
        fontSize: '14px',
    }
};

export default AdminReferrals;
