import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { COLORS } from '../../constants/colors';

const BookingConfirmationScreen = ({ route, navigation }) => {
  const { booking, payment } = route.params || {};

  const handleViewTicket = () => {
    navigation.navigate('DigitalTicket', { bookingId: booking?._id || booking?.bookingId, bookingData: booking });
  };

  const handleGoHome = () => {
    navigation.navigate('Main', { screen: 'Home' });
  };

  const isPendingAdmin =
    booking?.bookingStatus === 'Pending Admin Confirmation' ||
    booking?.bookingStatus === 'PENDING_ADMIN_CONFIRMATION';
  const isPendingDriver = booking?.bookingStatus === 'Pending Driver Confirmation';

  return (
    <View style={styles.container}>
      <Header
        title={
          isPendingAdmin
            ? 'Booking Onboarding'
            : isPendingDriver
            ? 'Booking Request Submitted'
            : 'Booking Confirmation'
        }
        onBack={handleGoHome}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <View style={styles.heroCard}>
          <View style={[styles.successIcon, (isPendingDriver || isPendingAdmin) && { backgroundColor: '#3b82f6' }]}>
            <Ionicons name={isPendingAdmin ? 'shield-checkmark' : isPendingDriver ? 'time' : 'checkmark'} size={36} color="#ffffff" />
          </View>
          <Text style={styles.heroTitle}>
            {isPendingAdmin || isPendingDriver ? 'Waiting for Driver Confirmation' : 'Booking Confirmed!'}
          </Text>
          <Text style={styles.heroSub}>
            {isPendingAdmin || isPendingDriver
              ? 'Your booking request is created. Please provide your Customer OTP to your assigned driver for confirmation.'
              : 'Your travel reservation has been confirmed and driver has been notified.'}
          </Text>

          <View style={styles.bookingIdPill}>
            <Text style={styles.bookingIdLabel}>Booking ID:</Text>
            <Text style={styles.bookingIdVal}>{booking?.bookingId || 'BK-CONFIRMED'}</Text>
          </View>

          {/* OTP Box */}
          {(isPendingAdmin || isPendingDriver || booking?.confirmationOtp) && (
            <View style={{ marginTop: 16, alignItems: 'center', width: '100%', backgroundColor: '#eff6ff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Customer OTP</Text>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#1d4ed8', letterSpacing: 5, marginVertical: 4 }}>
                {booking?.confirmationOtp || '------'}
              </Text>
              <Text style={{ fontSize: 11, color: '#1e3a8a', textAlign: 'center', lineHeight: 16 }}>
                Give this OTP to your assigned driver for confirmation.
              </Text>
            </View>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Reservation Summary</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Booking Status</Text>
            <StatusBadge status={booking?.bookingStatus || 'Pending Driver Confirmation'} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Service Type</Text>
            <Text style={styles.rowValue}>{booking?.serviceType || 'Bus'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vehicle</Text>
            <Text style={styles.rowValue}>
              {booking?.vehicle?.busName || booking?.vehicle?.vehicleName || 'Commercial Transport'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Pickup Point</Text>
            <Text style={styles.rowValue} numberOfLines={2}>{booking?.pickupLocation}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Drop-off Point</Text>
            <Text style={styles.rowValue} numberOfLines={2}>{booking?.dropLocation}</Text>
          </View>

          {booking?.busSeatNumbers && booking.busSeatNumbers.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Seats</Text>
              <Text style={styles.rowValue}>
                {Array.isArray(booking.busSeatNumbers) ? booking.busSeatNumbers.join(', ') : String(booking.busSeatNumbers)}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{booking?.serviceType === 'EV-Sewa' ? 'Passengers' : 'Passenger'}</Text>
            <Text style={styles.rowValue}>
              {booking?.serviceType === 'EV-Sewa'
                ? booking?.passengerDetails?.length || 1
                : booking?.passengerDetails?.[0]?.name || booking?.customer?.name || 'Primary Passenger'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Fare</Text>
            <Text style={styles.fareAmount}>₹{booking?.fare}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Payment Method</Text>
            <Text style={styles.rowValue}>
              {booking?.paymentMethod || payment?.paymentMethod || 'Online (Razorpay)'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Payment Status</Text>
            <StatusBadge
              status={booking?.paymentStatus || payment?.paymentStatus || (booking?.paymentMethod === 'Offline Cash' ? 'Pending Cash' : 'Paid')}
            />
          </View>

          {payment?.transactionId ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Transaction ID</Text>
              <Text style={styles.txId}>{payment.transactionId}</Text>
            </View>
          ) : null}
        </View>

        {/* Offline Cash Notice Card */}
        {(booking?.paymentMethod === 'Offline Cash' || payment?.paymentMethod === 'Offline Cash') && (
          <View style={styles.cashNoticeBox}>
            <Ionicons name="cash" size={22} color="#059669" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cashNoticeTitle}>Cash Payment on Boarding</Text>
              <Text style={styles.cashNoticeSub}>
                Your seat reservation request has been transmitted. Please keep <Text style={{ fontWeight: '800' }}>₹{booking?.fare}</Text> cash ready to pay the conductor or driver when you board.
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <Button
            title={isPendingDriver ? 'View Booking Status' : 'View Digital Ticket'}
            onPress={handleViewTicket}
            style={{ backgroundColor: isPendingDriver ? '#f59e0b' : COLORS.primary, marginBottom: 12 }}
          />

          <Button
            title="Back to Home"
            variant="outline"
            onPress={handleGoHome}
          />
        </View>
      </ScrollView>
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
    paddingBottom: 40
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  heroSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  bookingIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  bookingIdLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  bookingIdVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkNavy,
    maxWidth: '60%',
    textAlign: 'right'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  txId: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  cashNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16
  },
  cashNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46'
  },
  cashNoticeSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 3,
    lineHeight: 18
  },
  buttonGroup: {
    marginTop: 8
  }
});

export default BookingConfirmationScreen;
