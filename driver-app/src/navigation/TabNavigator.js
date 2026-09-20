import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useLanguage } from '../state/LanguageContext';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import BookingRequestsScreen from '../screens/booking/BookingRequestsScreen';
import BusConfirmationScreen from '../screens/booking/BusConfirmationScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import DriverProfileScreen from '../screens/profile/DriverProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgSurface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('dashboard'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size || 22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Requests"
        component={BookingRequestsScreen}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list-outline" size={size || 22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="BusConfirmation"
        component={BusConfirmationScreen}
        options={{
          tabBarLabel: 'OTP Confirm',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={size || 22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: t('driverWallet'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet-outline" size={size || 22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={DriverProfileScreen}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
