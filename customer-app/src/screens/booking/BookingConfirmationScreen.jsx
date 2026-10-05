import React, { useState, useEffect } from 'react';
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
import { customerService } from '../../services/customerService';

const formatTravelDate = value => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatPickupTime = value => {
  if (!value || typeof value !== 'string') return 'Not available';
  const time = value.trim();
  const twelveHourTime = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (
    twelveHourTime &&
    Number(twelveHourTime[1]) >= 1 &&
    Number(twelveHourTime[1]) <= 12 &&
    Number(twelveHourTime[2]) <= 59
  ) {
    return `${twelveHourTime[1].padStart(2, '0')}:${twelveHourTime[2]} ${twelveHourTime[3].toUpperCase()}`;
  }

  const twentyFourHourTime = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHourTime) {
    const hours = Number(twentyFourHourTime[1]);
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${String(hours % 12 || 12).padStart(2, '0')}:${twentyFourHourTime[2]} ${period}`;
  }

  return 'Not available';
};

const BookingConfirmationScreen = ({ route, navigation }) => {
  const { booking: initialBooking, payment } = route.params || {};
  const [booking, setBooking] = useState(initialBooking);

  useEffect(() => {
    let notificationListener = null;
    try {
      const Notifications = require('expo-notifications');
      notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
        const data = notification.request.content.data;
        if (data && data.type === 'INSTANT_BOOKING_FARE_UPDATED' && data.bookingId === (booking?._id || booking?.bookingId)) {
          console.log('Real-time push received! Refreshing confirmation...');
          try {
            const res = await customerService.getBookingDetails(booking?._id || booking?.bookingId);
            if (res.success) {
              setBooking(res.data);
            }
          } catch(e){}
        }
      });
    } catch (e) {
      console.warn('Expo Notifications not loaded', e);
    }

    const { AppState } = require('react-native');
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'active') {
        try {
          const res = await customerService.getBookingDetails(booking?._id || booking?.bookingId);
          if (res.success) {
            setBooking(res.data);
          }
        } catch(e){}
      }
    });

    return () => {
      subscription.remove();
      if (notificationListener) {
        try {
          const Notifications = require('expo-notifications');
          Notifications.removeNotificationSubscription(notificationListener);
        } catch(e){}
      }
    };
  }, [booking]);

  const { useFocusEffect } = require('@react-navigation/native');
  useFocusEffect(
    React.useCallback(() => {
      const fetchDetails = async () => {
        try {
          const res = await customerService.getBookingDetails(booking?._id || booking?.bookingId);
          if (res.success) {
            setBooking(res.data);
          }
        } catch(e){}
      };
      fetchDetails();
    }, [booking?._id, booking?.bookingId])
  );

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
        backgroundColor="#0F1B3D"
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
          <View style={[styles.successIcon, (isPendingDriver || isPendingAdmin) ? { backgroundColor: '#3B82F6', shadowColor: '#3B82F6' } : { backgroundColor: '#10B981', shadowColor: '#10B981' }]}>
            <Ionicons name={isPendingAdmin ? 'shield-checkmark' : isPendingDriver ? 'time' : 'checkmark'} size={36} color="#FFFFFF" />
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
            <View style={{ 
              marginTop: 20, 
              alignItems: 'center', 
              width: '100%', 
              backgroundColor: '#EFF6FF', 
              padding: 20, 
              borderRadius: 16, 
              borderWidth: 1, 
              borderColor: '#D6E4F0',
              borderStyle: 'dashed'
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Customer OTP</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#2563EB', letterSpacing: 8, marginVertical: 8 }}>
                {booking?.confirmationOtp || '------'}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 }}>
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
            <Text style={styles.rowLabel}>Driver Name</Text>
            <Text style={[styles.rowValue, styles.emphasizedValue]} numberOfLines={2}>
              {booking?.driver?.name || booking?.hiredVehicleDetails?.driverName || 'Not assigned'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vehicle</Text>
            <Text style={styles.rowValue}>
              {booking?.vehicle?.busName || booking?.vehicle?.vehicleName || 'Not assigned'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vehicle Number</Text>
            <Text style={[styles.rowValue, styles.emphasizedValue]} numberOfLines={1}>
              {booking?.vehicle?.vehicleNumber || booking?.vehicle?.busNumber || 'Not assigned'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Travel Date</Text>
            <Text style={styles.rowValue}>
              {formatTravelDate(booking?.travelDate)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Pickup Time</Text>
            <Text style={styles.rowValue}>
              {formatPickupTime(
                booking?.pickupTime ||
                booking?.departureTime ||
                booking?.scheduleId?.departureTime
              )}
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
            <Text style={styles.fareAmount}>
              {booking?.bookingMode === 'INSTANT' && booking?.bookingStatus === 'Pending Driver Confirmation' && booking?.fare === 0
                ? 'Calculating...'
                : `₹${booking?.fare}`}
            </Text>
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
          {(booking?.bookingStatus === 'Pending' && booking?.paymentMethod === 'ESEWA') ? (
            <Button
              title="Proceed to eSewa Payment"
              onPress={() => {
                navigation.navigate('Payment', {
                  bookingId: booking._id || booking.bookingId,
                  bookingCode: booking.bookingId || booking.bookingCode,
                  bookingMode: booking.bookingMode,
                  amount: booking.fare,
                  isOnlinePayment: true
                });
              }}
              style={{ backgroundColor: '#10B981' }}
            />
          ) : (
            <Button
              title={isPendingDriver ? 'View Booking Status' : 'View Digital Ticket'}
              onPress={handleViewTicket}
              style={{ backgroundColor: isPendingDriver ? '#F59E0B' : '#2563EB' }}
            />
          )}

          <Button
            title="Back to Home"
            variant="outline"
            onPress={handleGoHome}
            style={{ borderColor: '#D6E4F0', backgroundColor: '#FFFFFF' }}
            textStyle={{ color: '#2563EB' }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D6E4F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  },
  bookingIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#D6E4F0'
  },
  bookingIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  bookingIdVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    flex: 1,
    paddingRight: 12,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1.5,
    textAlign: 'right',
    lineHeight: 20,
  },
  emphasizedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  divider: {
    height: 1,
    backgroundColor: '#D6E4F0',
    marginVertical: 16
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB'
  },
  txId: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B'
  },
  cashNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#D6E4F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cashNoticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  cashNoticeSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20
  },
  buttonGroup: {
    marginTop: 4,
    gap: 12,
  }
});

export default BookingConfirmationScreen;
