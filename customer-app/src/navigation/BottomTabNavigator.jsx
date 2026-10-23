import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import MyBookingsScreen from '../screens/bookings/MyBookingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import CustomerProfileScreen from '../screens/profile/CustomerProfileScreen';
import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
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
      borderTopWidth: 1,
      borderTopColor: '#0F1B3D',
      height,
      paddingBottom,
      paddingTop: 6
    };
  }, [insets.bottom]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyBookingsTab') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="MyBookingsTab"
        component={MyBookingsScreen}
        options={{ tabBarLabel: 'My Bookings' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarLabel: 'Notifications' }}
      />
      <Tab.Screen
        name="Profile"
        component={CustomerProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
