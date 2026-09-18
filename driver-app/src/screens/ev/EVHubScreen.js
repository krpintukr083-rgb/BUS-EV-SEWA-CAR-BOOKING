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

export default function EVHubScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [evStats, setEvStats] = useState({
    batteryPercentage: 78,
    estimatedRangeKm: 185,
    chargingStatus: 'DISCHARGING', // 'CHARGING', 'DISCHARGING', 'FULL'
    healthScore: 96,
  });

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newSocInput, setNewSocInput] = useState('78');
  const [updatingSoc, setUpdatingSoc] = useState(false);

  useEffect(() => {
    fetchEVData();
  }, []);

  const fetchEVData = async () => {
    try {
      const [statsRes, stationsRes] = await Promise.all([
        driverService.getEVStats(),
        driverService.getChargingStations(),
      ]);

      if (statsRes.success && statsRes.data) {
        setEvStats(statsRes.data);
        setNewSocInput(String(statsRes.data.batteryPercentage || 78));
      }
      if (stationsRes.success && stationsRes.data) {
        setStations(stationsRes.data);
      } else {
        // Fallback realistic EV charging stations with addresses
        setStations([
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
        ]);
      }
    } catch (err) {
      console.log('Error fetching EV data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEVData();
  };

  const handleUpdateBattery = async () => {
    const val = parseInt(newSocInput, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      Alert.alert(t('error'), 'Please enter a valid battery percentage (0-100)%');
      return;
    }

    setUpdatingSoc(true);
    try {
      const res = await driverService.updateEVBattery(val);
      if (res.success) {
        setEvStats((prev) => ({
          ...prev,
          batteryPercentage: val,
          estimatedRangeKm: Math.round(val * 2.4),
        }));
        Alert.alert(t('success'), `Vehicle battery updated to ${val}% (${Math.round(val * 2.4)} km range)`);
      } else {
        Alert.alert(t('error'), res.message || 'Failed to update battery level');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to update battery level');
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
        <Text style={styles.headerTitle}>{t('evHub')}</Text>
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
        {/* Battery & Telemetry Dashboard Card */}
        <View style={styles.socCard}>
          <View style={styles.socTopRow}>
            <View>
              <Text style={styles.socSubtitle}>{t('currentCharge')}</Text>
              <View style={styles.socMainRow}>
                <Text style={[styles.socPercentage, { color: getBatteryColor(evStats.batteryPercentage) }]}>
                  {evStats.batteryPercentage}%
                </Text>
                <MaterialCommunityIcons
                  name={evStats.batteryPercentage > 20 ? 'battery-charging-80' : 'battery-alert'}
                  size={32}
                  color={getBatteryColor(evStats.batteryPercentage)}
                />
              </View>
            </View>

            <View style={styles.rangeBox}>
              <Text style={styles.rangeLabel}>{t('estRange')}</Text>
              <Text style={styles.rangeValue}>{evStats.estimatedRangeKm} km</Text>
            </View>
          </View>

          {/* Battery Level Progress Bar */}
          <View style={styles.batteryTrack}>
            <View
              style={[
                styles.batteryFill,
                {
                  width: `${evStats.batteryPercentage}%`,
                  backgroundColor: getBatteryColor(evStats.batteryPercentage),
                },
              ]}
            />
          </View>

          {/* Manual SOC Update Section (Zero GPS Telemetry) */}
          <View style={styles.socUpdateRow}>
            <Text style={styles.socUpdateLabel}>{t('updateBatteryPct')}:</Text>
            <TextInput
              style={styles.socInput}
              keyboardType="number-pad"
              maxLength={3}
              value={newSocInput}
              onChangeText={setNewSocInput}
            />
            <TouchableOpacity
              style={[styles.socUpdateBtn, updatingSoc && { opacity: 0.6 }]}
              disabled={updatingSoc}
              onPress={handleUpdateBattery}
            >
              {updatingSoc ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.socUpdateBtnText}>{t('save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

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
  socUpdateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    flex: 1,
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
  socUpdateBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.s,
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
