import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import { getRouteSegmentFare } from '../../utils/routeFares';

const serviceIcons = { Bus: 'bus', 'EV-Sewa': 'leaf', Car: 'car-sport' };

const InstantBookingRouteScreen = ({ route, navigation }) => {
  const serviceType = route.params?.serviceType || 'Bus';
  const { updateDraft } = useBooking();
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const findVehicles = async () => {
    if (!pickupLocation.trim() || !dropLocation.trim()) {
      setErrorMessage('Enter both pickup and destination locations.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSearched(true);
    try {
      const response = await customerService.getInstantBookingAvailability({
        serviceType,
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim()
      });
      if (!response.success) throw new Error(response.message || 'Unable to find available vehicles.');
      setVehicles(response.data || []);
    } catch (error) {
      setVehicles([]);
      setErrorMessage(error.response?.data?.message || error.message || 'Unable to find available vehicles.');
    } finally {
      setLoading(false);
    }
  };

  const selectVehicle = vehicle => {
    updateDraft({
      serviceType,
      bookingMode: 'INSTANT',
      vehicle,
      baseFare: getRouteSegmentFare(vehicle.route, pickupLocation, dropLocation) ?? vehicle.fareRate ?? vehicle.fare ?? 0,
      totalFare: getRouteSegmentFare(vehicle.route, pickupLocation, dropLocation) ?? vehicle.fareRate ?? vehicle.fare ?? 0,
      pickupLocation: pickupLocation.trim(),
      dropLocation: dropLocation.trim(),
      travelDate: new Date().toISOString().split('T')[0],
      schedule: null,
      scheduleId: null,
      selectedSeats: [],
      passengerCount: 1,
      passengerDetails: [{ name: '', phone: '', age: '', gender: 'Male' }]
    });
    navigation.navigate('PassengerDetails');
  };

  return (
    <View style={styles.container}>
      <Header title={`Instant ${serviceType} Booking`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <Ionicons name={serviceIcons[serviceType]} size={25} color={COLORS.primary} />
          <View style={styles.introCopy}>
            <Text style={styles.title}>Enter your route</Text>
            <Text style={styles.subtitle}>Manually enter pickup and destination. No map or device location is used.</Text>
          </View>
        </View>

        <Input label="From / Pickup Location" placeholder="e.g. Delhi" value={pickupLocation} onChangeText={setPickupLocation} />
        <Input label="To / Destination" placeholder="e.g. Jaipur" value={dropLocation} onChangeText={setDropLocation} />
        <Button title={loading ? 'Finding Available Vehicles...' : 'Find Available Vehicles'} onPress={findVehicles} loading={loading} disabled={loading} />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {loading ? <ActivityIndicator style={styles.loading} size="large" color={COLORS.primary} /> : null}
        {!loading && searched && !errorMessage && vehicles.length === 0 ? (
          <Text style={styles.empty}>No eligible {serviceType} vehicle and driver are available for this route right now.</Text>
        ) : null}

        {vehicles.map(vehicle => {
          const fare = getRouteSegmentFare(vehicle.route, pickupLocation, dropLocation) ?? vehicle.fareRate ?? vehicle.fare ?? 0;
          return (
            <TouchableOpacity key={vehicle._id} style={styles.vehicleCard} onPress={() => selectVehicle(vehicle)} activeOpacity={0.85}>
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleIcon}>
                  <Ionicons name={serviceIcons[serviceType]} size={23} color={COLORS.primary} />
                </View>
                <View style={styles.vehicleIdentity}>
                  <Text style={styles.vehicleName}>{vehicle.vehicleName || vehicle.vehicleCategory || serviceType}</Text>
                  <Text style={styles.vehicleMeta}>{vehicle.vehicleNumber} · {vehicle.vehicleModel || vehicle.vehicleCategory}</Text>
                </View>
                <Text style={styles.fare}>₹{fare}</Text>
              </View>
              <Text style={styles.route}>{pickupLocation.trim()} → {dropLocation.trim()}</Text>
              <View style={styles.availabilityRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.availableText}>{vehicle.availability || 'Available Now'}</Text>
                <Text style={styles.driverText}>Driver: {vehicle.instantDriver?.name || 'Assigned driver'}</Text>
              </View>
              <Text style={styles.selectText}>Select vehicle and continue</Text>
            </TouchableOpacity>
          );
        })}
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
  error: { color: COLORS.danger, fontSize: 13, marginTop: 12 },
  loading: { marginVertical: 22 },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 24, lineHeight: 20 },
  vehicleCard: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginTop: 14 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  vehicleIdentity: { flex: 1 },
  vehicleName: { color: COLORS.darkNavy, fontSize: 14, fontWeight: '800' },
  vehicleMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  fare: { color: COLORS.primary, fontSize: 17, fontWeight: '900', marginLeft: 8 },
  route: { color: COLORS.darkNavy, fontSize: 13, fontWeight: '700', marginTop: 13 },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 11, gap: 5 },
  availableText: { color: COLORS.success, fontSize: 12, fontWeight: '800' },
  driverText: { color: COLORS.textSecondary, fontSize: 12, marginLeft: 7 },
  selectText: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 12, textAlign: 'right' }
});

export default InstantBookingRouteScreen;
