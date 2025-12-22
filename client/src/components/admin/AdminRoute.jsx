import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

const AdminRoute = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async () => {
            const token = localStorage.getItem('access');
            if (!token) {
                setIsAdmin(false);
                setIsLoading(false);
                return;
            }

            try {
                const res = await authFetch('/api/auth/me/');
                if (res.ok) {
                    const profile = await res.json();
                    if (profile.is_staff || profile.is_superuser) {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error("Admin check failed", error);
                setIsAdmin(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAdminStatus();
    }, []);

    if (isLoading) {
        return (
            <div style={{
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100svh',
                background: '#0f172a',
                color: '#fff',
                fontFamily: "'Inter', sans-serif"
            }}>
                <div className='flex flex-col items-center justify-center'>
                    <div className="spinner" style={{marginBottom: '20px'}}></div>
                    <div style={{fontSize: '18px', fontWeight: '500'}}>Verifying Admin Access...</div>
                </div>
            </div>
        );
    }

    return isAdmin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default AdminRoute;
