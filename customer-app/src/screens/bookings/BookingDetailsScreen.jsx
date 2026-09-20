import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { COLORS } from '../../constants/colors';

const BookingDetailsScreen = ({ route, navigation }) => {
  const { bookingId } = route.params || {};
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const res = await customerService.getBookingDetails(bookingId);
      if (res.success) {
        setBooking(res.data);
      }
    } catch (err) {
      console.log('Error fetching booking details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    const interval = setInterval(() => {
      fetchDetails();
    }, 3000);

    return () => clearInterval(interval);
  }, [bookingId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching reservation details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>Booking not found</Text>
        <Button title="Back to Bookings" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const isPendingAdmin =
    booking.bookingStatus === 'Pending Admin Confirmation' ||
    booking.bookingStatus === 'PENDING_ADMIN_CONFIRMATION';
  const isPendingDriver = booking.bookingStatus === 'Pending Driver Confirmation';
  const isAwaitingCash = booking.bookingStatus === 'Awaiting Cash Collection';
  const isCancellable =
    booking.bookingStatus === 'Confirmed' ||
    booking.bookingStatus === 'Pending' ||
    booking.bookingStatus === 'Pending Admin Confirmation' ||
    booking.bookingStatus === 'PENDING_ADMIN_CONFIRMATION' ||
    booking.bookingStatus === 'Pending Driver Confirmation' ||
    booking.bookingStatus === 'Awaiting Cash Collection';

  const travelDateFormatted = booking.travelDate
    ? new Date(booking.travelDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'Scheduled Date';

  return (
    <View style={styles.container}>
      <Header
        title="Booking Details"
        onBack={() => navigation.goBack()}
        rightIcon="ticket-outline"
        onRightPress={() => navigation.navigate('DigitalTicket', { bookingId: booking._id, bookingData: booking })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Pending Driver OTP Card */}
        {(isPendingAdmin || isPendingDriver || booking.confirmationOtp) && (
          <View style={styles.otpCard}>
            <View style={styles.otpCardHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#1d4ed8" />
              <Text style={styles.otpCardTitle}>BOOKING ONBOARDING</Text>
            </View>
            <Text style={styles.otpCardSubtitle}>Waiting for Driver Confirmation</Text>

            <View style={styles.otpBox}>
              <Text style={styles.otpLabel}>Customer OTP</Text>
              <Text style={styles.otpValue}>{booking.confirmationOtp || '------'}</Text>
            </View>

            <Text style={styles.otpMessage}>
              Give this OTP to your assigned driver for confirmation.
            </Text>
          </View>
        )}

        {/* Pending Driver Alert */}
        {isPendingDriver && (
          <View style={styles.pendingStatusBanner}>
            <Ionicons name="time" size={22} color="#b45309" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pendingBannerTitle}>Waiting for Driver Confirmation</Text>
              <Text style={styles.pendingBannerSub}>
                Your booking request has been sent to the assigned vehicle crew. Your boarding pass will activate once confirmed.
              </Text>
            </View>
          </View>
        )}

        {/* Awaiting Cash Collection Alert */}
        {isAwaitingCash && (
          <View style={[styles.pendingStatusBanner, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
            <Ionicons name="cash" size={22} color="#4f46e5" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.pendingBannerTitle, { color: '#3730a3' }]}>Awaiting Cash Collection</Text>
              <Text style={[styles.pendingBannerSub, { color: '#4338ca' }]}>
                Seat confirmed by driver! Please pay ₹{booking.fare} cash upon boarding to activate your ticket.
              </Text>
            </View>
          </View>
        )}

        {/* Top Header Card */}
        <View style={styles.topCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.bookingIdText}>{booking.bookingId}</Text>
              <Text style={styles.serviceSubtitle}>{booking.serviceType} Service</Text>
            </View>
            <StatusBadge status={booking.bookingStatus} />
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Travel Date</Text>
              <Text style={styles.metaVal}>{travelDateFormatted}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Payment Status</Text>
              <Text style={[styles.metaVal, { color: COLORS.success }]}>{booking.paymentStatus}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Total Paid</Text>
              <Text style={styles.metaAmount}>₹{booking.fare}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle & Operator */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Vehicle & Transport</Text>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleIconCircle}>
              <Ionicons
                name={
                  booking.serviceType === 'Bus'
                    ? 'bus'
                    : booking.serviceType === 'EV-Sewa'
                    ? 'leaf'
                    : 'car-sport'
                }
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>
                {booking.vehicle?.busName || booking.vehicle?.vehicleName || 'Registered Transport'}
              </Text>
              <Text style={styles.vehicleNumber}>
                Reg: {booking.vehicle?.busNumber || booking.vehicle?.vehicleNumber || 'N/A'} •{' '}
                {booking.vehicle?.busType || booking.vehicle?.vehicleModel || 'Standard'}
              </Text>
            </View>
          </View>

          {booking.busSeatNumbers && (
            <View style={styles.seatInfo}>
              <Text style={styles.seatInfoLabel}>Allocated Seat(s):</Text>
              <Text style={styles.seatInfoVal}>
                {Array.isArray(booking.busSeatNumbers) ? booking.busSeatNumbers.join(', ') : String(booking.busSeatNumbers)}
              </Text>
            </View>
          )}
        </View>

        {/* Boarding and Drop route */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Boarding & Dropping Points</Text>

          <View style={styles.routeBox}>
            <View style={styles.routeItem}>
              <View style={styles.dotOrigin} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>Pickup / Boarding Point</Text>
                <Text style={styles.routeVal}>{booking.pickupLocation}</Text>
              </View>
            </View>

            <View style={styles.trackLine} />

            <View style={styles.routeItem}>
              <View style={styles.dotDest} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>Drop-off Location</Text>
                <Text style={styles.routeVal}>{booking.dropLocation}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Passenger Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Passenger Details</Text>
          {booking.passengerDetails?.map((p, idx) => (
            <View key={idx} style={styles.passengerRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.passengerName}>{p.name}</Text>
                <Text style={styles.passengerSub}>
                  {p.gender}, Age {p.age} {p.phone ? `• +91 ${p.phone}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Cancellation Notice if cancelled */}
        {booking.bookingStatus === 'Cancelled' && (
          <View style={styles.cancelledCard}>
            <Ionicons name="close-circle" size={24} color={COLORS.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
              <Text style={styles.cancelledSub}>
                Reason: {booking.cancellationReason || 'Requested by customer'}
              </Text>
              <Text style={styles.refundSub}>
                Refund Status: {booking.refundStatus || 'Processed'} (₹{booking.refundAmount || booking.fare})
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="View Digital Ticket"
            onPress={() =>
              navigation.navigate('DigitalTicket', {
                bookingId: booking._id,
                bookingData: booking
              })
            }
            style={{ backgroundColor: COLORS.primary, marginBottom: 12 }}
          />

          {isCancellable && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() =>
                navigation.navigate('BookingCancellation', {
                  bookingId: booking._id,
                  bookingData: booking
                })
              }
            >
              <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.cancelBtnText}>Cancel Booking & Request Refund</Text>
            </TouchableOpacity>
          )}
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
  topCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bookingIdText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  serviceSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaCol: {
    flex: 1
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 2
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  metaAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 12
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  vehicleIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  vehicleNumber: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  seatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6
  },
  seatInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  seatInfoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  routeBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginRight: 10
  },
  dotDest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 10
  },
  trackLine: {
    width: 2,
    height: 20,
    backgroundColor: '#cbd5e1',
    marginLeft: 4,
    marginVertical: 2
  },
  routeLabel: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  routeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  passengerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  passengerSub: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  cancelledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger
  },
  cancelledSub: {
    fontSize: 11,
    color: '#991b1b',
    marginTop: 2
  },
  refundSub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
    marginTop: 2
  },
  actionsContainer: {
    marginTop: 8
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    backgroundColor: '#ffffff'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger
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
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    marginVertical: 12
  },
  pendingStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16
  },
  pendingBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e'
  },
  pendingBannerSub: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
    lineHeight: 16
  },
  otpCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    marginBottom: 16,
    alignItems: 'center'
  },
  otpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  otpCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e40af',
    letterSpacing: 0.5
  },
  otpCardSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 14
  },
  otpBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#93c5fd',
    marginBottom: 12,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  otpLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  otpValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1d4ed8',
    letterSpacing: 6,
    marginTop: 2
  },
  otpMessage: {
    fontSize: 12,
    color: '#1e3a8a',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500'
  }
});

export default BookingDetailsScreen;
