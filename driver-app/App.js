import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from './src/state/LanguageContext';
import { AuthProvider } from './src/state/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initNotificationChannel, requestNotificationPermissions, setupPushTokenChangeListener } from './src/services/notificationService';
import driverService from './src/services/driverService';

export const navigationRef = createNavigationContainerRef();

// Initialize High Importance Android Notification Channel immediately at module load
// so it is available before the app receives any background pushes.
initNotificationChannel();

export default function App() {
  useEffect(() => {
    // Request Permissions
    requestNotificationPermissions();

    // Setup push token refresh / change listener
    const tokenSub = setupPushTokenChangeListener(driverService);

    // Handle Tap on Notification
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && navigationRef.isReady()) {
        const targetBookingId = data.bookingId;
        navigationRef.navigate('MainTabs', {
          screen: 'Requests',
          params: { bookingId: targetBookingId }
        });
      }
    });

    return () => {
      subscription?.remove?.();
      tokenSub?.remove?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="light" backgroundColor="#0B0F19" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
