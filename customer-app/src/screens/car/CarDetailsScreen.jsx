import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import VehicleImageSlider from '../../components/VehicleImageSlider';

const CarDetailsScreen = ({ route, navigation }) => {
  const { carId } = route.params || {};
  const { bookingDraft, updateDraft } = useBooking();
  const initialCar = bookingDraft.vehicle?._id === carId ? bookingDraft.vehicle : null;
  const [car, setCar] = useState(initialCar);
  const [loading, setLoading] = useState(!initialCar);

  useEffect(() => {
    if (carId && (!car || car._id !== carId)) {
      const fetchDetail = async () => {
        setLoading(true);
        try {
          const res = await customerService.getCarDetails(carId);
          if (res.success) {
            setCar(res.data);
            updateDraft({
              vehicle: res.data,
              baseFare: res.data.fareRate,
              totalFare: res.data.fareRate
            });
          }
        } catch (err) {
          console.log('Error fetching car details:', err);
          setCar(null);
        } finally {
          setLoading(false);
        }
      };
      fetchDetail();
    }
  }, [carId]);

  if (loading || (carId && car?._id !== carId)) {
    return (
      <View style={styles.container}>
        <Header title="Car Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Loading vehicle specifications...</Text>
        </View>
      </View>
    );
  }

  if (!car) {
    return (
      <View style={styles.container}>
        <Header title="Car Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={54} color={COLORS.textSecondary} />
          <Text style={styles.errorTitle}>Vehicle Not Found</Text>
          <Text style={styles.errorSub}>The requested vehicle details could not be loaded.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Back to Listing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBookNow = () => {
    updateDraft({
      serviceType: 'Car',
      vehicle: car,
      baseFare: car.fareRate,
      totalFare: car.fareRate,
      pickupLocation: car.pickupDropDetails?.pickupLocation || car.route?.origin || 'Airport T3, New Delhi',
      dropLocation: car.pickupDropDetails?.dropLocation || car.route?.destination || 'Cyber Hub, Gurugram',
      selectedSeats: [1],
      passengerDetails: [{ name: '', phone: '', age: '', gender: 'Male' }]
    });
    navigation.navigate('PickupDrop');
  };

  // Alias used by the footer Continue button
  const handleProceed = handleBookNow;

  return (
    <View style={styles.container}>
      <Header title="Car Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Vehicle images from the selected vehicle */}
        <View style={styles.imageContainer}>
          <VehicleImageSlider vehicle={car} type="Car" imageStyle={styles.heroImage} />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{car.vehicleCategory || 'Premium Sedan'}</Text>
          </View>
        </View>

        {/* Title and Fare Card */}
        <View style={styles.mainCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{car.vehicleName}</Text>
              <Text style={styles.subtitle}>{car.vehicleNumber} • {car.vehicleModel}</Text>
            </View>
            <View style={styles.fareBox}>
              <Text style={styles.fareAmount}>₹{car.fareRate}</Text>
              <Text style={styles.fareType}>Trip Base Fare</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Vehicle Highlights Grid */}
          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Ionicons name="people" size={18} color="#ea580c" />
              <Text style={styles.specLabel}>Capacity</Text>
              <Text style={styles.specVal}>{car.seatingCapacity} Passengers</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="car-sport" size={18} color="#ea580c" />
              <Text style={styles.specLabel}>Category</Text>
              <Text style={styles.specVal}>{car.vehicleCategory}</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
              <Text style={styles.specLabel}>Safety</Text>
              <Text style={styles.specVal}>Verified Driver</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="snow" size={18} color="#ea580c" />
              <Text style={styles.specLabel}>Comfort</Text>
              <Text style={styles.specVal}>Chauffeur AC</Text>
            </View>
          </View>
        </View>

        {/* Default Route / Boarding Points Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Default Operating Route</Text>
          <View style={styles.routeTimeline}>
            <View style={styles.timelineRow}>
              <View style={styles.originDot} />
              <View style={styles.timelineTextContainer}>
                <Text style={styles.timelineLabel}>Pickup / Boarding Area</Text>
                <Text style={styles.timelineValue}>
                  {car.pickupDropDetails?.pickupLocation || car.route?.origin || 'Airport T3 / City Hub'}
                </Text>
              </View>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineRow}>
              <View style={styles.destDot} />
              <View style={styles.timelineTextContainer}>
                <Text style={styles.timelineLabel}>Drop-off Destination</Text>
                <Text style={styles.timelineValue}>
                  {car.pickupDropDetails?.dropLocation || car.route?.destination || 'City Outstation / Drop Point'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Inclusions Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Service Inclusions</Text>
          <View style={styles.inclusionRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.inclusionText}>Clean, sanitized car with certified commercial driver</Text>
          </View>
          <View style={styles.inclusionRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.inclusionText}>Doorstep / Terminal pickup assistance</Text>
          </View>
          <View style={styles.inclusionRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.inclusionText}>Complimentary boot luggage space (up to 3 bags)</Text>
          </View>
          <View style={styles.inclusionRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.inclusionText}>Toll & state permits included in base rate</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <View style={styles.footerFare}>
          <Text style={styles.totalLabel}>Payable Fare</Text>
          <Text style={styles.totalValue}>₹{car.fareRate}</Text>
        </View>
        <TouchableOpacity style={styles.continueBtn} onPress={handleProceed}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16
  },
  heroImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#e2e8f0'
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3
  },
  fareBox: {
    alignItems: 'flex-end'
  },
  fareAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ea580c'
  },
  fareType: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  specItem: {
    width: '47%',
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 8,
    alignItems: 'flex-start'
  },
  specLabel: {
    fontSize: 10,
    color: '#c2410c',
    marginTop: 4
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 12
  },
  routeTimeline: {
    paddingLeft: 4
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginRight: 10
  },
  destDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ea580c',
    marginRight: 10
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#cbd5e1',
    marginLeft: 5,
    marginVertical: 2
  },
  timelineTextContainer: {
    flex: 1
  },
  timelineLabel: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  timelineValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  inclusionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    flex: 1
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  footerFare: {},
  totalLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ea580c'
  },
  continueBtn: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  continueBtnText: {
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
    marginTop: 10,
    color: COLORS.textSecondary
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    marginVertical: 12
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy,
    marginTop: 12
  },
  errorSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});

export default CarDetailsScreen;
