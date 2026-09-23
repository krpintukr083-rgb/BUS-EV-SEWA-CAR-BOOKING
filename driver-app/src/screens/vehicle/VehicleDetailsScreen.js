import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';

export default function VehicleDetailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const res = await driverService.getVehicle();
      // axios wraps the response: actual JSON is at res.data
      if (res?.data?.success && res.data.data) {
        setVehicle(res.data.data);
      } else {
        // null => shows "No vehicle assigned" empty state
        setVehicle(null);
      }
    } catch (err) {
      console.log('Error fetching vehicle:', err?.response?.data || err.message);
      setVehicle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicle();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('vehicleDetails')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('VehicleSubmission')}>
          <Text style={styles.registerButtonText}>Register a vehicle</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : !vehicle ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bus-alert" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No vehicle assigned to your profile yet.</Text>
            <Text style={[styles.emptyText, { fontSize: 12, marginTop: 6 }]}>
              Ask your admin to assign a vehicle from the Admin Panel.
            </Text>
          </View>
        ) : (
          <>
            {/* Vehicle Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.vehicleIconCircle}>
                <MaterialCommunityIcons
                  name={
                    vehicle.vehicleType === 'EV-Sewa'
                      ? 'lightning-bolt'
                      : vehicle.vehicleType === 'Car'
                      ? 'car'
                      : 'bus'
                  }
                  size={36}
                  color={vehicle.vehicleType === 'EV-Sewa' ? COLORS.primary : COLORS.secondary}
                />
              </View>
              {/* vehicleName = "Rajdhani Express" etc from DB */}
              <Text style={styles.vehicleName}>
                {vehicle.vehicleName || vehicle.vehicleModel || 'Assigned Vehicle'}
              </Text>
              {vehicle.vehicleModel && vehicle.vehicleName !== vehicle.vehicleModel && (
                <Text style={[styles.routeText, { marginBottom: 4 }]}>
                  {vehicle.vehicleModel}
                </Text>
              )}
              {/* vehicleNumber = plate number from DB */}
              <View style={styles.plateBadge}>
                <Text style={styles.plateText}>
                  {vehicle.vehicleNumber || 'N/A'}
                </Text>
              </View>
              {/* vehicleCategory e.g. "AC Sleeper", "Executive SUV" */}
              {vehicle.vehicleCategory ? (
                <Text style={styles.routeText}>{vehicle.vehicleCategory}</Text>
              ) : null}
              {/* Route from DB route.origin → route.destination */}
              {(vehicle.route?.origin || vehicle.route?.destination) && (
                <Text style={[styles.routeText, { marginTop: 4 }]}>
                  {vehicle.route.origin}
                  {vehicle.route.origin && vehicle.route.destination ? ' → ' : ''}
                  {vehicle.route.destination}
                </Text>
              )}
            </View>

            {/* Specifications Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('specifications')}</Text>

              <View style={styles.specRow}>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="car-seat" size={20} color={COLORS.primary} />
                  <Text style={styles.specLabel}>{t('capacity')}</Text>
                  <Text style={styles.specVal}>{vehicle.seatingCapacity || 4} Seats</Text>
                </View>
                <View style={styles.specDivider} />
                <View style={styles.specItem}>
                  <MaterialCommunityIcons
                    name={
                      vehicle.vehicleType === 'EV-Sewa' ||
                      vehicle.carDetails?.fuelType === 'Electric' ||
                      vehicle.evDetails
                        ? 'ev-station'
                        : 'gas-station'
                    }
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.specLabel}>{t('fuelType')}</Text>
                  <Text style={styles.specVal}>
                    {vehicle.fuelType ||
                      vehicle.carDetails?.fuelType ||
                      (vehicle.vehicleType === 'EV-Sewa' ? 'Electric' : 'Diesel')}
                  </Text>
                </View>
                <View style={styles.specDivider} />
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="air-conditioner" size={20} color={COLORS.primary} />
                  <Text style={styles.specLabel}>Air Conditioning</Text>
                  <Text style={styles.specVal}>
                    {vehicle.carDetails?.ac ||
                    vehicle.busDetails?.busType?.toLowerCase().includes('ac') ||
                    vehicle.vehicleCategory?.toLowerCase().includes('ac')
                      ? 'AC'
                      : 'Non-AC'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Route / Service Card */}
            {(vehicle.route || vehicle.pickupDropDetails) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Operating Route</Text>
                <View style={{ gap: 8 }}>
                  {(vehicle.route?.boardingPoints || []).length > 0 && (
                    <Text style={styles.specLabel}>
                      Boarding: {vehicle.route.boardingPoints.join(' | ')}
                    </Text>
                  )}
                  {vehicle.route?.departureTime && (
                    <Text style={styles.specLabel}>
                      Departure: {vehicle.route.departureTime}
                      {vehicle.route.arrivalTime ? `  →  Arrival: ${vehicle.route.arrivalTime}` : ''}
                    </Text>
                  )}
                  {vehicle.route?.duration && (
                    <Text style={styles.specLabel}>Duration: {vehicle.route.duration}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Vehicle Type Badge Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Vehicle Info</Text>
              <View style={styles.amenitiesWrap}>
                <View style={styles.amenityChip}>
                  <MaterialCommunityIcons name="check" size={14} color={COLORS.success} />
                  <Text style={styles.amenityText}>Type: {vehicle.vehicleType}</Text>
                </View>
                {vehicle.vehicleStatus && (
                  <View style={styles.amenityChip}>
                    <MaterialCommunityIcons name="check" size={14} color={COLORS.success} />
                    <Text style={styles.amenityText}>Status: {vehicle.vehicleStatus}</Text>
                  </View>
                )}
                {vehicle.rcNumber && (
                  <View style={styles.amenityChip}>
                    <MaterialCommunityIcons name="check" size={14} color={COLORS.success} />
                    <Text style={styles.amenityText}>RC: {vehicle.rcNumber}</Text>
                  </View>
                )}
                {vehicle.busDetails?.busType && (
                  <View style={styles.amenityChip}>
                    <MaterialCommunityIcons name="check" size={14} color={COLORS.success} />
                    <Text style={styles.amenityText}>{vehicle.busDetails.busType}</Text>
                  </View>
                )}
                {vehicle.busDetails?.seatLayout && (
                  <View style={styles.amenityChip}>
                    <MaterialCommunityIcons name="check" size={14} color={COLORS.success} />
                    <Text style={styles.amenityText}>Layout: {vehicle.busDetails.seatLayout}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Link to EV Hub if EV-Sewa vehicle */}
            {vehicle.vehicleType === 'EV-Sewa' && (
              <TouchableOpacity
                style={styles.evBannerBtn}
                onPress={() => navigation.navigate('EVHub')}
              >
                <MaterialCommunityIcons name="ev-station" size={24} color={COLORS.white} />
                <View style={{ flex: 1, marginLeft: SPACING.s }}>
                  <Text style={styles.evBannerTitle}>{t('evHub')}</Text>
                  <Text style={styles.evBannerSub}>Check battery %, range & find fast chargers</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.s,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  vehicleIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.s,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  plateBadge: {
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: RADIUS.s,
    marginTop: SPACING.xs,
    marginBottom: SPACING.s,
  },
  plateText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  routeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.m,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
  },
  specDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  specLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  specVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  amenityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  evBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginTop: SPACING.xs,
  },
  evBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  evBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  registerButtonText: { color: COLORS.white, fontWeight: '700' },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: SPACING.m,
  },
});
