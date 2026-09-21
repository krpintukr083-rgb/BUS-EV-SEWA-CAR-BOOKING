import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { customerService } from '../services/customerService';

const CustomerAuthContext = createContext();

export const CustomerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('customer_token');
        if (token) {
          const res = await customerService.getMe();
          if (res.success && res.user.role === 'customer') {
            setUser(res.user);
          } else {
            await logout();
          }
        }
      } catch (err) {
        console.log('Auth initialization error:', err);
        await logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    setError(null);
    try {
      const res = await customerService.login(identifier, password);
      if (res.success) {
        await AsyncStorage.setItem('customer_token', res.token);
        await AsyncStorage.setItem('customer_user', JSON.stringify(res.user));
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      let msg = 'Login failed. Please check credentials.';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        msg = 'Network Error: Cannot connect to backend server. Verify your API_BASE_URL, Wi-Fi network, or HTTPS tunnel.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (name, email, phone, password) => {
    setError(null);
    try {
      const res = await customerService.register({ name, email, phone, password });
      if (res.success) {
        await AsyncStorage.setItem('customer_token', res.token);
        await AsyncStorage.setItem('customer_user', JSON.stringify(res.user));
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      let msg = 'Registration failed.';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        msg = 'Network Error: Cannot connect to backend server. Verify your API_BASE_URL, Wi-Fi network, or HTTPS tunnel.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const refreshUser = async () => {
    try {
      const res = await customerService.getMe();
      if (res.success && res.user) {
        await AsyncStorage.setItem('customer_user', JSON.stringify(res.user));
        setUser(res.user);
      }
    } catch (e) {
      console.log('Error refreshing customer user:', e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('customer_token');
      await AsyncStorage.removeItem('customer_user');
      setUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        customer: user,
        isAuthenticated: !!user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => useContext(CustomerAuthContext);
