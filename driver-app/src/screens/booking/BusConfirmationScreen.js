import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../state/LanguageContext';
import CustomerOtpVerificationCard from '../../components/CustomerOtpVerificationCard';

export default function BusConfirmationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING', 'CONFIRMED', 'ALL'

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [otpInputs, setOtpInputs] = useState({});

  // Reject Modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchBusBookings();
    const interval = setInterval(fetchBusBookings, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchBusBookings = async () => {
    try {
      const res = await driverService.getAssignedBookings();
      // axios wraps response: actual JSON is at res.data
      if (res?.data?.success && res.data.data) {
        const allBookings = res.data.data;
        // Filter for Bus & EV-Sewa trips (backend uses 'Bus' and 'EV-Sewa' casing)
        const busTrips = allBookings.filter(
          (b) =>
            b.serviceType === 'BUS' ||
            b.serviceType === 'Bus' ||
            b.serviceType === 'EV_SEWA' ||
            b.serviceType === 'EV-Sewa' ||
            b.bookingType === 'BUS' ||
            !!b.seats?.length ||
            !!b.busSeatNumbers?.length
        );
        setBookings(busTrips);
      }
    } catch (err) {
      console.log('Error fetching bus bookings:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusBookings();
  };

  // 1. Confirm Bus Booking with Customer OTP
  const handleVerifyOtp = async (bookingId) => {
    const otpVal = (otpInputs[bookingId] || '').trim();
    if (!otpVal || otpVal.length < 4) {
      Alert.alert(t('error') || 'Error', 'Please enter the 6-digit Customer OTP.');
      return;
    }

    setActionLoadingId(bookingId);
    try {
      const res = await driverService.verifyBookingOtp(bookingId, otpVal);
      if (res?.data?.success || res?.data?.status === 'success' || res?.success) {
        Alert.alert(t('success') || 'Success', 'Customer OTP verified successfully. Booking confirmed!');
        setActiveTab('CONFIRMED');
        fetchBusBookings();
      } else {
        Alert.alert(t('error') || 'Verification Failed', res?.data?.message || 'Invalid OTP');
      }
    } catch (err) {
      Alert.alert(t('error') || 'Verification Failed', err.response?.data?.message || 'Invalid OTP');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      const res = await driverService.confirmBusBooking(bookingId);
      if (res?.data?.success) {
        Alert.alert(t('success'), 'Passenger booking confirmed successfully.');
        setActiveTab('CONFIRMED');
        fetchBusBookings();
      } else {
        Alert.alert(t('error'), res?.data?.message || 'Failed to confirm booking');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Offline Cash Payment Collection (Conductor marks cash received)
  const handleCollectCash = async (bookingId, amount) => {
    Alert.alert(
      t('collectCash'),
      `Collect ₹${amount} in cash from passenger and mark payment as Completed?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmPaid'),
          style: 'default',
          onPress: async () => {
            setActionLoadingId(bookingId);
            try {
              const res = await driverService.collectCashPayment(bookingId);
              if (res?.data?.success) {
                Alert.alert(t('success'), `₹${amount} Cash Collected! Payment marked as PAID.`);
                fetchBusBookings();
              } else {
                Alert.alert(t('error'), res?.data?.message || 'Failed to update payment');
              }
            } catch (err) {
              Alert.alert(t('error'), err.response?.data?.message || 'Failed to collect cash payment');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // 3. Destination Reached / Complete Ride for Bus & EV-Sewa
  const handleReachDestination = async (bookingId) => {
    Alert.alert(
      t('confirmDestinationReachedTitle') || 'Destination Reached',
      t('confirmDestinationReachedMessage') || "Have you reached the customer's destination?",
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('confirm') || 'Confirm',
          style: 'default',
          onPress: async () => {
            setActionLoadingId(bookingId);
            try {
              const res = await driverService.reachDestination(bookingId);
              if (res?.data?.success || res?.data?.status === 'success' || res?.success) {
                Alert.alert(t('success'), 'Trip marked as Completed!');
                fetchBusBookings();
              } else {
                Alert.alert(t('error'), res?.data?.message || res?.message || 'Failed to complete ride');
              }
            } catch (err) {
              Alert.alert(t('error'), err.response?.data?.message || 'Failed to complete ride');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // 4. Reject Bus Booking
  const openRejectModal = (item) => {
    setSelectedBooking(item);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedBooking) return;
    setActionLoadingId(selectedBooking._id);
    setRejectModalVisible(false);
    try {
      const res = await driverService.rejectBusBooking(
        selectedBooking._id,
        rejectReason || 'Seats unavailable / schedule change'
      );
      if (res?.data?.success) {
        Alert.alert(t('success'), 'Booking request has been rejected.');
        fetchBusBookings();
      } else {
        Alert.alert(t('error'), res?.data?.message || 'Failed to reject booking');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to reject booking');
    } finally {
      setActionLoadingId(null);
      setSelectedBooking(null);
    }
  };

  const isBookingPendingOtp = (b) => {
    if (b.driverConfirmed || b.confirmationOtpVerifiedAt) return false;
    if (['Completed', 'Cancelled', 'Rejected'].includes(b.bookingStatus)) return false;
    return (
      b.driverConfirmationStatus !== 'Confirmed' ||
      !b.driverConfirmed ||
      b.bookingStatus === 'Pending Admin Confirmation' ||
      b.bookingStatus === 'PENDING_ADMIN_CONFIRMATION' ||
      b.bookingStatus === 'Pending Driver Confirmation' ||
      b.bookingStatus === 'Pending' ||
      b.bookingStatus === 'Awaiting Cash Collection'
    );
  };

  const filteredBookings = bookings.filter((b) => {
    const isPending = isBookingPendingOtp(b);
    if (activeTab === 'PENDING') return isPending;
    if (activeTab === 'CONFIRMED') return !isPending && b.bookingStatus !== 'Cancelled';
    return true;
  });

  const renderBookingItem = ({ item }) => {
    const isPendingConfirmation = isBookingPendingOtp(item);

    const isCompleted = item.bookingStatus === 'Completed' || item.rideStatus === 'Completed';
    const isPaid = Boolean(item.cashCollected) || /^paid$/i.test(item.paymentStatus || '') || /^successful$/i.test(item.paymentStatus || '');
    const isOnlinePayment = Boolean(item.paymentMethod && /esewa|khalti|razorpay|card|netbanking|online/i.test(item.paymentMethod));
    const showCollectCashBtn = !isPaid && !isOnlinePayment && !isCompleted;
    const isLoading = actionLoadingId === item._id || actionLoadingId === item.bookingId;

    return (
      <View style={styles.card}>
        {/* Header: ID, Status Badges */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.bookingId}>#{item._id?.slice(-6)?.toUpperCase()}</Text>
            <Text style={styles.serviceTag}>
              {item.serviceType === 'EV_SEWA' ? '⚡ EV-Sewa Express' : '🚌 Intercity Bus'}
            </Text>
          </View>
          <View style={styles.badgeCol}>
            <View style={[
              styles.statusBadge,
              isPendingConfirmation
                ? { backgroundColor: COLORS.warning + '20', borderColor: COLORS.warning }
                : { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: isPendingConfirmation ? COLORS.warning : COLORS.success }
              ]}>
                {isPendingConfirmation ? t('pendingConfirmation') : t('confirmed')}
              </Text>
            </View>

            <View style={[
              styles.paymentBadge,
              isPaid
                ? { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }
                : { backgroundColor: COLORS.danger + '20', borderColor: COLORS.danger }
            ]}>
              <Text style={[
                styles.paymentBadgeText,
                { color: isPaid ? COLORS.success : COLORS.danger }
              ]}>
                {isPaid ? t('paid') : t('unpaid')} ({item.paymentMethod || 'CASH'})
              </Text>
            </View>
          </View>
        </View>

        {/* Passenger & Seats Info */}
        <View style={styles.passengerRow}>
          <MaterialCommunityIcons name="account" size={18} color={COLORS.primary} />
          <Text style={styles.passengerName}>
            {item.user?.name || item.passengerName || 'Passenger'}
          </Text>
          <View style={styles.seatsContainer}>
            <MaterialCommunityIcons name="seat-passenger" size={16} color={COLORS.textSecondary} />
            <Text style={styles.seatNumbers}>
              Seats: {item.seats?.join(', ') || item.seatNumber || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeBox}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.pickupLocation || item.from || 'Origin'}
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-down" size={14} color={COLORS.textMuted} style={{ marginLeft: 3 }} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.dropLocation || item.to || 'Destination'}
            </Text>
          </View>
        </View>

        {/* Fare Details */}
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>{t('totalFare')}:</Text>
          <Text style={styles.fareAmount}>₹{item.totalFare || 0}</Text>
        </View>

        {/* Action Buttons */}
        {isPendingConfirmation ? (
          <CustomerOtpVerificationCard
            booking={item}
            onVerified={fetchBusBookings}
          />
        ) : isCompleted ? (
          <View style={styles.completedBox}>
            <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
            <Text style={styles.completedText}>{t('tripCompleted') || 'Trip Completed'}</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            {showCollectCashBtn && (
              <TouchableOpacity
                style={[styles.cashBtn, isLoading && { opacity: 0.6 }]}
                onPress={() => handleCollectCash(item._id, item.totalFare || 0)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cash-register" size={16} color={COLORS.bgDark} />
                    <Text style={styles.cashBtnText}>
                      {t('collectCash')} (₹{item.totalFare || 0})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.completeRideBtn, isLoading && { opacity: 0.6 }]}
              onPress={() => handleReachDestination(item._id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="flag-checkered" size={16} color={COLORS.white} />
                  <Text style={styles.completeRideBtnText}>
                    {t('destinationReached') || 'Destination Reached'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>{t('busSeatConfirmation')}</Text>
          <Text style={styles.headerSubtitle}>{t('conductorPanelSub')}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PENDING' && styles.tabItemActive]}
          onPress={() => setActiveTab('PENDING')}
        >
          <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
            {t('pending')} ({bookings.filter((b) => b.bookingStatus === 'Pending Driver Confirmation' || b.driverConfirmation === 'PENDING').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'CONFIRMED' && styles.tabItemActive]}
          onPress={() => setActiveTab('CONFIRMED')}
        >
          <Text style={[styles.tabText, activeTab === 'CONFIRMED' && styles.tabTextActive]}>
            {t('confirmed')} ({bookings.filter((b) => b.bookingStatus !== 'Pending Driver Confirmation' && b.driverConfirmation !== 'PENDING' && b.bookingStatus !== 'Cancelled').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ALL' && styles.tabItemActive]}
          onPress={() => setActiveTab('ALL')}
        >
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
            {t('all')} ({bookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="bus-stop" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'PENDING' ? t('noPendingBusBookings') : t('noBookingsFound')}
          </Text>
          <Text style={styles.emptySub}>Pull down to refresh new bus seat requests</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.rejectModalCard}>
            <Text style={styles.modalTitle}>{t('rejectBooking')}</Text>
            <Text style={styles.modalSub}>
              Please select or enter the reason for rejecting seat booking #{selectedBooking?._id?.slice(-6)?.toUpperCase()}.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Bus fully booked / Engine issue"
              placeholderTextColor={COLORS.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRejectBtn}
                onPress={handleConfirmReject}
              >
                <Text style={styles.modalConfirmRejectText}>{t('confirmReject')}</Text>
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
  headerTitleCol: {
    marginLeft: SPACING.s,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSurface,
    padding: SPACING.xs,
    marginHorizontal: SPACING.m,
    marginVertical: SPACING.s,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.s,
  },
  tabItemActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.s,
  },
  bookingId: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  serviceTag: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.s,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.s,
    borderWidth: 1,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 6,
    flex: 1,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSurface,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.s,
    gap: 4,
  },
  seatNumbers: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  routeBox: {
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.s,
    marginVertical: SPACING.s,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.s,
  },
  fareLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.success,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginTop: SPACING.xs,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.danger,
    gap: 4,
  },
  rejectBtnText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.success,
    gap: 4,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  cashBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.warning,
    gap: 4,
  },
  cashBtnText: {
    color: COLORS.bgDark,
    fontWeight: '800',
    fontSize: 12,
  },
  completeRideBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.primary,
    gap: 4,
  },
  completeRideBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.success + '15',
    borderRadius: RADIUS.m,
    gap: 6,
    marginTop: SPACING.xs,
  },
  completedText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.m,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.m,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: SPACING.l,
  },
  rejectModalCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.l,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginVertical: SPACING.s,
  },
  reasonInput: {
    backgroundColor: COLORS.bgDark,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.m,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.bgCard,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalConfirmRejectBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.danger,
  },
  modalConfirmRejectText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
