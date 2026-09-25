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

const BusListingScreen = ({ navigation, route }) => {
  const { from = '', to = '' } = route.params || {};
  const { updateDraft, bookingDraft } = useBooking();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchBuses = async (customFrom = from, customTo = to) => {
    try {
      setErrorMessage('');
      const travelDate = bookingDraft?.travelDate || new Date().toISOString().split('T')[0];
      const res = await customerService.getSchedules(customFrom, customTo, travelDate);
      if (res && res.success) {
        setBuses(res.data || []);
      } else {
        setBuses([]);
      }
    } catch (err) {
      console.log('Error fetching buses from API:', err);
      setErrorMessage(err.response?.data?.message || 'Network error fetching buses.');
      setBuses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, [from, to]);

  const handleSelectBus = (schedule) => {
    const bus = schedule.vehicle;
    updateDraft({
      serviceType: 'Bus',
      vehicle: bus,
      baseFare: schedule.fareRate || bus.fareRate,
      pickupLocation: schedule.origin || bus.route?.origin || from || 'Delhi ISBT Kashmere Gate',
      dropLocation: schedule.destination || bus.route?.destination || to || 'Jaipur Sindhi Camp',
      scheduleId: schedule._id
    });
    navigation.navigate('BusDetails', { busId: bus._id, bus, schedule });
  };

  const getFirstStop = (points, fallback) => {
    if (Array.isArray(points) && points.length > 0) return points[0];
    if (typeof points === 'string' && points.trim()) return points;
    return fallback;
  };

  return (
    <View style={styles.container}>
      <Header
        title="Bus Listing"
        onBack={() => navigation.goBack()}
        rightIcon="refresh-outline"
        rightAction={() => { setLoading(true); fetchBuses(); }}
      />

      {/* Search Route Bar */}
      <View style={styles.routeHeader}>
        <View style={styles.routePill}>
          <Ionicons name="swap-horizontal" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.routeText} numberOfLines={1}>
            {from || 'All Origins'} → {to || 'All Destinations'}
          </Text>
        </View>
        <Text style={styles.countText}>{buses.length} Coaches Available</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching available coaches from database...</Text>
        </View>
      ) : (
        <FlatList
          data={buses}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchBuses(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bus-outline" size={54} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Buses Available</Text>
              <Text style={styles.emptySubtitle}>
                {from || to
                  ? `No active coaches currently matching route "${from} → ${to}".`
                  : 'No active bus coaches currently found in database.'}
              </Text>
              <TouchableOpacity
                style={styles.modifySearchBtn}
                onPress={() => {
                  setLoading(true);
                  fetchBuses('', '');
                }}
              >
                <Text style={styles.modifySearchBtnText}>Show All Available Buses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modifySearchBtn, { marginTop: 10, backgroundColor: '#eff6ff' }]}
                onPress={() => navigation.navigate('BusSearch')}
              >
                <Text style={[styles.modifySearchBtnText, { color: COLORS.primary }]}>Modify Route Search</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const vehicle = item.vehicle || {};
            return (
              <TouchableOpacity
                style={styles.busCard}
                onPress={() => handleSelectBus(item)}
                activeOpacity={0.88}
              >
                {/* Bus Image Banner */}
                <Image
                  source={{
                    uri: getPrimaryVehicleImage(vehicle, 'Bus')
                  }}
                  style={styles.busImage}
                />

                <View style={styles.cardBody}>
                  {/* Header Row: Bus Name & Price */}
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.busName} numberOfLines={1}>
                        {vehicle.vehicleName || 'Bus'}
                      </Text>
                      <Text style={styles.busSub}>
                        {vehicle.vehicleNumber} • {vehicle.busDetails?.busType || vehicle.vehicleCategory || 'Transport'}
                      </Text>
                    </View>
                    <View style={styles.farePill}>
                      <Text style={styles.fareAmount}>₹{item.fareRate || vehicle.fareRate}</Text>
                      <Text style={styles.fareSub}>Per Seat</Text>
                    </View>
                  </View>

                  {/* Schedule Timings */}
                  <View style={{ marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary }}>
                        Travel Date: {item.travelDate ? new Date(item.travelDate).toDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>
                        Departure: {item.departureTime || '—'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={16} color={COLORS.warning} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>
                        Arrival: {item.arrivalTime || '—'}
                      </Text>
                    </View>
                  </View>
                  </View>

                  {/* Route Details */}
                  <View style={styles.routeBox}>
                    <View style={styles.stopRow}>
                      <Ionicons name="radio-button-on" size={14} color={COLORS.primary} />
                      <Text style={styles.stopText} numberOfLines={1}>
                        Boarding: {getFirstStop(vehicle.route?.boardingPoints, item.origin || vehicle.route?.origin || vehicle.pickupDropDetails?.pickupLocation || 'Delhi ISBT')}
                      </Text>
                    </View>
                    <View style={styles.stopRow}>
                      <Ionicons name="location" size={14} color="#ef4444" />
                      <Text style={styles.stopText} numberOfLines={1}>
                        Dropping: {getFirstStop(vehicle.route?.droppingPoints, item.destination || vehicle.route?.destination || vehicle.pickupDropDetails?.dropLocation || 'Jaipur Sindhi Camp')}
                      </Text>
                    </View>
                  </View>

                  {/* Footer Row: Available seats & View Details Button */}
                  <View style={styles.cardFooter}>
                    <View style={styles.seatsBadge}>
                      <Ionicons name="people-outline" size={14} color="#059669" />
                      <Text style={styles.seatsText}>
                        {vehicle.busDetails?.availableSeats || vehicle.seatingCapacity || 36} Seats Left
                      </Text>
                    </View>

                    <View style={styles.selectBtn}>
                      <Text style={styles.selectBtnText}>View Bus</Text>
                      <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
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
  routeHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: '65%'
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  countText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.darkNavy,
    marginTop: 12
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  modifySearchBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  modifySearchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  busCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3
  },
  busImage: {
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
  busName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  busSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  farePill: {
    alignItems: 'flex-end',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  fareAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary
  },
  fareSub: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  routeBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    gap: 6
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stopText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  seatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  seatsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6
  },
  selectBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  }
});

export default BusListingScreen;
