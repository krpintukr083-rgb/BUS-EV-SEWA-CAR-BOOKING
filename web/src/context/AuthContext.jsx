import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token =
        localStorage.getItem('auth_token') ||
        localStorage.getItem('admin_token') ||
        localStorage.getItem('driver_token');

      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.user) {
            const currentUser = res.data.user;
            if (currentUser.role === 'admin' || currentUser.role === 'driver') {
              setUser(currentUser);
              localStorage.setItem('auth_user', JSON.stringify(currentUser));
              localStorage.setItem('auth_token', token);
            } else {
              logout();
            }
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
      // Role is not hardcoded; backend determines role from credentials
      const res = await api.post('/auth/login', { identifier, password });

      if (res.data?.success) {
        const { token, user: loggedUser } = res.data;

        // Ensure user is authorized for web portal access
        if (loggedUser.role !== 'admin' && loggedUser.role !== 'driver') {
          const errMsg = 'Access restricted: Only Super Admin and Driver accounts can access this web portal.';
          setError(errMsg);
          return { success: false, message: errMsg };
        }

        // Store tokens & user data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(loggedUser));

        if (loggedUser.role === 'admin') {
          localStorage.setItem('admin_token', token);
          localStorage.setItem('admin_user', JSON.stringify(loggedUser));
        } else if (loggedUser.role === 'driver') {
          localStorage.setItem('driver_token', token);
          localStorage.setItem('driver_user', JSON.stringify(loggedUser));
        }

        setUser(loggedUser);
        return { success: true, role: loggedUser.role, user: loggedUser };
      }

      const msg = res.data?.message || 'Authentication failed.';
      setError(msg);
      return { success: false, message: msg };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Authentication failed. Please check your credentials and server connection.';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    setUser(null);
    setError(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.user);
        localStorage.setItem('auth_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Aliases for seamless backward compatibility
export const useAdminAuth = useAuth;
export const AdminAuthProvider = AuthProvider;
