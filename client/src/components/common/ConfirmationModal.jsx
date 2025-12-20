import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "info" }) => {
    if (!isOpen) return null;

    const isDanger = type === "danger";

    return (
        <AnimatePresence>
            <div style={styles.overlay} onClick={onClose}>
                <motion.div
                    style={styles.card}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={styles.header}>
                        <div style={{...styles.iconWrapper, background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'}}>
                            <span style={{fontSize: '24px'}}>{isDanger ? '⚠️' : 'ℹ️'}</span>
                        </div>
                        <h3 style={styles.title}>{title}</h3>
                    </div>
                    
                    <p style={styles.message}>{message}</p>
                    
                    <div style={styles.footer}>
                        <button style={styles.cancelBtn} onClick={onClose}>
                            {cancelText}
                        </button>
                        <button 
                            style={{
                                ...styles.confirmBtn, 
                                background: isDanger ? '#ef4444' : '#3b82f6'
                            }} 
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
    },
    card: {
        background: '#fff',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '20px',
        textAlign: 'center',
    },
    iconWrapper: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
    },
    title: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },
    message: {
        color: '#64748b',
        fontSize: '15px',
        lineHeight: '1.6',
        textAlign: 'center',
        marginBottom: '32px',
        margin: '0 0 32px 0',
    },
    footer: {
        display: 'flex',
        gap: '12px',
    },
    cancelBtn: {
        flex: 1,
        padding: '12px',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '12px',
        color: '#64748b',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    confirmBtn: {
        flex: 1,
        padding: '12px',
        border: 'none',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }
};

export default ConfirmationModal;
