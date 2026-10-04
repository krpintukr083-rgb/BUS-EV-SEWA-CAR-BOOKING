import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleaned = timeStr.trim().replace(/\s+/g, ' ');
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const calculateDuration = (departureStr, arrivalStr) => {
  const depMinutes = parseTimeToMinutes(departureStr);
  const arrMinutes = parseTimeToMinutes(arrivalStr);
  if (depMinutes === null || arrMinutes === null) return '';

  let diff = arrMinutes - depMinutes;
  if (diff < 0) {
    diff += 24 * 60;
  } else if (diff === 0) {
    return '24h';
  }
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  if (mins === 0) {
    return `${hours}h`;
  }
  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
};

export default function VehicleDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fare, setFare] = useState('');
  const [stopFaresFromOrigin, setStopFaresFromOrigin] = useState([]);
  const [destinationFareFromOrigin, setDestinationFareFromOrigin] = useState('');
  const [savingFare, setSavingFare] = useState(false);

  // Operating Route Edit Modal State
  const [editRouteModalVisible, setEditRouteModalVisible] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState('');
  const [routeDestination, setRouteDestination] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [savingRoute, setSavingRoute] = useState(false);

  // Car Route ON/OFF toggle state (mirrors vehicle.routeActive from backend)
  const [routeToggling, setRouteToggling] = useState(false);

  useEffect(() => {
    fetchVehicle(route?.params?.vehicleId);
  }, [route?.params?.vehicleId]);

  useEffect(() => {
    console.log('[REVERSE DEBUG] RENDERED ROUTE STATE:', {
      origin: vehicle?.route?.origin,
      destination: vehicle?.route?.destination,
    });
  }, [vehicle?.route?.origin, vehicle?.route?.destination]);

  const fetchVehicle = async (vehicleId) => {
    try {
      const res = await driverService.getVehicle(vehicleId);
      // axios wraps the response: actual JSON is at res.data
      if (res?.data?.success && res.data.data) {
        setVehicle(res.data.data);
        setFare(res.data.data.fareRate ? res.data.data.fareRate.toString() : '');
        const stops = res.data.data.route?.stops || [];
        const cumulativeStops = stops.every(stop => stop.fareFromOrigin != null)
          ? stops.map(stop => Number(stop.fareFromOrigin))
          : stops.reduce((totals, stop) => {
            totals.push((totals[totals.length - 1] || 0) + Number(stop.fareFromPrevious || 0));
            return totals;
          }, []);
        setStopFaresFromOrigin(cumulativeStops.map(String));
        const finalFare = res.data.data.route?.destinationFareFromOrigin
          ?? (stops.length
            ? cumulativeStops[cumulativeStops.length - 1] + Number(res.data.data.route?.finalSegmentFare || 0)
            : null);
        setDestinationFareFromOrigin(finalFare == null ? '' : String(finalFare));
      } else {
        // null => shows "No vehicle assigned" empty state
        setVehicle(null);
        setFare('');
      }
    } catch (err) {
      console.log('Error fetching vehicle:', err?.response?.data || err.message);
      setVehicle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Toggles the Car vehicle's Route ON/OFF state in the backend.
   * Scheduled Car bookings are completely unaffected by this flag.
   */
  const handleToggleRouteStatus = async () => {
    if (!vehicle?._id || routeToggling) return;
    const newStatus = !vehicle.routeActive;
    setRouteToggling(true);
    try {
      const res = await driverService.updateRouteStatus(vehicle._id, newStatus);
      if (res?.data?.success) {
        // Refresh from backend to ensure consistency
        setVehicle(prev => ({
          ...prev,
          routeActive: res.data.data.routeActive
        }));
        Alert.alert(
          'Route Status Updated',
          `Route is now ${newStatus ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}\n\nInstant Car route-matching will ${
            newStatus ? 'include' : 'exclude'
          } this vehicle. Scheduled Car bookings are unaffected.`
        );
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to update route status');
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to update route status');
    } finally {
      setRouteToggling(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicle(route?.params?.vehicleId);
  };

  const hasRouteSegments = (vehicle?.route?.stops || []).length > 0;
  const cumulativeFares = [...stopFaresFromOrigin.map(Number), Number(destinationFareFromOrigin)];
  const routeFareInputsValid = cumulativeFares.every(value => Number.isFinite(value) && value >= 0)
    && cumulativeFares[cumulativeFares.length - 1] > 0
    && cumulativeFares.every((value, index) => index === 0 || value >= cumulativeFares[index - 1])
    && stopFaresFromOrigin.length === vehicle?.route?.stops?.length;
  const calculatedRouteFare = Number(destinationFareFromOrigin) || 0;
  const isFareValid = hasRouteSegments
    ? routeFareInputsValid
    : fare !== '' && !isNaN(fare) && Number(fare) > 0;

  const handleSaveFare = async () => {
    if (!isFareValid) {
      Alert.alert('Invalid Fare', 'Enter positive fares from origin in non-decreasing order.');
      return;
    }
    setSavingFare(true);
    try {
      const routeUpdate = hasRouteSegments ? {
        ...vehicle.route,
        stops: vehicle.route.stops.map((stop, index) => ({
          ...stop,
          fareFromOrigin: Number(stopFaresFromOrigin[index]),
          fareFromPrevious: undefined
        })),
        destinationFareFromOrigin: Number(destinationFareFromOrigin),
        finalSegmentFare: undefined
      } : {
        ...vehicle.route
      };
      const res = await driverService.updateVehicleFare(
        hasRouteSegments ? calculatedRouteFare : fare,
        vehicle?._id,
        routeUpdate
      );
      if (res.data?.success) {
        if (res.data.data) {
          setVehicle(res.data.data);
          setFare(res.data.data.fareRate ? res.data.data.fareRate.toString() : fare);
        }
        Alert.alert('Success', 'Fare and Route updated successfully');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to update fare');
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to update fare';
      Alert.alert('Error', errorMsg);
    } finally {
      setSavingFare(false);
    }
  };

  const handleOpenRouteModal = () => {
    const activeR = vehicle?.pendingRoute?.origin ? vehicle.pendingRoute : vehicle?.route;
    setRouteOrigin(activeR?.origin || '');
    setRouteDestination(activeR?.destination || '');
    const stopsList = Array.isArray(activeR?.stops)
      ? activeR.stops.map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean)
      : [];
    setRouteStops(stopsList);
    setEditRouteModalVisible(true);
  };

  const handleAddStop = () => {
    setRouteStops(prev => [...prev, '']);
  };

  const handleUpdateStop = (text, index) => {
    setRouteStops(prev => prev.map((s, i) => (i === index ? text : s)));
  };

  const handleRemoveStop = (index) => {
    setRouteStops(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveOperatingRoute = async () => {
    if (!routeOrigin.trim() || !routeDestination.trim()) {
      Alert.alert('Validation Error', 'Please enter both Origin and Destination.');
      return;
    }

    const cleanStops = routeStops.map(s => s.trim()).filter(Boolean);

    setSavingRoute(true);
    try {
      const res = await driverService.updateOperatingRoute(vehicle?._id, {
        origin: routeOrigin.trim(),
        destination: routeDestination.trim(),
        stops: cleanStops
      });

      if (res.data?.success) {
        if (res.data.data) {
          setVehicle(res.data.data);
        }
        setEditRouteModalVisible(false);
        Alert.alert('Submitted', res.data.message || 'Route change submitted for admin approval.');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to submit route change.');
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to submit route change.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSavingRoute(false);
    }
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
                <>
                  <Text style={[styles.routeText, { marginTop: 4 }]}>
                    {vehicle.route.origin}
                    {vehicle.route.origin && vehicle.route.destination ? ' → ' : ''}
                    {vehicle.route.destination}
                  </Text>
                </>
              )}
              <TouchableOpacity 
                style={[
                  styles.saveFareButton,
                  (!isFareValid || savingFare) && styles.saveFareButtonDisabled,
                ]} 
                onPress={handleSaveFare}
                disabled={!isFareValid || savingFare}
                activeOpacity={0.8}
              >
                {savingFare ? (
                  <View style={styles.saveFareButtonContent}>
                    <ActivityIndicator color={COLORS.white} size="small" style={{ marginRight: SPACING.s }} />
                    <Text style={styles.saveFareButtonText}>Updating...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveFareButtonText}>Save / Update Route & Schedule</Text>
                )}
              </TouchableOpacity>
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
                {(vehicle.vehicleType === 'EV-Sewa' || vehicle.carDetails?.fuelType === 'Electric' || vehicle.evDetails || vehicle.batteryPercentage != null) && (
                  <>
                    <View style={styles.specDivider} />
                    <View style={styles.specItem}>
                      <MaterialCommunityIcons name="battery-charging" size={20} color={COLORS.success} />
                      <Text style={styles.specLabel}>Battery</Text>
                      <Text style={styles.specVal}>
                        {vehicle.evDetails?.batteryPercentage ?? vehicle.batteryPercentage ?? '--'}%
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Operating Route Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Operating Route</Text>
                <TouchableOpacity
                  style={styles.editRouteBtn}
                  onPress={handleOpenRouteModal}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color={COLORS.primary} />
                  <Text style={styles.editRouteBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={[styles.specVal, { fontSize: 16, fontWeight: '700' }]}>
                  {vehicle.route?.origin || 'Not set'}
                  {vehicle.route?.origin && vehicle.route?.destination ? ' → ' : ''}
                  {vehicle.route?.destination || ''}
                </Text>

                {Array.isArray(vehicle.route?.stops) && vehicle.route.stops.length > 0 && (
                  <Text style={styles.specLabel}>
                    Stops: {vehicle.route.stops.map(s => typeof s === 'string' ? s : s?.name).filter(Boolean).join(', ')}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={styles.specLabel}>Status: </Text>
                  <View style={[
                    styles.routeStatusBadge,
                    {
                      backgroundColor: vehicle.routeApprovalStatus === 'Pending Approval'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : vehicle.routeApprovalStatus === 'Rejected'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(22, 163, 74, 0.15)'
                    }
                  ]}>
                    <Text style={[
                      styles.routeStatusText,
                      {
                        color: vehicle.routeApprovalStatus === 'Pending Approval'
                          ? '#f59e0b'
                          : vehicle.routeApprovalStatus === 'Rejected'
                          ? '#ef4444'
                          : '#16a34a'
                      }
                    ]}>
                      {vehicle.routeApprovalStatus || 'Approved'}
                    </Text>
                  </View>
                </View>

                {vehicle.pendingRoute?.origin && (
                  <View style={styles.pendingRouteNotice}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#f59e0b" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingNoticeTitle}>Pending Route Change:</Text>
                      <Text style={styles.pendingNoticeText}>
                        {vehicle.pendingRoute.origin} → {vehicle.pendingRoute.destination}
                      </Text>
                      {Array.isArray(vehicle.pendingRoute.stops) && vehicle.pendingRoute.stops.length > 0 && (
                        <Text style={styles.pendingNoticeSub}>
                          Stops: {vehicle.pendingRoute.stops.map(s => typeof s === 'string' ? s : s?.name).filter(Boolean).join(', ')}
                        </Text>
                      )}
                      <Text style={[styles.pendingNoticeSub, { fontStyle: 'italic', marginTop: 4 }]}>
                        Awaiting Admin Approval
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Car Route ON/OFF Toggle Card */}
            {vehicle.vehicleType === 'Car' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Instant Route Availability</Text>
                <Text style={[styles.specLabel, { marginBottom: SPACING.m, lineHeight: 20 }]}>
                  Controls whether this car appears in Instant Car route-matching.{`\n`}
                  Scheduled/Private Car bookings are NOT affected by this toggle.
                </Text>
                <View style={styles.routeToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>Route Status</Text>
                    <View style={[
                      styles.routeStatusBadge,
                      { backgroundColor: vehicle.routeActive !== false ? '#16a34a22' : '#dc262622' }
                    ]}>
                      <MaterialCommunityIcons
                        name={vehicle.routeActive !== false ? 'check-circle' : 'close-circle'}
                        size={16}
                        color={vehicle.routeActive !== false ? '#16a34a' : '#dc2626'}
                      />
                      <Text style={[
                        styles.routeStatusText,
                        { color: vehicle.routeActive !== false ? '#16a34a' : '#dc2626' }
                      ]}>
                        {vehicle.routeActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.routeToggleBtn,
                      vehicle.routeActive !== false
                        ? styles.routeToggleBtnOff
                        : styles.routeToggleBtnOn,
                    ]}
                    onPress={handleToggleRouteStatus}
                    disabled={routeToggling}
                    activeOpacity={0.8}
                  >
                    {routeToggling ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.routeToggleBtnText}>
                        {vehicle.routeActive !== false ? 'Turn OFF' : 'Turn ON'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Fare / Price Editing Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Fare / Price *</Text>
                {hasRouteSegments ? (
                  <View style={{ gap: SPACING.s }}>
                    {vehicle.route.stops.map((stop, index) => (
                      <View key={`${stop.name}-${index}`}>
                        <Text style={styles.specLabel}>
                          {stop.name} — Customer Fare from Origin
                        </Text>
                        <TextInput
                          style={styles.fareInput}
                          value={stopFaresFromOrigin[index] || ''}
                          onChangeText={value => setStopFaresFromOrigin(current => current.map((fareValue, fareIndex) =>
                            fareIndex === index ? value : fareValue
                          ))}
                          keyboardType="decimal-pad"
                          placeholder="Segment fare"
                          placeholderTextColor={COLORS.textMuted}
                        />
                      </View>
                    ))}
                    <View>
                      <Text style={styles.specLabel}>
                        {vehicle.route.destination} — Customer Fare from Origin
                      </Text>
                      <TextInput
                        style={styles.fareInput}
                        value={destinationFareFromOrigin}
                        onChangeText={setDestinationFareFromOrigin}
                        keyboardType="decimal-pad"
                        placeholder="Destination fare from origin"
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                    <Text style={styles.specLabel}>Calculated Full Route Fare: ₹{calculatedRouteFare}</Text>
                  </View>
                ) : (
                  <View style={styles.fareInputContainer}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.fareInput}
                      value={fare}
                      onChangeText={setFare}
                      keyboardType="numeric"
                      placeholder="Enter base fare"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                )}
            </View>

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
              <>
                <TouchableOpacity
                  style={styles.editEVButton}
                  onPress={() => navigation.navigate('VehicleSubmission', { vehicleId: vehicle._id })}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.white} />
                  <Text style={styles.editEVButtonText}>Edit Battery / Range</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.evBannerBtn}
                  onPress={() => navigation.navigate('EVHub', { vehicleId: vehicle._id })}
                >
                  <MaterialCommunityIcons name="ev-station" size={24} color={COLORS.white} />
                  <View style={{ flex: 1, marginLeft: SPACING.s }}>
                    <Text style={styles.evBannerTitle}>{t('evHub')}</Text>
                    <Text style={styles.evBannerSub}>Check battery %, range & find fast chargers</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Operating Route Modal */}
      <Modal
        visible={editRouteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditRouteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.s }}>
                <MaterialCommunityIcons name="pencil-box-outline" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Edit Operating Route</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setEditRouteModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View>
                  <Text style={styles.inputLabel}>Origin *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={routeOrigin}
                    onChangeText={setRouteOrigin}
                    placeholder="e.g. Jaipur"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Destination *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={routeDestination}
                    onChangeText={setRouteDestination}
                    placeholder="e.g. Delhi"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Intermediate Stops</Text>
                    <TouchableOpacity onPress={handleAddStop} style={styles.addStopBtn} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="plus-circle" size={18} color={COLORS.primary} />
                      <Text style={styles.addStopBtnText}>Add Stop</Text>
                    </TouchableOpacity>
                  </View>

                  {routeStops.map((stop, index) => (
                    <View key={index} style={styles.stopInputRow}>
                      <TextInput
                        style={[styles.modalInput, { flex: 1 }]}
                        value={stop}
                        onChangeText={(text) => handleUpdateStop(text, index)}
                        placeholder={`Stop #${index + 1} (e.g. Ajmer)`}
                        placeholderTextColor={COLORS.textMuted}
                      />
                      <TouchableOpacity
                        onPress={() => handleRemoveStop(index)}
                        style={styles.removeStopBtn}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditRouteModalVisible(false)}
                disabled={savingRoute}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, savingRoute && { opacity: 0.7 }]}
                onPress={handleSaveOperatingRoute}
                disabled={savingRoute}
              >
                {savingRoute ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  reverseRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
    borderRadius: RADIUS.l,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: SPACING.s,
  },
  reverseRouteButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 12,
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
  editEVButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginTop: SPACING.xs,
  },
  editEVButtonText: { color: COLORS.textPrimary, fontWeight: '700' },
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
  fareInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.m,
    minHeight: 48,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SPACING.s,
  },
  fareInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: SPACING.s,
  },
  saveFareButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.m,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: SPACING.l,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.l,
    width: '100%',
    ...SHADOWS.card,
  },
  saveFareButtonDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  saveFareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFareButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  routeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    marginTop: SPACING.xs,
  },
  routeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
  routeStatusText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  routeToggleBtn: {
    paddingHorizontal: SPACING.l,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    ...SHADOWS.card,
  },
  routeToggleBtnOn: {
    backgroundColor: '#16a34a',
  },
  routeToggleBtnOff: {
    backgroundColor: '#dc2626',
  },
  routeToggleBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  editRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.s,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  editRouteBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.l,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    gap: SPACING.m,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.m,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  durationPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    marginTop: 4,
  },
  durationPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.m,
    marginTop: SPACING.l,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  modalSaveBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addStopBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  stopInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  removeStopBtn: {
    padding: 6,
  },
  pendingRouteNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    flexDirection: 'row',
    gap: SPACING.s,
    marginTop: 8,
  },
  pendingNoticeTitle: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 13,
  },
  pendingNoticeText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
    marginTop: 2,
  },
  pendingNoticeSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
