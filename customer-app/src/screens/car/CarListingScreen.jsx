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

const CarListingScreen = ({ navigation }) => {
  const { updateDraft } = useBooking();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCars = async () => {
    try {
      const res = await customerService.getCars();
      if (res.success) {
        setCars(res.data);
      }
    } catch (err) {
      console.log('Error fetching cars:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleSelectCar = (car) => {
    updateDraft({
      serviceType: 'Car',
      vehicle: car,
      baseFare: car.fareRate,
      totalFare: car.fareRate,
      pickupLocation: car.pickupDropDetails?.pickupLocation || car.route?.origin || 'IGI Airport T3, Delhi',
      dropLocation: car.pickupDropDetails?.dropLocation || car.route?.destination || 'Cyber City Gurugram'
    });
    navigation.navigate('CarDetails', { carId: car._id });
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectCar(item)}
              activeOpacity={0.85}
            >
              <Image
                source={{
                  uri: item.vehicleImages && item.vehicleImages.length > 0
                    ? item.vehicleImages[0]
                    : 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
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

                {/* Route Snippet */}
                <View style={styles.routeBox}>
                  <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.route?.origin || item.pickupDropDetails?.pickupLocation || 'Airport / Point Pickup'} → {item.route?.destination || item.pickupDropDetails?.dropLocation || 'Citywide / Outstation'}
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
