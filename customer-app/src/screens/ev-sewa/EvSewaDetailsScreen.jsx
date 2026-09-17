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

const FALLBACK_EV_IMAGE =
  'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80';

const EvSewaDetailsScreen = ({ navigation, route }) => {
  const { evId } = route.params || {};
  const { updateDraft } = useBooking();
  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await customerService.getEvSewaDetails(evId);
        if (res.success && res.data) {
          setEv(res.data);
          updateDraft({
            serviceType: 'EV-Sewa',
            vehicle: res.data,
            baseFare: res.data.fareRate,
            totalFare: res.data.fareRate,
            pickupLocation:
              res.data.pickupDropDetails?.pickupLocation ||
              res.data.route?.origin ||
              'Connaught Place, New Delhi',
            dropLocation:
              res.data.pickupDropDetails?.dropLocation ||
              res.data.route?.destination ||
              'Sector 62 Electronic City, Noida',
            selectedSeats: [1],
            passengerDetails: [{ name: '', phone: '', age: '', gender: 'Male' }]
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
          <ActivityIndicator size="large" color={COLORS.evBadge} />
          <Text style={styles.loadingText}>Loading EV shuttle specifications...</Text>
        </View>
      </View>
    );
  }

  if (!ev) {
    return (
      <View style={styles.container}>
        <Header title="EV-Sewa Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={54} color={COLORS.textSecondary} />
          <Text style={styles.errorTitle}>Vehicle Not Found</Text>
          <Text style={styles.errorSub}>The requested EV-Sewa vehicle is currently unavailable.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Back to Listing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBookNow = () => {
    updateDraft({
      serviceType: 'EV-Sewa',
      vehicle: ev,
      baseFare: ev.fareRate,
      totalFare: ev.fareRate,
      pickupLocation:
        ev.pickupDropDetails?.pickupLocation ||
        ev.route?.origin ||
        'Connaught Place, New Delhi',
      dropLocation:
        ev.pickupDropDetails?.dropLocation ||
        ev.route?.destination ||
        'Sector 62 Electronic City, Noida',
      selectedSeats: [1],
      passengerDetails: [{ name: '', phone: '', age: '', gender: 'Male' }]
    });
    navigation.navigate('PickupDrop');
  };

  const vehicleImg =
    ev.vehicleImages && ev.vehicleImages.length > 0 && ev.vehicleImages[0]
      ? ev.vehicleImages[0]
      : FALLBACK_EV_IMAGE;

  return (
    <View style={styles.container}>
      <Header title="EV-Sewa Vehicle Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Vehicle Image */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: vehicleImg }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <View style={styles.electricBadge}>
              <Ionicons name="flash" size={13} color="#ffffff" />
              <Text style={styles.electricBadgeText}>100% Electric Shuttle</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>{ev.vehicleStatus || 'Active'}</Text>
            </View>
          </View>
        </View>

        {/* Primary Title & Registration Card */}
        <View style={styles.contentCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.evTitle}>{ev.vehicleName}</Text>
              <Text style={styles.evSub}>{ev.vehicleModel}</Text>
              <View style={styles.regBadge}>
                <Ionicons name="barcode-outline" size={13} color="#065f46" />
                <Text style={styles.regText}>Reg: {ev.vehicleNumber}</Text>
              </View>
            </View>
            <View style={styles.farePill}>
              <Text style={styles.fareLabel}>Trip Fare</Text>
              <Text style={styles.farePrice}>₹{ev.fareRate}</Text>
              <Text style={styles.fareSub}>Per Passenger</Text>
            </View>
          </View>

          <View style={styles.ecoBanner}>
            <Ionicons name="leaf" size={16} color="#059669" />
            <Text style={styles.ecoBannerText}>
              Zero-Emission Urban Clean Mobility • RTO Approved
            </Text>
          </View>
        </View>

        {/* PRD Specifications Grid */}
        <View style={styles.contentCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="hardware-chip-outline" size={18} color={COLORS.darkNavy} />
            <Text style={styles.cardHeader}>Vehicle Specifications</Text>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Vehicle Type</Text>
              <Text style={styles.specVal}>{ev.vehicleType || 'EV-Sewa'}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Vehicle Category</Text>
              <Text style={styles.specVal}>{ev.vehicleCategory || 'Electric Shuttle'}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Vehicle Model</Text>
              <Text style={styles.specVal}>{ev.vehicleModel || 'Electric Passenger Van'}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Seating Capacity</Text>
              <Text style={styles.specVal}>{ev.seatingCapacity || 12} Passengers</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Battery Capacity</Text>
              <Text style={styles.specVal}>
                {ev.evDetails?.batteryCapacity || '72 kWh Lithium-Ion'}
              </Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Operating Range</Text>
              <Text style={styles.specVal}>
                {ev.evDetails?.rangeKm || 280} km per Charge
              </Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Registration No.</Text>
              <Text style={styles.specVal}>{ev.vehicleNumber}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Fleet Status</Text>
              <Text style={[styles.specVal, { color: '#059669' }]}>
                {ev.vehicleStatus || 'Active'}
              </Text>
            </View>
          </View>
        </View>

        {/* Designated Rapid Corridor Card */}
        <View style={styles.contentCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="map-outline" size={18} color={COLORS.darkNavy} />
            <Text style={styles.cardHeader}>Designated Rapid Corridor</Text>
          </View>

          <View style={styles.routeBox}>
            <View style={styles.stopRow}>
              <View style={styles.greenCircle}>
                <Ionicons name="radio-button-on" size={14} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopLabel}>Pickup Terminal / Station</Text>
                <Text style={styles.stopText}>
                  {ev.route?.origin ||
                    ev.pickupDropDetails?.pickupLocation ||
                    'Connaught Place, New Delhi'}
                </Text>
              </View>
            </View>

            <View style={styles.routeDivider} />

            <View style={styles.stopRow}>
              <View style={styles.redCircle}>
                <Ionicons name="location" size={14} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopLabel}>Drop Terminal / Station</Text>
                <Text style={styles.stopText}>
                  {ev.route?.destination ||
                    ev.pickupDropDetails?.dropLocation ||
                    'Sector 62 Electronic City, Noida'}
                </Text>
              </View>
            </View>
          </View>

          {/* Boarding / Dropping points list if provided */}
          {ev.route?.boardingPoints && (
            <View style={styles.stopsListSection}>
              <Text style={styles.stopsListTitle}>Key Boarding Stops:</Text>
              <Text style={styles.stopsListText}>
                {Array.isArray(ev.route.boardingPoints) ? ev.route.boardingPoints.join(' • ') : String(ev.route.boardingPoints)}
              </Text>
            </View>
          )}

          {ev.route?.droppingPoints && (
            <View style={styles.stopsListSection}>
              <Text style={styles.stopsListTitle}>Key Dropping Stops:</Text>
              <Text style={styles.stopsListText}>
                {Array.isArray(ev.route.droppingPoints) ? ev.route.droppingPoints.join(' • ') : String(ev.route.droppingPoints)}
              </Text>
            </View>
          )}
        </View>

        {/* Driver Assignment details (only if populated by backend) */}
        {ev.assignedDriver && (
          <View style={styles.contentCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-circle-outline" size={18} color={COLORS.darkNavy} />
              <Text style={styles.cardHeader}>Assigned Chauffeur</Text>
            </View>

            <View style={styles.driverCardBody}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{ev.assignedDriver.name || 'Professional Driver'}</Text>
                {ev.assignedDriver.mobileNumber && (
                  <Text style={styles.driverPhone}>Mobile: {ev.assignedDriver.mobileNumber}</Text>
                )}
                <View style={styles.driverVerifyPill}>
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.driverVerifyText}>Verified Commercial Chauffeur</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Service Standard Assurance */}
        <View style={styles.assuranceCard}>
          <View style={styles.assuranceRow}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.assuranceTitle}>100% Eco-Friendly Fleet</Text>
              <Text style={styles.assuranceDesc}>
                Air-conditioned cabin, zero emissions, and safety-certified electric transport.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.barLabel}>Standard Trip Fare</Text>
          <Text style={styles.barPrice}>₹{ev.fareRate}</Text>
        </View>
        <Button
          title="Continue to Booking"
          onPress={handleBookNow}
          style={{ paddingHorizontal: 28, backgroundColor: '#059669' }}
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
    paddingBottom: 110
  },
  imageCard: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  heroOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  electricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  evTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  evSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  regBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  regText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46'
  },
  farePill: {
    alignItems: 'flex-end',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  fareLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065f46'
  },
  farePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669'
  },
  fareSub: {
    fontSize: 9,
    color: '#065f46',
    fontWeight: '600'
  },
  ecoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  ecoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    flex: 1
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  specBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  specLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  specVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginTop: 3
  },
  routeBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  greenCircle: {
    marginTop: 2
  },
  redCircle: {
    marginTop: 2
  },
  routeDivider: {
    width: 2,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginLeft: 6,
    marginVertical: 4
  },
  stopLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  stopText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginTop: 1
  },
  stopsListSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  stopsListTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2
  },
  stopsListText: {
    fontSize: 12,
    color: '#334155'
  },
  driverCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.darkNavy,
    justifyContent: 'center',
    alignItems: 'center'
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  driverPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  driverVerifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  driverVerifyText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600'
  },
  assuranceCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 10
  },
  assuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  assuranceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534'
  },
  assuranceDesc: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 2
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  barPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669'
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
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginTop: 12
  },
  errorSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  backBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  }
});

export default EvSewaDetailsScreen;

