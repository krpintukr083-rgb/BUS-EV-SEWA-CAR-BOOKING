import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminService } from '../services/adminService';

const AdminAuthContext = createContext();
const ADMIN_PANEL_ROLES = ['admin', 'super_admin', 'sub_admin'];

const normalizeAdminUser = (user) => ({
  ...user,
  permissions: Array.isArray(user.permissions) ? user.permissions : []
});

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const res = await adminService.getMe();
          // Accept both super_admin and sub_admin roles
          if (res.success && ADMIN_PANEL_ROLES.includes(res.user?.role)) {
            const user = normalizeAdminUser(res.user);
            setAdminUser(user);
            localStorage.setItem('admin_user', JSON.stringify(user));
          } else {
            logout();
          }
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    setError(null);
    try {
      const res = await adminService.login(identifier, password);
      if (res.success) {
        if (!res.user || !ADMIN_PANEL_ROLES.includes(res.user.role)) {
          return { success: false, message: 'This account does not have admin access.' };
        }
        const user = normalizeAdminUser(res.user);
        console.log('[ADMIN LOGIN] role:', user.role);
        console.log('[ADMIN LOGIN] adminType:', user.adminType);
        console.log('[ADMIN LOGIN] permissions:', user.permissions);
        localStorage.setItem('admin_token', res.token);
        localStorage.setItem('admin_user', JSON.stringify(user));
        setAdminUser(user);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Admin authentication failed.';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
  };

  // Helper: check if current user has a permission
  // Super Admin (role==='admin') always returns true
  const hasPermission = (permission) => {
    if (!adminUser) return false;
    if (adminUser.role === 'admin' || adminUser.role === 'super_admin') return true;
    if (adminUser.role === 'sub_admin') {
      return Array.isArray(adminUser.permissions) && adminUser.permissions.includes(permission);
    }
    return false;
  };

  // Helper: check if current user is Super Admin
  const isSuperAdmin = () => adminUser?.role === 'admin' || adminUser?.role === 'super_admin';

  return (
    <AdminAuthContext.Provider value={{ adminUser, loading, error, login, logout, hasPermission, isSuperAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
