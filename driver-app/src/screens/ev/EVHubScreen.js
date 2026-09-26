import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';

const FALLBACK_STATIONS = [
  {
    id: 'st-1',
    name: 'Nepal Electricity Authority (NEA) Fast Hub',
    address: 'Ratnapark, Kathmandu',
    distance: '2.4 km',
    chargers: '60 kW DC Fast (CCS2)',
    availableSlots: 2,
    totalSlots: 4,
    pricePerKwh: '₹8.50',
  },
  {
    id: 'st-2',
    name: 'EcoCharge Station Pokhara Highway',
    address: 'Kurintar, Chitwan Highway',
    distance: '48 km',
    chargers: '120 kW Ultra-Fast (CCS2 / GB/T)',
    availableSlots: 3,
    totalSlots: 6,
    pricePerKwh: '₹9.00',
  },
  {
    id: 'st-3',
    name: 'Sewa Green Charging Point',
    address: 'Prithvi Chowk, Pokhara',
    distance: '180 km',
    chargers: '50 kW DC Fast + 22 kW AC',
    availableSlots: 1,
    totalSlots: 2,
    pricePerKwh: '₹8.00',
  },
];

export default function EVHubScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const vehicleId = route?.params?.vehicleId;

  const [evStats, setEvStats] = useState({
    batteryPercentage: null,
    estimatedRangeKm: null,
    chargingStatus: 'DISCHARGING', // 'CHARGING', 'DISCHARGING', 'FULL'
    healthScore: 96,
  });

  const [vehicle, setVehicle] = useState(null);
  const [stations, setStations] = useState(FALLBACK_STATIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newSocInput, setNewSocInput] = useState('');
  const [newRangeInput, setNewRangeInput] = useState('');
  const [updatingSoc, setUpdatingSoc] = useState(false);

  useEffect(() => {
    fetchEVData();
  }, [vehicleId]);

  const fetchEVData = async () => {
    try {
      const response = await driverService.getVehicle(vehicleId);
      const selectedVehicle = response?.data?.data;
      if (!selectedVehicle || selectedVehicle.vehicleType !== 'EV-Sewa') {
        throw new Error('No EV-Sewa vehicle is available for this driver.');
      }

      const batteryPercentage = selectedVehicle.evDetails?.batteryPercentage
        ?? selectedVehicle.batteryPercentage
        ?? null;
      const estimatedRangeKm = selectedVehicle.evDetails?.rangeKm
        ?? selectedVehicle.estimatedRangeKm
        ?? null;
      setVehicle(selectedVehicle);
      setEvStats(current => ({ ...current, batteryPercentage, estimatedRangeKm }));
      setNewSocInput(batteryPercentage == null ? '' : String(batteryPercentage));
      setNewRangeInput(estimatedRangeKm == null ? '' : String(estimatedRangeKm));
      setStations(FALLBACK_STATIONS);
    } catch (err) {
      setVehicle(null);
      setEvStats(current => ({ ...current, batteryPercentage: null, estimatedRangeKm: null }));
      setNewSocInput('');
      setNewRangeInput('');
      Alert.alert(t('error'), err.response?.data?.message || err.message || 'Unable to load EV vehicle details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    fetchEVData();
  };

  const handleUpdateBattery = async () => {
    const batteryPercentage = Number(newSocInput);
    if (
      newSocInput.trim() === '' ||
      !Number.isFinite(batteryPercentage) ||
      batteryPercentage < 0 ||
      batteryPercentage > 100
    ) {
      Alert.alert(t('error'), 'Please enter a valid battery percentage (0-100)%');
      return;
    }
    const estimatedRangeKm = Number(newRangeInput);
    if (
      newRangeInput.trim() === '' ||
      !Number.isFinite(estimatedRangeKm) ||
      estimatedRangeKm <= 0
    ) {
      Alert.alert(t('error'), 'Please enter a valid estimated range greater than 0 km.');
      return;
    }
    if (!vehicle?._id) {
      Alert.alert(t('error'), 'No EV-Sewa vehicle is available to update.');
      return;
    }

    setUpdatingSoc(true);
    try {
      const response = await driverService.updateVehicleEVDetails(
        vehicle._id,
        batteryPercentage,
        estimatedRangeKm
      );
      const updatedVehicle = response.data?.success && response.data.data;
      if (!updatedVehicle) {
        throw new Error(response.data?.message || 'Failed to update battery and range.');
      }

      setVehicle(updatedVehicle);
      setEvStats(current => ({
        ...current,
        batteryPercentage: updatedVehicle.evDetails?.batteryPercentage ?? batteryPercentage,
        estimatedRangeKm: updatedVehicle.evDetails?.rangeKm ?? estimatedRangeKm
      }));
      setNewSocInput(String(updatedVehicle.evDetails?.batteryPercentage ?? batteryPercentage));
      setNewRangeInput(String(updatedVehicle.evDetails?.rangeKm ?? estimatedRangeKm));
      Alert.alert(t('success'), 'Vehicle battery and estimated range updated successfully.');
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || err.message || 'Failed to update battery and range.');
    } finally {
      setUpdatingSoc(false);
    }
  };

  const openStationNavigation = (station) => {
    const query = `${station.name}, ${station.address}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), 'Unable to open Google Maps');
    });
  };

  const getBatteryColor = (pct) => {
    if (pct > 50) return COLORS.success;
    if (pct > 20) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EV Charging Station</Text>
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
        {/* Charging Stations Section */}
        <View style={styles.stationHeaderRow}>
          <Text style={styles.sectionTitle}>{t('chargingStations')}</Text>
          <Text style={styles.stationSub}>External Google Maps Navigation</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          stations.map((station) => (
            <View key={station.id || station.name} style={styles.stationCard}>
              <View style={styles.stationTop}>
                <View style={styles.stationIconBox}>
                  <MaterialCommunityIcons name="ev-station" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.m }}>
                  <Text style={styles.stationName}>{station.name}</Text>
                  <Text style={styles.stationAddress}>{station.address}</Text>
                </View>
              </View>

              <View style={styles.stationMetaRow}>
                <View style={styles.stationMeta}>
                  <MaterialCommunityIcons name="lightning-bolt" size={16} color={COLORS.warning} />
                  <Text style={styles.stationMetaText}>{station.chargers}</Text>
                </View>
                <View style={styles.stationMeta}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                  <Text style={styles.stationMetaText}>
                    {station.availableSlots}/{station.totalSlots} Available
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => openStationNavigation(station)}
              >
                <MaterialCommunityIcons name="google-maps" size={18} color={COLORS.white} />
                <Text style={styles.navigateBtnText}>{t('navigateWithGoogleMaps')}</Text>
              </TouchableOpacity>
            </View>
          ))
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
  socCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginBottom: SPACING.l,
    ...SHADOWS.card,
  },
  socTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  socSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  socMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  socPercentage: {
    fontSize: 36,
    fontWeight: '900',
  },
  rangeBox: {
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rangeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  rangeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  batteryTrack: {
    height: 12,
    backgroundColor: COLORS.bgDark,
    borderRadius: 6,
    marginVertical: SPACING.m,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  batteryFill: {
    height: '100%',
    borderRadius: 6,
  },
  socUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    padding: SPACING.s,
    borderRadius: RADIUS.m,
    gap: SPACING.s,
  },
  socInputGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  socUpdateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  socInput: {
    backgroundColor: COLORS.bgSurface,
    color: COLORS.textPrimary,
    width: 60,
    height: 36,
    borderRadius: RADIUS.s,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rangeInput: {
    backgroundColor: COLORS.bgSurface,
    color: COLORS.textPrimary,
    width: 74,
    height: 36,
    borderRadius: RADIUS.s,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  socUpdateBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.s,
  },
  socUpdateBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
    opacity: 0.55,
  },
  socUpdateBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  stationHeaderRow: {
    marginBottom: SPACING.m,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stationSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stationCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  stationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stationIconBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stationAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stationMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.s,
    marginVertical: SPACING.s,
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stationMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    borderRadius: RADIUS.m,
    gap: 6,
    marginTop: 4,
  },
  navigateBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
