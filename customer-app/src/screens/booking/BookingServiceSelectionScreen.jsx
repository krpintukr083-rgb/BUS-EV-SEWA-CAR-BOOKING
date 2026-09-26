import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import { COLORS } from '../../constants/colors';

const services = [
  { type: 'Bus', title: 'Bus', subtitle: 'Intercity and scheduled routes', icon: 'bus', color: COLORS.primary, statusKey: 'busService' },
  { type: 'EV-Sewa', title: 'EV-Sewa', subtitle: 'Electric city shuttle', icon: 'leaf', color: COLORS.success, statusKey: 'evSewaService' },
  { type: 'Car', title: 'Car', subtitle: 'Sedan and SUV service', icon: 'car-sport', color: '#ea580c', statusKey: 'carService' }
];

const BookingServiceSelectionScreen = ({ route, navigation }) => {
  const bookingMode = route.params?.bookingMode === 'INSTANT' ? 'INSTANT' : 'NORMAL';
  const { updateDraft } = useBooking();
  const [serviceStatus, setServiceStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    customerService.getServicesStatus()
      .then(response => {
        if (mounted && response?.success) setServiceStatus(response.data);
      })
      .catch(error => {
        console.log('Error fetching service availability:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const chooseService = service => {
    if (serviceStatus?.[service.statusKey] && serviceStatus[service.statusKey] !== 'Active') {
      Alert.alert('Service Inactive', `${service.title} booking is currently inactive.`);
      return;
    }

    updateDraft({
      bookingMode,
      serviceType: service.type,
      vehicle: null,
      baseFare: 0,
      totalFare: 0,
      pickupLocation: '',
      dropLocation: '',
      schedule: null,
      scheduleId: null,
      selectedSeats: [],
      passengerCount: 1,
      passengerDetails: [{ name: '', phone: '', age: '', gender: 'Male' }],
      ...(bookingMode === 'INSTANT'
        ? { travelDate: new Date().toISOString().split('T')[0] }
        : {})
    });

    if (bookingMode === 'INSTANT') {
      navigation.navigate('InstantBookingRoute', { serviceType: service.type });
    } else if (service.type === 'Bus') {
      navigation.navigate('BusSearch');
    } else if (service.type === 'EV-Sewa') {
      navigation.navigate('EvSewaListing');
    } else {
      navigation.navigate('CarListing');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={bookingMode === 'INSTANT' ? 'Instant Booking' : 'Schedule Booking'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Text style={styles.heading}>Select your service</Text>
        <Text style={styles.subheading}>
          {bookingMode === 'INSTANT'
            ? 'Choose a service, enter your route, and see currently available vehicles.'
            : 'Choose the service for your planned journey.'}
        </Text>
        {loading && !serviceStatus ? (
          <ActivityIndicator style={styles.loading} size="large" color={COLORS.primary} />
        ) : services.map(service => (
          <TouchableOpacity
            key={service.type}
            style={styles.serviceCard}
            onPress={() => chooseService(service)}
            activeOpacity={0.85}
          >
            <View style={[styles.icon, { backgroundColor: `${service.color}15` }]}>
              <Ionicons name={service.icon} size={24} color={service.color} />
            </View>
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  heading: { color: COLORS.darkNavy, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subheading: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 20 },
  loading: { marginTop: 40 },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  serviceCopy: { flex: 1 },
  serviceTitle: { color: COLORS.darkNavy, fontSize: 15, fontWeight: '800' },
  serviceSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 }
});

export default BookingServiceSelectionScreen;
