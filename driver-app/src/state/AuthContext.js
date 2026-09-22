import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from '../services/driverService';
import { clearDriverNotificationCache, registerPushTokenWithBackend } from '../services/notificationService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [token, setToken] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@driver_jwt_token');
      const storedUser = await AsyncStorage.getItem('@driver_user_data');
      const storedDriver = await AsyncStorage.getItem('@driver_profile_data');

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (storedDriver) {
          const parsedDriver = JSON.parse(storedDriver);
          setDriver(parsedDriver);
          setIsOnline(Boolean(parsedDriver.isOnline));
        }
        // Fetch fresh profile from backend
        fetchFreshProfile();
      }
    } catch (e) {
      console.warn('Error loading auth state', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFreshProfile = async () => {
    try {
      const res = await driverService.getProfile();
      if (res.data?.success && res.data.data) {
        setDriver(res.data.data);
        setIsOnline(Boolean(res.data.data.isOnline));
        await AsyncStorage.setItem('@driver_profile_data', JSON.stringify(res.data.data));
        registerPushTokenWithBackend({
          post: (url, body) => driverService.registerPushToken(body)
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Error fetching fresh driver profile', e);
    }
  };

  const login = async (identifier, password) => {
    try {
      const res = await driverService.login({ identifier, password });
      if (res.data?.success) {
        const { token: jwtToken, user: userData, driver: driverData } = res.data;
        setToken(jwtToken);
        setUser(userData);
        setDriver(driverData || userData.driverInfo || null);
        setIsOnline(Boolean(driverData?.isOnline));

        await AsyncStorage.setItem('@driver_jwt_token', jwtToken);
        await AsyncStorage.setItem('@driver_user_data', JSON.stringify(userData));
        if (driverData) {
          await AsyncStorage.setItem('@driver_profile_data', JSON.stringify(driverData));
        }

        registerPushTokenWithBackend({
          post: (url, body) => driverService.registerPushToken(body)
        }).catch(() => {});

        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (e) {
      const msg = e.response?.data?.message || 'Invalid credentials or connection error';
      return { success: false, message: msg };
    }
  };

  const register = async (registrationData) => {
    try {
      const res = await driverService.register(registrationData);
      if (res.data?.success) {
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Registration failed' };
    } catch (e) {
      const msg = e.response?.data?.message || 'Registration failed';
      return { success: false, message: msg };
    }
  };

  const toggleOnlineStatus = async (newStatus) => {
    try {
      const res = await driverService.toggleStatus(newStatus);
      if (res.data?.success) {
        setIsOnline(newStatus);
        if (driver) {
          const updated = { ...driver, isOnline: newStatus };
          setDriver(updated);
          await AsyncStorage.setItem('@driver_profile_data', JSON.stringify(updated));
        }
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      console.warn('Error toggling online status', e);
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      if (user?._id || driver?._id) {
        await clearDriverNotificationCache(user?._id || driver?._id);
      }
      await AsyncStorage.removeItem('@driver_jwt_token');
      await AsyncStorage.removeItem('@driver_user_data');
      await AsyncStorage.removeItem('@driver_profile_data');
    } catch (e) {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      setDriver(null);
      setIsOnline(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driver,
        token,
        isAuthenticated: Boolean(token && user),
        isOnline,
        isLoading,
        loading: isLoading,
        login,
        register,
        toggleOnlineStatus,
        fetchFreshProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
