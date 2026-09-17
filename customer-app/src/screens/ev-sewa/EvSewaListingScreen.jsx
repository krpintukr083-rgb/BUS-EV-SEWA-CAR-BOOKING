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

const FALLBACK_EV_IMAGE =
  'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80';

const EvSewaListingScreen = ({ navigation }) => {
  const { updateDraft } = useBooking();
  const [evs, setEvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvs = async () => {
    try {
      const res = await customerService.getEvSewa();
      if (res.success) {
        setEvs(res.data || []);
      }
    } catch (err) {
      console.log('Error fetching EV-Sewa:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvs();
  }, []);

  const handleSelectEv = (ev) => {
    updateDraft({
      serviceType: 'EV-Sewa',
      vehicle: ev,
      baseFare: ev.fareRate,
      totalFare: ev.fareRate,
      pickupLocation: ev.pickupDropDetails?.pickupLocation || ev.route?.origin || 'Connaught Place, New Delhi',
      dropLocation: ev.pickupDropDetails?.dropLocation || ev.route?.destination || 'Sector 62 Electronic City, Noida',
      selectedSeats: [1],
      passengerDetails: [{ name: '', phone: '', age: '', gender: 'Male' }]
    });
    navigation.navigate('EvSewaDetails', { evId: ev._id });
  };

  return (
    <View style={styles.container}>
      <Header title="EV-Sewa Electric Shuttles" onBack={() => navigation.goBack()} />

      <View style={styles.subHeader}>
        <View style={styles.subHeaderPill}>
          <Ionicons name="leaf" size={14} color="#065f46" />
          <Text style={styles.greenBanner}>100% Electric Rapid City Feeder Shuttles</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.evBadge} />
          <Text style={styles.loadingText}>Loading EV-Sewa electric shuttles...</Text>
        </View>
      ) : evs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="flash-off-outline" size={54} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No EV-Sewa shuttles found</Text>
          <Text style={styles.emptySub}>Please check back soon for available electric routes.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchEvs}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={evs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              colors={[COLORS.evBadge]}
              tintColor={COLORS.evBadge}
              onRefresh={() => {
                setRefreshing(true);
                fetchEvs();
              }}
            />
          }
          renderItem={({ item }) => {
            const vehicleImg =
              item.vehicleImages && item.vehicleImages.length > 0 && item.vehicleImages[0]
                ? item.vehicleImages[0]
                : FALLBACK_EV_IMAGE;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleSelectEv(item)}
                activeOpacity={0.9}
              >
                {/* Vehicle Image with Badges */}
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: vehicleImg }}
                    style={styles.evImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlayTop}>
                    <View style={styles.electricBadge}>
                      <Ionicons name="flash" size={12} color="#ffffff" />
                      <Text style={styles.electricBadgeText}>100% Electric</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusBadgeText}>{item.vehicleStatus || 'Active'}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Content */}
                <View style={styles.cardBody}>
                  {/* Title & Fare Row */}
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.evName} numberOfLines={1}>
                        {item.vehicleName}
                      </Text>
                      <Text style={styles.evModel} numberOfLines={1}>
                        {item.vehicleModel || 'Electric Passenger Van'} • {item.vehicleNumber}
                      </Text>
                    </View>
                    <View style={styles.fareContainer}>
                      <Text style={styles.farePrice}>₹{item.fareRate}</Text>
                      <Text style={styles.fareSub}>Per Passenger</Text>
                    </View>
                  </View>

                  {/* EV Specification Pills */}
                  <View style={styles.badgeRow}>
                    <View style={styles.specBadge}>
                      <Ionicons name="people" size={13} color="#065f46" />
                      <Text style={styles.specText}>{item.seatingCapacity || 12} Seater</Text>
                    </View>
                    <View style={styles.specBadge}>
                      <Ionicons name="battery-charging" size={13} color="#065f46" />
                      <Text style={styles.specText}>
                        {item.evDetails?.batteryCapacity || '72 kWh'}
                      </Text>
                    </View>
                    <View style={styles.specBadge}>
                      <Ionicons name="speedometer-outline" size={13} color="#065f46" />
                      <Text style={styles.specText}>
                        {item.evDetails?.rangeKm || 280} km Range
                      </Text>
                    </View>
                  </View>

                  {/* Rapid Corridor Route Preview */}
                  <View style={styles.routeBox}>
                    <Ionicons name="git-commit-outline" size={16} color={COLORS.evBadge} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {item.route?.origin || item.pickupDropDetails?.pickupLocation || 'Origin Station'}{' '}
                      →{' '}
                      {item.route?.destination || item.pickupDropDetails?.dropLocation || 'Destination Terminal'}
                    </Text>
                  </View>

                  {/* Driver Assignment details if available */}
                  {item.assignedDriver && (
                    <View style={styles.driverRow}>
                      <Ionicons name="person-circle-outline" size={15} color={COLORS.textSecondary} />
                      <Text style={styles.driverText} numberOfLines={1}>
                        Driver: {item.assignedDriver.name || 'Assigned Chauffeur'}
                      </Text>
                    </View>
                  )}

                  {/* Book Button */}
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => handleSelectEv(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bookBtnText}>Book EV-Sewa</Text>
                    <Ionicons name="arrow-forward" size={15} color="#ffffff" />
                  </TouchableOpacity>
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
  subHeader: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0'
  },
  subHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  greenBanner: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46'
  },
  listContent: {
    padding: 16,
    paddingBottom: 36
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#f1f5f9'
  },
  evImage: {
    width: '100%',
    height: '100%'
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  electricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  electricBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981'
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff'
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
  evName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  evModel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  fareContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  farePrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#059669'
  },
  fareSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#065f46'
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  specText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46'
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  routeText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    flex: 1
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2
  },
  driverText: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  bookBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  bookBtnText: {
    fontSize: 14,
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
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginTop: 12
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  retryBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  }
});

export default EvSewaListingScreen;

