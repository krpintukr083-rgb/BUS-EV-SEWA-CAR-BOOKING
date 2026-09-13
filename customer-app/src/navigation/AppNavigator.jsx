import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import BottomTabNavigator from './BottomTabNavigator';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// Bus Screens
import BusSearchScreen from '../screens/bus/BusSearchScreen';
import BusListingScreen from '../screens/bus/BusListingScreen';
import BusDetailsScreen from '../screens/bus/BusDetailsScreen';
import BusSeatSelectionScreen from '../screens/bus/BusSeatSelectionScreen';

// EV-Sewa Screens
import EvSewaListingScreen from '../screens/ev-sewa/EvSewaListingScreen';
import EvSewaDetailsScreen from '../screens/ev-sewa/EvSewaDetailsScreen';

// Car Screens
import CarListingScreen from '../screens/car/CarListingScreen';
import CarDetailsScreen from '../screens/car/CarDetailsScreen';

// Booking Funnel Screens
import PickupDropScreen from '../screens/booking/PickupDropScreen';
import PassengerDetailsScreen from '../screens/booking/PassengerDetailsScreen';
import FareSummaryScreen from '../screens/booking/FareSummaryScreen';
import PaymentScreen from '../screens/booking/PaymentScreen';
import BookingConfirmationScreen from '../screens/booking/BookingConfirmationScreen';
import DigitalTicketScreen from '../screens/booking/DigitalTicketScreen';

// Bookings & History Screens
import MyBookingsScreen from '../screens/bookings/MyBookingsScreen';
import BookingDetailsScreen from '../screens/bookings/BookingDetailsScreen';
import BookingCancellationScreen from '../screens/bookings/BookingCancellationScreen';
import BookingHistoryScreen from '../screens/bookings/BookingHistoryScreen';

// Account & Legal Screens
import CustomerProfileScreen from '../screens/profile/CustomerProfileScreen';
import CustomerSupportScreen from '../screens/support/CustomerSupportScreen';
import InsuranceScreen from '../screens/insurance/InsuranceScreen';
import TermsScreen from '../screens/policies/TermsScreen';
import PrivacyScreen from '../screens/policies/PrivacyScreen';
import RefundPolicyScreen from '../screens/policies/RefundPolicyScreen';
import InsuranceDisclaimerScreen from '../screens/policies/InsuranceDisclaimerScreen';

import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useCustomerAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      ) : (
        // Authenticated App Stack
        <>
          {/* Main 4-Tab Bottom Navigation */}
          <Stack.Screen name="Main" component={BottomTabNavigator} />

          {/* Bus Service Flow */}
          <Stack.Screen name="BusSearch" component={BusSearchScreen} />
          <Stack.Screen name="BusListing" component={BusListingScreen} />
          <Stack.Screen name="BusDetails" component={BusDetailsScreen} />
          <Stack.Screen name="BusSeatSelection" component={BusSeatSelectionScreen} />

          {/* EV-Sewa Service Flow */}
          <Stack.Screen name="EvSewaListing" component={EvSewaListingScreen} />
          <Stack.Screen name="EvSewaDetails" component={EvSewaDetailsScreen} />

          {/* Car Service Flow */}
          <Stack.Screen name="CarListing" component={CarListingScreen} />
          <Stack.Screen name="CarDetails" component={CarDetailsScreen} />

          {/* Common Booking & Checkout Flow */}
          <Stack.Screen name="PickupDrop" component={PickupDropScreen} />
          <Stack.Screen name="PassengerDetails" component={PassengerDetailsScreen} />
          <Stack.Screen name="FareSummary" component={FareSummaryScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          <Stack.Screen name="DigitalTicket" component={DigitalTicketScreen} />

          {/* Bookings & History */}
          <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
          <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
          <Stack.Screen name="BookingCancellation" component={BookingCancellationScreen} />
          <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />

          {/* Account, Support & Policies */}
          <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
          <Stack.Screen name="CustomerSupport" component={CustomerSupportScreen} />
          <Stack.Screen name="Insurance" component={InsuranceScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="RefundPolicy" component={RefundPolicyScreen} />
          <Stack.Screen name="InsuranceDisclaimer" component={InsuranceDisclaimerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
