import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import { useAuth } from '../state/AuthContext';

// Navigation Stacks & Screens
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ActiveRideScreen from '../screens/ride/ActiveRideScreen';
import BusConfirmationScreen from '../screens/booking/BusConfirmationScreen';
import EarningsScreen from '../screens/earnings/EarningsScreen';
import DriverKYCScreen from '../screens/documents/DriverKYCScreen';
import VehicleDetailsScreen from '../screens/vehicle/VehicleDetailsScreen';
import VehicleSubmissionScreen from '../screens/vehicle/VehicleSubmissionScreen';
import EVHubScreen from '../screens/ev/EVHubScreen';
import RideHistoryScreen from '../screens/history/RideHistoryScreen';
import SafetyScreen from '../screens/safety/SafetyScreen';
import SupportScreen from '../screens/support/SupportScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bgDark },
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      ) : (
        // Authenticated Driver Stack
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
          <Stack.Screen name="BusConfirmation" component={BusConfirmationScreen} />
          <Stack.Screen name="Earnings" component={EarningsScreen} />
          <Stack.Screen name="DriverKYC" component={DriverKYCScreen} />
          <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
          <Stack.Screen name="VehicleSubmission" component={VehicleSubmissionScreen} />
          <Stack.Screen name="EVHub" component={EVHubScreen} />
          <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
          <Stack.Screen name="Safety" component={SafetyScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
