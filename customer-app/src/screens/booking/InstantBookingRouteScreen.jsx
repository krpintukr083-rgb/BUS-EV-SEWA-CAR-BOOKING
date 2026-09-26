import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const InstantBookingRouteScreen = ({ navigation }) => {
  const { user } = useCustomerAuth();
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBookNow = async () => {
    if (!pickupLocation.trim() || !dropLocation.trim()) {
      Alert.alert('Error', 'Please enter both pickup and destination locations.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        bookingMode: 'INSTANT',
        serviceType: 'Any', // Backend will broadcast to all eligible
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        travelDate: new Date().toISOString(),
        paymentMethod: 'Offline Cash',
        customer: {
          name: user?.name || 'Customer',
          phone: user?.phone || '0000000000'
        },
        passengerDetails: [{ name: user?.name || 'Customer', age: 30, gender: 'Male' }]
      };
      
      const response = await customerService.createBooking(payload);
      if (response && response.success) {
        navigation.navigate('DigitalTicket', { 
          bookingId: response.data._id || response.data.bookingId,
          isInstant: true 
        });
      } else {
        throw new Error(response?.message || 'Failed to create instant booking');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Booking Error', error.response?.data?.message || error.message || 'Unable to create instant booking at this time.');
    } finally {
      setLoading(false);
    }
  };

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

        <Input label="From / Pickup Location" placeholder="e.g. Delhi" value={pickupLocation} onChangeText={setPickupLocation} />
        <Input label="To / Destination" placeholder="e.g. Jaipur" value={dropLocation} onChangeText={setDropLocation} />
        
        <View style={{ marginTop: 20 }}>
          <Button 
            title={loading ? 'Creating Booking...' : 'Book Now'} 
            onPress={handleBookNow} 
            loading={loading} 
            disabled={loading} 
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
});

export default InstantBookingRouteScreen;
