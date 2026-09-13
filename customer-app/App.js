import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { CustomerAuthProvider } from './src/context/CustomerAuthContext';
import { BookingProvider } from './src/context/BookingContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#1d4ed8" />
        <CustomerAuthProvider>
          <BookingProvider>
            <NavigationContainer>
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
