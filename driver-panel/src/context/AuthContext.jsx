import React, { createContext, useContext, useState, useEffect } from 'react';
import { driverService } from '../services/driverService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('driver_token');
      if (token) {
        try {
          const res = await driverService.getMe();
          if (res.success && res.user.role === 'driver') {
            setUser(res.user);
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
      const res = await driverService.login(identifier, password);
      if (res.success) {
        localStorage.setItem('driver_token', res.token);
        localStorage.setItem('driver_user', JSON.stringify(res.user));
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await driverService.getMe();
      if (res.success) {
        setUser(res.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
