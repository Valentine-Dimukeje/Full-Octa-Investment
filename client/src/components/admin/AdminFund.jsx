import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import AdminLayout from './AdminLayout';
import toast from 'react-hot-toast';

const AdminFund = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [emailInput, setEmailInput] = useState('');
    const [fundAmount, setFundAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Fetch all users on mount for the dropdown/search
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await authFetch('/api/admin/users');
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
                toast.error("Failed to load users list");
            } finally {
                setFetchingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    // Filter users based on input
    useEffect(() => {
        if (emailInput) {
            const filtered = users.filter(u => 
                u.email.toLowerCase().includes(emailInput.toLowerCase()) || 
                u.username.toLowerCase().includes(emailInput.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers([]);
        }
    }, [emailInput, users]);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setEmailInput(user.email);
        setFilteredUsers([]); // Hide dropdown
        setShowModal(false); // Hide modal if open
    };

    const handleFund = async (e) => {
        e.preventDefault();
        
        if (!selectedUser || !fundAmount) {
            toast.error("Please select a user and enter an amount");
            return;
        }

        if (Number(fundAmount) <= 0) {
            toast.error("Amount must be positive");
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading("Processing funding...");

        try {
            const res = await authFetch('/api/admin/users/fund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: selectedUser.email,
                    amount: fundAmount
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`Successfully funded ${selectedUser.username}!`, { id: loadingToast });
                // Update the local selected user with the new buffer (if returned) or manual update
                if (data.user) {
                   setSelectedUser(prev => ({ ...prev, profile: { ...prev.profile, mainWallet: data.user.mainWallet }, investedBalance: data.user.investedBalance }));
                   // Update the user in the main list too so if we re-select it's updated
                   setUsers(prev => prev.map(u => u.email === data.user.email ? { ...u, profile: { ...u.profile, mainWallet: data.user.mainWallet }, investedBalance: data.user.investedBalance } : u));
                }
                setFundAmount('');
            } else {
                toast.error(data.error || "Funding failed", { id: loadingToast });
            }
        } catch (error) {
            console.error(error);
            toast.error("Server error", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout title="Fund User Wallet">
            <div style={styles.container}>
                {/* Search Section */}
                <div style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{...styles.cardTitle, marginBottom: 0}}>Find User</h3>
                        <button 
                            onClick={() => setShowModal(true)}
                            style={styles.selectUserBtn}
                        >
                            Select User 📋
                        </button>
                    </div>
                    <div style={styles.searchWrapper}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input 
                                type="text"
                                placeholder="Search by email or username..."
                                value={emailInput}
                                className='text-gray-600'
                                onChange={(e) => {
                                    setEmailInput(e.target.value);
                                    if (selectedUser && e.target.value !== selectedUser.email) {
                                        setSelectedUser(null); // Clear selection if typing changes
                                    }
                                }}
                                style={styles.input}
                            />
                            {/* Dropdown */}
                            {filteredUsers.length > 0 && !selectedUser && (
                                <ul style={styles.dropdown}>
                                    {filteredUsers.slice(0, 5).map(user => (
                                        <li 
                                            key={user.id} 
                                            onClick={() => handleSelectUser(user)}
                                            style={styles.dropdownItem}
                                        >
                                            <div style={styles.userInfo}>
                                                <div style={styles.avatar}>{user.username[0].toUpperCase()}</div>
                                                <div>
                                                    <div style={styles.userName}>{user.username}</div>
                                                    <div style={styles.userEmail}>{user.email}</div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Selected User Details & Funding */}
                {selectedUser && (
                    <div style={styles.grid}>
                        {/* User Stats Card */}
                        <div style={styles.card}>
                             <div style={styles.userHeader}>
                                <div style={styles.bigAvatar}>{selectedUser.username[0].toUpperCase()}</div>
                                <div>
                                    <h2 style={styles.bigName}>{selectedUser.username}</h2>
                                    <p style={styles.bigEmail}>{selectedUser.email}</p>
                                </div>
                             </div>

                             <div style={styles.statsGrid}>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Item Balance</span>
                                    <span style={styles.statValue}>${parseFloat(selectedUser.profile?.mainWallet || 0).toFixed(2)}</span>
                                    <span style={styles.statIcon}>💳</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Earnings</span>
                                    <span style={styles.statValue}>${parseFloat(selectedUser.profile?.profitWallet || 0).toFixed(2)}</span> 
                                     <span style={styles.statIcon}>📈</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Invested</span>
                                    <span style={styles.statValue}>${parseFloat(selectedUser.investedBalance || 0).toFixed(2)}</span>
                                    <span style={styles.statIcon}>💼</span>
                                </div>
                             </div>
                        </div>

                        {/* Funding Form Card */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Add Funds</h3>
                            <p style={styles.subText}>Add amount to {selectedUser.username}'s Main Wallet.</p>
                            
                            <form onSubmit={handleFund}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Amount ($)</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={fundAmount}
                                        onChange={(e) => setFundAmount(e.target.value)}
                                        style={styles.amountInput}
                                    />
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={loading || !fundAmount}
                                    style={{
                                        ...styles.fundBtn,
                                        opacity: (loading || !fundAmount) ? 0.7 : 1,
                                        cursor: (loading || !fundAmount) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {loading ? 'Processing...' : 'Fund Wallet 💸'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Select User Modal */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>Select User</h3>
                            <button onClick={() => setShowModal(false)} style={styles.closeModalBtn}>✕</button>
                        </div>
                        <div style={styles.modalList}>
                            {users.map(user => (
                                <div 
                                    key={user.id} 
                                    onClick={() => handleSelectUser(user)}
                                    style={styles.modalItem}
                                >
                                    <div style={styles.userInfo}>
                                        <div style={styles.avatar}>{user.username[0].toUpperCase()}</div>
                                        <div>
                                            <div style={styles.userName}>{user.username}</div>
                                            <div style={styles.userEmail}>{user.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Select →</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

// Based on AdminUsers.jsx styles but enhanced
const styles = {
    // ... existing styles ...
    container: {
        maxWidth: '1000px',
        margin: '0 auto',
    },
    selectUserBtn: {
        background: '#eff6ff',
        color: '#2563eb',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(2px)',
    },
    modalContent: {
        background: '#fff',
        width: '90%',
        maxWidth: '400px',
        borderRadius: '16px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideUp 0.3s ease-out',
    },
    modalHeader: {
        padding: '16px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeModalBtn: {
        background: 'transparent',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        color: '#94a3b8',
    },
    modalList: {
        overflowY: 'auto',
        padding: '8px',
    },
    modalItem: {
        padding: '12px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'background 0.2s',
        marginBottom: '4px',
        ':hover': {
            background: '#f8fafc',
        }
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
        marginTop: '24px',
    },
    card: {
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f1f5f9',
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '16px',
    },
    searchWrapper: {
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
        background: '#f8fafc',
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        width: '100%',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        marginTop: '8px',
        listStyle: 'none',
        padding: 0,
        zIndex: 50,
        maxHeight: '300px',
        overflowY: 'auto',
    },
    dropdownItem: {
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background 0.2s',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    avatar: {
        width: '32px',
        height: '32px',
        background: '#e0f2fe',
        color: '#0284c7',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '14px',
    },
    userName: {
        fontWeight: '600',
        color: '#0f172a',
        fontSize: '14px',
    },
    userEmail: {
        fontSize: '12px',
        color: '#64748b',
    },
    userHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '24px',
        borderBottom: '1px solid #f1f5f9',
    },
    bigAvatar: {
        width: '64px',
        height: '64px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#fff',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
    },
    bigName: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '4px',
    },
    bigEmail: {
        fontSize: '14px',
        color: '#64748b',
    },
    statsGrid: {
        display: 'grid',
        gap: '16px',
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    statLabel: {
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '500',
    },
    statValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#0f172a',
    },
    statIcon: {
        fontSize: '20px',
    },
    subText: {
        color: '#64748b',
        fontSize: '14px',
        marginBottom: '20px',
    },
    formGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#334155',
        marginBottom: '8px',
    },
    amountInput: {
        width: '100%',
        padding: '16px',
        fontSize: '24px',
        fontWeight: '700',
        color: '#0f172a',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        outline: 'none',
        background: '#fff',
    },
    fundBtn: {
        width: '100%',
        padding: '16px',
        background: '#10b981',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
    }
};

export default AdminFund;
