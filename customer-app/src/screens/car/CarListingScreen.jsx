import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import { COLORS } from '../../constants/colors';
import { getPrimaryVehicleImage } from '../../utils/imageUrl';
import { formatBookingDate } from '../../utils/bookingDate';

const CarListingScreen = ({ navigation, route }) => {
  const { updateDraft, bookingDraft } = useBooking();
  const navigationSchedule = route.params?.selectedSchedule || route.params?.schedule;
  const initialSchedule = navigationSchedule || bookingDraft.schedule || bookingDraft.vehicle?.schedule || null;
  const [scheduleError, setScheduleError] = useState('');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isInstant = bookingDraft?.bookingMode === 'INSTANT';

  const fetchCars = async (schedule = null) => {

    const scheduleId = schedule ? String(schedule._id) : undefined;
    const origin = schedule?.origin || route.params?.origin || bookingDraft?.pickupLocation || '';
    const destination = schedule?.destination || route.params?.destination || bookingDraft?.dropLocation || '';
    const travelDate = schedule?.travelDate || route.params?.travelDate || bookingDraft?.travelDate;
    const scheduleVehicleId = schedule?.vehicle?._id || schedule?.vehicle || route.params?.vehicleId;
    try {
      const res = await customerService.getVehicles(
        'car',
        origin,
        destination,
        travelDate,
        !isInstant,
        scheduleId
      );
      if (res.success) {
        const listedCars = res.data || [];
        setCars(scheduleVehicleId && !isInstant
          ? listedCars.filter(car => String(car._id) === String(scheduleVehicleId))
          : listedCars);
        setScheduleError('');
      } else {
        setCars([]);
        setScheduleError(res.message || 'Unable to load vehicles for this Car schedule.');
      }
    } catch (err) {
      console.log('Error fetching cars:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  useEffect(() => {
    fetchCars(initialSchedule);
  }, []);

  const handleSelectCar = (car) => {
    const schedule = car.schedule;
    
    updateDraft({
      serviceType: 'Car',
      vehicle: car,
      baseFare: car.fareRate,
      totalFare: car.fareRate,
      pickupLocation: schedule?.origin || route.params?.origin || bookingDraft?.pickupLocation || '',
      dropLocation: schedule?.destination || route.params?.destination || bookingDraft?.dropLocation || '',
      scheduleId: schedule?._id || null,
      schedule: schedule || null,
      travelDate: schedule?.travelDate || route.params?.travelDate || bookingDraft?.travelDate || new Date().toISOString()
    });
    
    if (isInstant) {
      navigation.navigate('InstantBookingRoute', { serviceType: 'Car', carId: car._id });
    } else {
      navigation.navigate('CarDetails', {
        carId: car._id,
        ...(schedule ? { schedule } : {}),
        ...(schedule?._id ? { scheduleId: schedule._id } : {})
      });
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Car Listing" onBack={() => navigation.goBack()} />

      <View style={styles.subHeader}>
        <Text style={styles.carBanner}>🚗 Premium Sedans, SUVs & Chauffeur Cabs</Text>
      </View>



      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Loading available cars...</Text>
        </View>
      ) : (
        <FlatList
          data={cars}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCars(); }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {scheduleError || 'No eligible vehicles found.'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectCar(item)}
              activeOpacity={0.85}
            >
              <Image
                source={{
                  uri: getPrimaryVehicleImage(item, 'Car')
                }}
                style={styles.carImage}
              />

              <View style={styles.cardBody}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carName}>{item.vehicleName}</Text>
                    <Text style={styles.carModel}>
                      {item.vehicleNumber} • {item.vehicleModel} ({item.vehicleCategory})
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.farePrice}>₹{item.fareRate}</Text>
                    <Text style={styles.fareSub}>Estimated Total</Text>
                  </View>
                </View>

                {/* Specs Row */}
                <View style={styles.badgeRow}>
                  <View style={styles.specBadge}>
                    <Ionicons name="people-outline" size={14} color="#ea580c" />
                    <Text style={styles.specText}>{item.seatingCapacity} Seater</Text>
                  </View>
                  <View style={styles.specBadge}>
                    <Ionicons name="snow-outline" size={14} color="#ea580c" />
                    <Text style={styles.specText}>Climate AC</Text>
                  </View>
                  <View style={styles.specBadge}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#ea580c" />
                    <Text style={styles.specText}>Commercial Permit</Text>
                  </View>
                </View>

                <View style={styles.scheduleBox}>
                  {item.schedule ? (
                    <View>
                      <Text style={[styles.scheduleTitle, { color: COLORS.primary }]}>Scheduled</Text>
                      <Text style={styles.scheduleTime}>
                        {item.schedule.origin} → {item.schedule.destination}
                      </Text>
                      <Text style={styles.scheduleTime}>
                        {formatBookingDate(item.schedule.travelDate)} • {item.schedule.departureTime}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={[styles.scheduleTitle, { color: '#6b7280' }]}>Unscheduled</Text>
                    </View>
                  )}
                </View>

                {/* Route Snippet */}
                <View style={styles.routeBox}>
                  <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.schedule ? `${item.schedule.origin} → ${item.schedule.destination}` : 'Route Flexible'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.bookBtn} onPress={() => handleSelectCar(item)}>
                  <Text style={styles.bookBtnText}>Book Car</Text>
                  <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  subHeader: {
    backgroundColor: '#fff7ed',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa'
  },
  carBanner: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
    textAlign: 'center'
  },
  listContent: {
    padding: 16,
    paddingBottom: 30
  },
  schedulePicker: { flex: 1, padding: 16, gap: 10 },
  pickerTitle: { color: COLORS.darkNavy, fontSize: 17, fontWeight: '800' },
  pickerSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  scheduleList: { paddingBottom: 20 },
  scheduleOption: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10
  },
  selectedSchedule: {
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
    padding: 12
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, paddingVertical: 18, textAlign: 'center' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3
  },
  carImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f1f5f9'
  },
  cardBody: {
    padding: 16
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  carName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  carModel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  farePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ea580c'
  },
  fareSub: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  specText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c2410c'
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12
  },
  scheduleBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  scheduleTitle: { color: '#9a3412', fontSize: 12, fontWeight: '700' },
  scheduleTime: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  routeText: {
    fontSize: 12,
    color: '#334155',
    flex: 1
  },
  bookBtn: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8
  },
  bookBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary
  }
});

export default CarListingScreen;
