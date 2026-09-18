import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import driverService from '../../services/driverService';
import FareReceiptModal from '../../components/FareReceiptModal';
import MaskedCallModal from '../../components/MaskedCallModal';
import SafetySOSModal from '../../components/SafetySOSModal';

export default function ActiveRideScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const bookingId = route.params?.bookingId;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Lifecycle states: 'ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'
  const [rideStep, setRideStep] = useState('ARRIVING');

  // Waiting timer
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);

  // OTP Verification Modal
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  // Modals
  const [fareReceiptVisible, setFareReceiptVisible] = useState(false);
  const [fareData, setFareData] = useState(null);
  const [maskedCallVisible, setMaskedCallVisible] = useState(false);
  const [sosVisible, setSosVisible] = useState(false);

  useEffect(() => {
    fetchActiveBooking();
    const interval = setInterval(fetchActiveBooking, 10000);
    return () => clearInterval(interval);
  }, [bookingId]);

  // Waiting timer effect
  useEffect(() => {
    let timer;
    if (isWaiting) {
      timer = setInterval(() => {
        setWaitingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isWaiting]);

  const fetchActiveBooking = async () => {
    try {
      if (bookingId) {
        const res = await driverService.getBookingDetails(bookingId);
        if (res.success && res.data) {
          setBooking(res.data);
          syncStep(res.data);
        }
      } else {
        const res = await driverService.getActiveRide();
        if (res.success && res.data) {
          setBooking(res.data);
          syncStep(res.data);
        } else {
          // No active ride
          setBooking(null);
        }
      }
    } catch (err) {
      console.log('Error fetching active booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncStep = (b) => {
    const status = b.rideStatus || b.bookingStatus;
    if (status === 'In Progress' || status === 'IN_PROGRESS') {
      setRideStep('IN_PROGRESS');
      setIsWaiting(false);
    } else if (status === 'Driver Arrived' || status === 'ARRIVED') {
      setRideStep('ARRIVED');
      setIsWaiting(true);
    } else if (status === 'Confirmed' || status === 'ACCEPTED') {
      setRideStep('ARRIVING');
    } else if (status === 'Completed' || status === 'COMPLETED') {
      setRideStep('COMPLETED');
    }
  };

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Open external Google Maps for turn-by-turn navigation (Zero GPS)
  const openExternalNavigation = (address) => {
    if (!address) {
      Alert.alert(t('error'), 'Location address not specified');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), 'Unable to open Google Maps navigation.');
    });
  };

  // 1. Driver arrives at pickup
  const handleArrivedAtPickup = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      const res = await driverService.updateRideStatus(booking._id, 'Driver Arrived');
      if (res.success) {
        setRideStep('ARRIVED');
        setIsWaiting(true);
        Alert.alert(t('success'), 'Marked arrived at pickup. Customer has been notified.');
      } else {
        Alert.alert(t('error'), res.message || 'Failed to update status');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to notify arrival');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Open OTP Modal to verify and start ride
  const handleOpenOtpModal = () => {
    setOtpInput('');
    setOtpError('');
    setOtpModalVisible(true);
  };

  // 3. Verify OTP & Start Ride
  const handleVerifyOtpAndStart = async () => {
    if (!otpInput || otpInput.trim().length !== 4) {
      setOtpError('Please enter a valid 4-digit OTP/PIN');
      return;
    }
    setActionLoading(true);
    setOtpError('');
    try {
      const res = await driverService.verifyRideOTP(booking._id, otpInput.trim());
      if (res.success) {
        setOtpModalVisible(false);
        setRideStep('IN_PROGRESS');
        setIsWaiting(false);
        Alert.alert(t('success'), 'OTP Verified! Ride has officially started.');
        fetchActiveBooking();
      } else {
        setOtpError(res.message || 'Invalid OTP. Please ask customer for correct 4-digit PIN.');
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Verification failed. Incorrect OTP.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. End / Complete Ride
  const handleEndRide = async () => {
    Alert.alert(
      t('endRide'),
      'Are you sure you have reached the destination and wish to complete this ride?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await driverService.completeRide(booking._id);
              if (res.success) {
                setRideStep('COMPLETED');
                setFareData(res.fareBreakdown || {
                  totalFare: booking.totalFare || 0,
                  commission: (booking.totalFare || 0) * 0.2,
                  driverEarnings: (booking.totalFare || 0) * 0.8,
                  paymentMethod: booking.paymentMethod || 'CASH',
                  paymentStatus: booking.paymentStatus || 'PAID',
                });
                setFareReceiptVisible(true);
              } else {
                Alert.alert(t('error'), res.message || 'Failed to complete ride');
              }
            } catch (err) {
              Alert.alert(t('error'), err.response?.data?.message || 'Failed to complete ride');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCloseFareReceipt = () => {
    setFareReceiptVisible(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <MaterialCommunityIcons name="car-off" size={64} color={COLORS.textMuted} />
        <Text style={styles.noRideTitle}>{t('noActiveRide')}</Text>
        <Text style={styles.noRideSub}>You have no ongoing trips right now.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.backBtnText}>{t('dashboard')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customerName = booking.user?.name || booking.passengerName || 'Customer';
  const customerPhone = booking.user?.phone || booking.passengerPhone || 'N/A';
  const pickupLocation = booking.pickupLocation || booking.from || 'Pickup Point';
  const dropLocation = booking.dropLocation || booking.to || 'Drop Destination';
  const fare = booking.totalFare || 0;
  const paymentMethod = booking.paymentMethod || 'CASH';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{t('activeRide')}</Text>
          <Text style={styles.headerSub}>ID: #{booking._id?.slice(-6)?.toUpperCase()}</Text>
        </View>
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => setSosVisible(true)}
        >
          <MaterialCommunityIcons name="shield-alert" size={20} color={COLORS.white} />
          <Text style={styles.sosButtonText}>{t('sos')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Indicator Banner */}
        <View style={[
          styles.statusBanner,
          rideStep === 'ARRIVING' && { backgroundColor: COLORS.warning + '20', borderColor: COLORS.warning },
          rideStep === 'ARRIVED' && { backgroundColor: COLORS.info + '20', borderColor: COLORS.info },
          rideStep === 'IN_PROGRESS' && { backgroundColor: COLORS.success + '20', borderColor: COLORS.success },
        ]}>
          <MaterialCommunityIcons
            name={
              rideStep === 'ARRIVING'
                ? 'car-clock'
                : rideStep === 'ARRIVED'
                ? 'account-clock'
                : 'navigation-variant'
            }
            size={24}
            color={
              rideStep === 'ARRIVING'
                ? COLORS.warning
                : rideStep === 'ARRIVED'
                ? COLORS.info
                : COLORS.success
            }
          />
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text style={styles.statusBannerTitle}>
              {rideStep === 'ARRIVING' && t('onTheWayToPickup')}
              {rideStep === 'ARRIVED' && t('arrivedAtPickup')}
              {rideStep === 'IN_PROGRESS' && t('inProgress')}
            </Text>
            <Text style={styles.statusBannerSub}>
              {rideStep === 'ARRIVING' && 'Drive safely to passenger pickup point'}
              {rideStep === 'ARRIVED' && `Waiting for customer: ${formatTimer(waitingSeconds)}`}
              {rideStep === 'IN_PROGRESS' && 'En route to destination. Drive carefully!'}
            </Text>
          </View>
        </View>

        {/* Customer Profile & Communication */}
        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.m }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.passengerSub}>
                {booking.seats ? `${booking.seats.length} Seat(s)` : 'Passenger'} • {paymentMethod}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.callCircle}
              onPress={() => setMaskedCallVisible(true)}
            >
              <MaterialCommunityIcons name="phone" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Details Card */}
        <View style={styles.routeCard}>
          <Text style={styles.sectionHeading}>{t('routeDetails')}</Text>

          {/* Pickup */}
          <View style={styles.locationRow}>
            <View style={styles.iconCol}>
              <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
              <View style={styles.dashLine} />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>{t('pickup')}</Text>
              <Text style={styles.locationValue}>{pickupLocation}</Text>
            </View>
            {rideStep === 'ARRIVING' && (
              <TouchableOpacity
                style={styles.navBtnSmall}
                onPress={() => openExternalNavigation(pickupLocation)}
              >
                <MaterialCommunityIcons name="google-maps" size={16} color={COLORS.primary} />
                <Text style={styles.navBtnTextSmall}>{t('openGoogleMaps')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Drop */}
          <View style={styles.locationRow}>
            <View style={styles.iconCol}>
              <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>{t('drop')}</Text>
              <Text style={styles.locationValue}>{dropLocation}</Text>
            </View>
            {rideStep === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={styles.navBtnSmall}
                onPress={() => openExternalNavigation(dropLocation)}
              >
                <MaterialCommunityIcons name="google-maps" size={16} color={COLORS.primary} />
                <Text style={styles.navBtnTextSmall}>{t('openGoogleMaps')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Fare & Payment Summary */}
        <View style={styles.fareCard}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>{t('fare')}</Text>
            <Text style={styles.fareAmount}>₹{fare}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareSubLabel}>{t('paymentMethod')}</Text>
            <View style={styles.paymentBadge}>
              <MaterialCommunityIcons
                name={paymentMethod === 'ONLINE' ? 'credit-card-check' : 'cash'}
                size={14}
                color={paymentMethod === 'ONLINE' ? COLORS.success : COLORS.warning}
              />
              <Text style={[
                styles.paymentBadgeText,
                { color: paymentMethod === 'ONLINE' ? COLORS.success : COLORS.warning },
              ]}>
                {paymentMethod}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.m) }]}>
        {rideStep === 'ARRIVING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.navFullBtn}
              onPress={() => openExternalNavigation(pickupLocation)}
            >
              <MaterialCommunityIcons name="navigation" size={20} color={COLORS.white} />
              <Text style={styles.navFullBtnText}>{t('openGoogleMaps')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.arrivedBtn, actionLoading && { opacity: 0.7 }]}
              disabled={actionLoading}
              onPress={handleArrivedAtPickup}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="map-marker-check" size={20} color={COLORS.white} />
                  <Text style={styles.arrivedBtnText}>{t('arrivedAtPickup')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {rideStep === 'ARRIVED' && (
          <TouchableOpacity
            style={styles.startRideBtn}
            onPress={handleOpenOtpModal}
          >
            <MaterialCommunityIcons name="key-variant" size={22} color={COLORS.white} />
            <Text style={styles.startRideBtnText}>{t('verifyOtpAndStart')}</Text>
          </TouchableOpacity>
        )}

        {rideStep === 'IN_PROGRESS' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.navFullBtn}
              onPress={() => openExternalNavigation(dropLocation)}
            >
              <MaterialCommunityIcons name="navigation" size={20} color={COLORS.white} />
              <Text style={styles.navFullBtnText}>{t('openGoogleMaps')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.endRideBtn, actionLoading && { opacity: 0.7 }]}
              disabled={actionLoading}
              onPress={handleEndRide}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="flag-checkered" size={20} color={COLORS.white} />
                  <Text style={styles.endRideBtnText}>{t('endRide')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* OTP Verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.otpModalCard}>
            <View style={styles.otpModalHeader}>
              <MaterialCommunityIcons name="shield-key" size={32} color={COLORS.primary} />
              <Text style={styles.otpModalTitle}>{t('enterRidePin')}</Text>
              <Text style={styles.otpModalSubtitle}>
                Ask passenger for the 4-digit Start PIN from their app.
              </Text>
            </View>

            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={(text) => {
                setOtpInput(text);
                setOtpError('');
              }}
              placeholder="• • • •"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />

            {!!otpError && <Text style={styles.otpErrorText}>{otpError}</Text>}

            <View style={styles.otpActionRow}>
              <TouchableOpacity
                style={styles.otpCancelBtn}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.otpCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otpConfirmBtn, actionLoading && { opacity: 0.7 }]}
                disabled={actionLoading}
                onPress={handleVerifyOtpAndStart}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.otpConfirmText}>{t('verifyAndStart')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <MaskedCallModal
        visible={maskedCallVisible}
        onClose={() => setMaskedCallVisible(false)}
        customerName={customerName}
        customerPhone={customerPhone}
        bookingId={booking._id}
      />

      <SafetySOSModal
        visible={sosVisible}
        onClose={() => setSosVisible(false)}
        bookingId={booking._id}
      />

      <FareReceiptModal
        visible={fareReceiptVisible}
        onClose={handleCloseFareReceipt}
        fareData={fareData}
        bookingId={booking._id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.l,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.m,
    fontSize: 14,
  },
  noRideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.m,
  },
  noRideSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.l,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.m,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBackBtn: {
    padding: SPACING.xs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.s,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  sosButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: 100,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    marginBottom: SPACING.m,
  },
  statusBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBannerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerCard: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.m,
    borderRadius: RADIUS.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  passengerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  callCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCard: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.m,
    borderRadius: RADIUS.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.m,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.m,
  },
  iconCol: {
    alignItems: 'center',
    width: 24,
    marginRight: SPACING.s,
    paddingTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dashLine: {
    width: 2,
    height: 32,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  locationTextCol: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  navBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.s,
    gap: 4,
  },
  navBtnTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  fareCard: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.m,
    borderRadius: RADIUS.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  fareLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.success,
  },
  fareSubLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgSurface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.m,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  navFullBtn: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.m,
    gap: 6,
  },
  navFullBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  arrivedBtn: {
    flex: 1.2,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.m,
    gap: 6,
  },
  arrivedBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  startRideBtn: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.m,
    gap: 8,
  },
  startRideBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  endRideBtn: {
    flex: 1.2,
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.m,
    gap: 6,
  },
  endRideBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: SPACING.l,
  },
  otpModalCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.l,
    padding: SPACING.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otpModalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  otpModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  otpModalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  otpInput: {
    width: '80%',
    height: 60,
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    borderWidth: 2,
    borderColor: COLORS.primary,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 12,
    marginVertical: SPACING.m,
  },
  otpErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: SPACING.s,
    textAlign: 'center',
  },
  otpActionRow: {
    flexDirection: 'row',
    gap: SPACING.m,
    width: '100%',
    marginTop: SPACING.s,
  },
  otpCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otpCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  otpConfirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  otpConfirmText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
