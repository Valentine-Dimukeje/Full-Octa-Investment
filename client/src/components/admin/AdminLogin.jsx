import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/config';
import { authFetch } from '../utils/authFetch';
import "../styles/Auth.css"; // Ensure you rely on existing CSS or add inline styles if needed for specific tweaks

const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Login failed with status:", res.status, err);
                throw new Error(err.error || "Login failed");
            }

            const data = await res.json();
            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);

            // Double check staff status
            const meRes = await authFetch(`/api/auth/me`);
            if (meRes.ok) {
                const profile = await meRes.json();
                if (profile.is_staff || profile.is_superuser) {
                    navigate("/admin");
                } else {
                    setErrorMsg("Forbidden: You do not have admin privileges.");
                    localStorage.removeItem("access");
                    localStorage.removeItem("refresh");
                }
            } else {
                throw new Error("Failed to verify admin status.");
            }
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.overlay}></div>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.iconWrapper}>
                        <span style={styles.icon}>🛡️</span>
                    </div>
                    <h2 style={styles.title}>Admin Portal</h2>
                    <p style={styles.subtitle}>Secure Access Control</p>
                </div>
                
                {errorMsg && <div style={styles.errorBox}>⚠️ {errorMsg}</div>}

                <form onSubmit={handleLogin} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            type="email"
                            style={styles.input}
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            style={styles.input}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? (
                            <span style={styles.loadingDots}>Authenticating...</span>
                        ) : (
                            "Access Dashboard"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Inline styles for a quick professional look without touching global CSS too much yet
const styles = {
    container: {
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.1) 0%, transparent 50%)',
        zIndex: 0,
    },
    card: {
        position: 'relative',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    iconWrapper: {
        width: '64px',
        height: '64px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
    },
    icon: {
        fontSize: '32px',
    },
    title: {
        color: '#f8fafc',
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '8px',
        margin: 0,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: '14px',
        margin: 0,
    },
    errorBox: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#f87171',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        textAlign: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        color: '#cbd5e1',
        fontSize: '14px',
        fontWeight: '500',
    },
    input: {
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '12px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
    },
    button: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '14px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '12px',
        transition: 'transform 0.1s, box-shadow 0.2s',
        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
    },
    loadingDots: {
        opacity: 0.8,
    }
};

export default AdminLogin;
