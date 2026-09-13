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

const EvSewaListingScreen = ({ navigation }) => {
  const { updateDraft } = useBooking();
  const [evs, setEvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvs = async () => {
    try {
      const res = await customerService.getEvSewa();
      if (res.success) {
        setEvs(res.data);
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
      pickupLocation: ev.pickupDropDetails?.pickupLocation || ev.route?.origin || 'Connaught Place, Delhi',
      dropLocation: ev.pickupDropDetails?.dropLocation || ev.route?.destination || 'Sector 62, Noida'
    });
    navigation.navigate('EvSewaDetails', { evId: ev._id });
  };

  return (
    <View style={styles.container}>
      <Header title="EV-Sewa Listing" onBack={() => navigation.goBack()} />

      <View style={styles.subHeader}>
        <Text style={styles.greenBanner}>🌿 100% Electric Rapid City Feeder Shuttles</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.success} />
          <Text style={styles.loadingText}>Loading EV-Sewa shuttles...</Text>
        </View>
      ) : (
        <FlatList
          data={evs}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvs(); }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectEv(item)}
              activeOpacity={0.85}
            >
              <Image
                source={{
                  uri: item.vehicleImages && item.vehicleImages.length > 0
                    ? item.vehicleImages[0]
                    : 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80'
                }}
                style={styles.evImage}
              />

              <View style={styles.cardBody}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evName}>{item.vehicleName}</Text>
                    <Text style={styles.evModel}>
                      {item.vehicleNumber} • {item.vehicleModel}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.farePrice}>₹{item.fareRate}</Text>
                    <Text style={styles.fareSub}>Per Passenger</Text>
                  </View>
                </View>

                {/* Battery & Range Badges */}
                <View style={styles.badgeRow}>
                  <View style={styles.specBadge}>
                    <Ionicons name="battery-charging" size={14} color="#059669" />
                    <Text style={styles.specText}>{item.evDetails?.batteryCapacity || '72 kWh'}</Text>
                  </View>
                  <View style={styles.specBadge}>
                    <Ionicons name="speedometer-outline" size={14} color="#059669" />
                    <Text style={styles.specText}>{item.evDetails?.rangeKm || 280} km Range</Text>
                  </View>
                  <View style={styles.specBadge}>
                    <Ionicons name="people-outline" size={14} color="#059669" />
                    <Text style={styles.specText}>{item.seatingCapacity} Seater</Text>
                  </View>
                </View>

                {/* Route Snippet */}
                <View style={styles.routeBox}>
                  <Ionicons name="git-commit-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.route?.origin || item.pickupDropDetails?.pickupLocation || 'City Center'} → {item.route?.destination || item.pickupDropDetails?.dropLocation || 'Tech Park'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.bookBtn} onPress={() => handleSelectEv(item)}>
                  <Text style={styles.bookBtnText}>Book EV-Sewa</Text>
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
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0'
  },
  greenBanner: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
    textAlign: 'center'
  },
  listContent: {
    padding: 16,
    paddingBottom: 30
  },
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
  evImage: {
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
  farePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669'
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
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  specText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46'
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
  routeText: {
    fontSize: 12,
    color: '#334155',
    flex: 1
  },
  bookBtn: {
    backgroundColor: COLORS.success,
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

export default EvSewaListingScreen;
