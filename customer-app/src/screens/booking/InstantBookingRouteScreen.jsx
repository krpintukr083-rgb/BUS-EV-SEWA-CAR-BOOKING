import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const InstantBookingRouteScreen = ({ navigation, route }) => {
  const { user } = useCustomerAuth();
  const { updateDraft, bookingDraft } = useBooking();
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);

  const handleContinue = () => {
    if (!pickupLocation.trim() || !dropLocation.trim()) {
      Alert.alert('Error', 'Please enter both pickup and destination locations.');
      return;
    }
    updateDraft({
      bookingMode: 'INSTANT',
      serviceType: route.params?.serviceType || 'Any',
      ...(route.params?.carId ? { vehicle: { ...bookingDraft?.vehicle, _id: route.params.carId } } : {}),
      pickupLocation: pickupLocation.trim(),
      dropLocation: dropLocation.trim(),
      passengerCount: passengerCount,
      travelDate: new Date().toISOString()
    });
    navigation.navigate('PassengerDetails');
  };

  const increment = () => setPassengerCount(prev => prev + 1);
  const decrement = () => setPassengerCount(prev => Math.max(1, prev - 1));

  return (
    <View style={styles.container}>
      <Header title="Instant Booking" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <Ionicons name="flash" size={25} color={COLORS.primary} />
          <View style={styles.introCopy}>
            <Text style={styles.title}>Book a Ride Instantly</Text>
            <Text style={styles.subtitle}>Enter your pickup and destination. We will notify all available drivers nearby.</Text>
          </View>
        </View>

        <Input label="From / Pickup Location" placeholder="e.g. Nepalgunj" value={pickupLocation} onChangeText={setPickupLocation} />
        <Input label="To / Destination" placeholder="e.g. Kathmandu" value={dropLocation} onChangeText={setDropLocation} />
        
        <View style={styles.counterContainer}>
          <Text style={styles.counterLabel}>How many passengers?</Text>
          <View style={styles.counterControls}>
            <TouchableOpacity onPress={decrement} style={styles.counterBtn}>
              <Ionicons name="remove" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{passengerCount}</Text>
            <TouchableOpacity onPress={increment} style={styles.counterBtn}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Button 
            title="Continue" 
            onPress={handleContinue} 
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  introCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#eff6ff', borderRadius: 12, marginBottom: 18 },
  introCopy: { flex: 1, marginLeft: 10 },
  title: { color: COLORS.darkNavy, fontSize: 16, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  counterContainer: { marginTop: 12, padding: 14, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterLabel: { fontSize: 14, fontWeight: '700', color: COLORS.darkNavy },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  counterValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary, width: 24, textAlign: 'center' }
});

export default InstantBookingRouteScreen;
