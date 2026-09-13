import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import { useBooking } from '../../context/BookingContext';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const EvSewaDetailsScreen = ({ navigation, route }) => {
  const { evId } = route.params || {};
  const { updateDraft } = useBooking();
  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await customerService.getEvSewaDetails(evId);
        if (res.success) {
          setEv(res.data);
          updateDraft({
            serviceType: 'EV-Sewa',
            vehicle: res.data,
            baseFare: res.data.fareRate,
            totalFare: res.data.fareRate,
            pickupLocation: res.data.pickupDropDetails?.pickupLocation || res.data.route?.origin || 'Connaught Place',
            dropLocation: res.data.pickupDropDetails?.dropLocation || res.data.route?.destination || 'Noida Sector 62'
          });
        }
      } catch (err) {
        console.log('Error fetching EV details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (evId) {
      fetchDetails();
    }
  }, [evId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="EV-Sewa Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.success} />
          <Text style={styles.loadingText}>Loading EV specs...</Text>
        </View>
      </View>
    );
  }

  if (!ev) {
    return (
      <View style={styles.container}>
        <Header title="EV-Sewa Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text>Vehicle details not found.</Text>
        </View>
      </View>
    );
  }

  const handleBookNow = () => {
    navigation.navigate('PickupDrop');
  };

  return (
    <View style={styles.container}>
      <Header title="EV-Sewa Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image
          source={{
            uri: ev.vehicleImages && ev.vehicleImages.length > 0
              ? ev.vehicleImages[0]
              : 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80'
          }}
          style={styles.heroImage}
        />

        <View style={styles.contentCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.evTitle}>{ev.vehicleName}</Text>
              <Text style={styles.evReg}>Reg: {ev.vehicleNumber}</Text>
            </View>
            <View style={styles.farePill}>
              <Text style={styles.farePrice}>₹{ev.fareRate}</Text>
              <Text style={styles.fareSub}>Per Passenger</Text>
            </View>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Battery Capacity</Text>
              <Text style={styles.specVal}>{ev.evDetails?.batteryCapacity || '72 kWh'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Operating Range</Text>
              <Text style={styles.specVal}>{ev.evDetails?.rangeKm || 280} km</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Category</Text>
              <Text style={styles.specVal}>{ev.vehicleCategory}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Capacity</Text>
              <Text style={styles.specVal}>{ev.seatingCapacity} Passengers</Text>
            </View>
          </View>
        </View>

        {/* Operating Corridor */}
        <View style={styles.contentCard}>
          <Text style={styles.cardHeader}>Designated Rapid Corridor</Text>
          <View style={styles.routeBox}>
            <View style={styles.stopRow}>
              <Ionicons name="radio-button-on" size={16} color={COLORS.success} />
              <Text style={styles.stopText}>
                <strong>Pickup:</strong> {ev.route?.origin || ev.pickupDropDetails?.pickupLocation || 'City Center Station'}
              </Text>
            </View>
            <View style={styles.stopRow}>
              <Ionicons name="location" size={16} color="#ef4444" />
              <Text style={styles.stopText}>
                <strong>Drop:</strong> {ev.route?.destination || ev.pickupDropDetails?.dropLocation || 'Sector 62 IT Park'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.barLabel}>Trip Fare</Text>
          <Text style={styles.barPrice}>₹{ev.fareRate}</Text>
        </View>
        <Button
          title="Book Now"
          onPress={handleBookNow}
          style={{ paddingHorizontal: 36, backgroundColor: COLORS.success }}
        />
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
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 16
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  evTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  evReg: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 2
  },
  farePill: {
    alignItems: 'flex-end',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  farePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.success
  },
  fareSub: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  specBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10
  },
  specLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  specVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginTop: 2
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 10
  },
  routeBox: {
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stopText: {
    fontSize: 13,
    color: '#334155'
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  barPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.darkNavy
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

export default EvSewaDetailsScreen;
