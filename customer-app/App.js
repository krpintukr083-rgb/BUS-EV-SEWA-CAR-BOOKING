import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { enableFreeze } from 'react-native-screens';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { CustomerAuthProvider } from './src/context/CustomerAuthContext';
import { BookingProvider } from './src/context/BookingContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  initCustomerNotificationChannel,
  requestCustomerNotificationPermissions,
  setupCustomerPushTokenChangeListener
} from './src/services/notificationService';

export const customerNavigationRef = createNavigationContainerRef();

enableFreeze(false);

// Initialize notification channel early
initCustomerNotificationChannel();

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font
  });

  useEffect(() => {
    // Request Android 13+ Notification Permissions
    requestCustomerNotificationPermissions();

    // Setup push token rotation listener
    const tokenSub = setupCustomerPushTokenChangeListener();

    // Handle Foreground Notification Receipt
    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      console.log('[CUSTOMER_NOTIFICATION_RECEIVED_DEBUG]', {
        title: notification?.request?.content?.title,
        body: notification?.request?.content?.body,
        data: notification?.request?.content?.data,
      });
    });

    // Handle Tap on Notification
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response?.notification?.request?.content?.data;
      console.log('[CUSTOMER_NOTIFICATION_TAPPED_DEBUG]', data);
      if (data && customerNavigationRef.isReady()) {
        if (data.bookingId) {
          customerNavigationRef.navigate('BookingDetails', { bookingId: data.bookingId });
        } else {
          customerNavigationRef.navigate('MainTabs', { screen: 'MyBookings' });
        }
      }
    });

    return () => {
      tokenSub?.remove?.();
      receivedSub?.remove?.();
      responseSub?.remove?.();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider initialWindowMetrics={initialWindowMetrics} style={styles.container}>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#1d4ed8" />
        <CustomerAuthProvider>
          <BookingProvider>
            <NavigationContainer ref={customerNavigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </BookingProvider>
        </CustomerAuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center'
  }
});
