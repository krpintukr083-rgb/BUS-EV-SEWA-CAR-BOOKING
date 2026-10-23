import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  const tabBarStyle = useMemo(() => {
    // Obtain real bottom inset from react-native-safe-area-context.
    // On gesture navigation, insets.bottom is typically 24-34dp; on 3-button navigation, 48dp.
    // When insets.bottom is 0 (legacy mode or hardware nav), default to 8dp padding.
    const bottomInset = Math.max(insets.bottom, 0);
    const paddingBottom = bottomInset > 0 ? bottomInset + 4 : 8;
    const height = 56 + paddingBottom;

    return {
      backgroundColor: '#0F1B3D',
      borderTopColor: '#0F1B3D',
      borderTopWidth: 1,
      height,
      paddingBottom,
      paddingTop: 6,
    };
  }, [insets.bottom]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
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
