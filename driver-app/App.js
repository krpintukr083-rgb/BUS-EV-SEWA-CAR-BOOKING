import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from './src/state/LanguageContext';
import { AuthProvider } from './src/state/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initNotificationChannel, requestNotificationPermissions } from './src/services/notificationService';

export const navigationRef = createNavigationContainerRef();

export default function App() {
  useEffect(() => {
    // Initialize High Importance Android Notification Channel and Request Permissions
    initNotificationChannel();
    requestNotificationPermissions();

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
      subscription.remove();
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
