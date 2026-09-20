import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import QRCodeWidget from '../../components/QRCodeWidget';
import StatusBadge from '../../components/StatusBadge';
import { COLORS } from '../../constants/colors';

const DigitalTicketScreen = ({ route, navigation }) => {
  const { bookingId, bookingData } = route.params || {};
  const [booking, setBooking] = useState(bookingData || null);
  const [loading, setLoading] = useState(!bookingData && !!bookingId);

  useEffect(() => {
    if (bookingId && !booking) {
      const fetchTicket = async () => {
        try {
          const res = await customerService.getBookingDetails(bookingId);
          if (res.success) {
            setBooking(res.data);
          }
        } catch (err) {
          console.log('Error fetching ticket:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchTicket();
    }
  }, [bookingId]);

  const handleShareTicket = async () => {
    try {
      await Share.share({
        message: `Boarding Pass & Ticket Details:\nBooking ID: ${booking?.bookingId}\nService: ${booking?.serviceType}\nFrom: ${booking?.pickupLocation}\nTo: ${booking?.dropLocation}\nStatus: ${booking?.bookingStatus}`
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Digital Boarding Pass...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="ticket-outline" size={54} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>Digital Ticket not found</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Main', { screen: 'MyBookings' })}
        >
          <Text style={styles.backBtnText}>Go to My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const travelDateFormatted = booking.travelDate
    ? new Date(booking.travelDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN');

  return (
    <View style={styles.container}>
      <Header
        title="Digital Ticket"
        onBack={() => navigation.goBack()}
        rightIcon="share-social-outline"
        onRightPress={handleShareTicket}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ticket Container (Pass Styling) */}
        <View style={styles.ticketCard}>
          {/* Header of Ticket */}
          <View style={styles.ticketTop}>
            <View style={styles.topRow}>
              <View style={styles.brandGroup}>
                <Ionicons name="bus" size={20} color="#ffffff" />
                <Text style={styles.brandTitle}>TravelEase Pass</Text>
              </View>
              <View style={[styles.statusPill, booking.bookingStatus === 'Pending Driver Confirmation' && { backgroundColor: '#f59e0b' }, booking.bookingStatus === 'Rejected' && { backgroundColor: '#ef4444' }]}>
                <Text style={styles.statusPillText}>{booking.bookingStatus || 'Confirmed'}</Text>
              </View>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.serviceName}>{booking.serviceType} Service</Text>
              <Text style={styles.vehicleNumber}>
                {booking.vehicle?.busName || booking.vehicle?.vehicleName || 'Standard Express'} (
                {booking.vehicle?.busNumber || booking.vehicle?.vehicleNumber || 'DL 01 AA 0000'})
              </Text>
            </View>
          </View>

          {/* Ticket Body */}
          <View style={styles.ticketBody}>
            {/* Passenger & Date info */}
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>PASSENGER</Text>
                <Text style={styles.fieldVal}>
                  {booking.passengerDetails?.[0]?.name || booking.customer?.name || 'Primary Traveler'}
                </Text>
                <Text style={styles.fieldSub}>
                  {booking.passengerDetails?.[0]?.gender || 'Adult'}, Age {booking.passengerDetails?.[0]?.age || '25'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.fieldLabel}>TRAVEL DATE</Text>
                <Text style={styles.fieldVal}>{travelDateFormatted}</Text>
                <Text style={styles.fieldSub}>Reporting 15m prior</Text>
              </View>
            </View>

            {/* Route Timeline */}
            <View style={styles.routeBox}>
              <View style={styles.routePoint}>
                <Ionicons name="radio-button-on" size={14} color={COLORS.primary} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.routePointLabel}>Boarding / Pickup</Text>
                  <Text style={styles.routePointValue}>{booking.pickupLocation}</Text>
                </View>
              </View>
              <View style={styles.trackLine} />
              <View style={styles.routePoint}>
                <Ionicons name="location" size={14} color="#ef4444" />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.routePointLabel}>Dropping / Destination</Text>
                  <Text style={styles.routePointValue}>{booking.dropLocation}</Text>
                </View>
              </View>
            </View>

            {/* Seat & Fare Row */}
            <View style={styles.metaRow}>
              {booking.busSeatNumbers && booking.busSeatNumbers.length > 0 ? (
                <View>
                  <Text style={styles.fieldLabel}>SEAT NUMBER(S)</Text>
                  <Text style={[styles.fieldVal, { color: COLORS.primary }]}>
                    {Array.isArray(booking.busSeatNumbers) ? booking.busSeatNumbers.join(', ') : String(booking.busSeatNumbers)}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.fieldLabel}>CATEGORY</Text>
                  <Text style={styles.fieldVal}>{booking.serviceType} Dedicated</Text>
                </View>
              )}

              <View style={{ alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>PAYMENT</Text>
                <Text
                  style={[
                    styles.fieldVal,
                    {
                      color:
                        booking.paymentStatus === 'Paid' || booking.cashCollected
                          ? COLORS.success
                          : booking.paymentMethod === 'Offline Cash'
                          ? '#d97706'
                          : COLORS.success
                    }
                  ]}
                >
                  {booking.paymentMethod === 'Offline Cash'
                    ? booking.paymentStatus === 'Paid' || booking.cashCollected
                      ? 'Paid (Cash)'
                      : booking.driverConfirmationStatus === 'Confirmed' || booking.bookingStatus === 'Awaiting Cash Collection'
                      ? 'Seat Confirmed (Pay Cash on Boarding)'
                      : 'Pending Cash'
                    : 'Paid Online'}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.fieldLabel}>TOTAL FARE</Text>
                <Text style={styles.totalFare}>₹{booking.fare}</Text>
              </View>
            </View>

            {/* Perforated Divider */}
            <View style={styles.perforatedWrap}>
              <View style={styles.cutoutLeft} />
              <View style={styles.dashedLine} />
              <View style={styles.cutoutRight} />
            </View>

            {/* QR Code Section or Pending Notice */}
            {booking.bookingStatus === 'Confirmed' && booking.driverConfirmationStatus === 'Confirmed' && (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful') ? (
              <QRCodeWidget code={booking.bookingId} />
            ) : booking.bookingStatus === 'Awaiting Cash Collection' ? (
              <View style={styles.pendingQrBox}>
                <Ionicons name="cash-outline" size={40} color="#6366f1" />
                <Text style={[styles.pendingQrTitle, { color: '#4f46e5' }]}>Awaiting Cash Collection</Text>
                <Text style={styles.pendingQrSub}>
                  Your seat is confirmed by the driver! Please pay ₹{booking.fare} in cash to the conductor/driver upon boarding to activate your verified digital boarding pass.
                </Text>
                <View style={styles.bookingIdTag}>
                  <Text style={styles.bookingIdTagText}>Booking #{booking.bookingId}</Text>
                </View>
              </View>
            ) : booking.bookingStatus === 'Pending Driver Confirmation' ? (
              <View style={styles.pendingQrBox}>
                <Ionicons name="hourglass-outline" size={40} color="#f59e0b" />
                <Text style={styles.pendingQrTitle}>Waiting for Driver Confirmation</Text>
                <Text style={styles.pendingQrSub}>
                  Waiting for assigned driver/conductor confirmation. QR pass will activate immediately upon confirmation.
                </Text>
                <View style={styles.bookingIdTag}>
                  <Text style={styles.bookingIdTagText}>Booking #{booking.bookingId}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.pendingQrBox}>
                <Ionicons name="close-circle-outline" size={40} color="#ef4444" />
                <Text style={[styles.pendingQrTitle, { color: '#ef4444' }]}>Booking {booking.bookingStatus}</Text>
                <Text style={styles.pendingQrSub}>
                  This booking is {booking.bookingStatus?.toLowerCase()}. No boarding pass is active.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Offline Cash Status Callout */}
        {booking.paymentMethod === 'Offline Cash' && (
          <View
            style={[
              styles.cashCallout,
              booking.paymentStatus === 'Paid' || booking.cashCollected
                ? styles.cashCalloutSuccess
                : styles.cashCalloutPending
            ]}
          >
            <Ionicons
              name={booking.paymentStatus === 'Paid' || booking.cashCollected ? 'checkmark-circle' : 'cash'}
              size={20}
              color={booking.paymentStatus === 'Paid' || booking.cashCollected ? '#059669' : '#d97706'}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[
                  styles.cashCalloutTitle,
                  {
                    color:
                      booking.paymentStatus === 'Paid' || booking.cashCollected ? '#065f46' : '#92400e'
                  }
                ]}
              >
                {booking.paymentStatus === 'Paid' || booking.cashCollected
                  ? 'Cash Payment Collected'
                  : 'Cash Payment Pending on Boarding'}
              </Text>
              <Text
                style={[
                  styles.cashCalloutSub,
                  {
                    color:
                      booking.paymentStatus === 'Paid' || booking.cashCollected ? '#047857' : '#b45309'
                  }
                ]}
              >
                {booking.paymentStatus === 'Paid' || booking.cashCollected
                  ? `₹${booking.fare} cash verified and collected by assigned crew.`
                  : `Please keep exact fare of ₹${booking.fare} in cash ready for the driver / conductor.`}
              </Text>
            </View>
          </View>
        )}

        {/* Support note */}
        <View style={styles.guidelineCard}>
          <Text style={styles.guidelineTitle}>Boarding Guidelines</Text>
          <Text style={styles.guidelineText}>
            • Carry a valid government issued photo ID during travel.
          </Text>
          <Text style={styles.guidelineText}>
            • Show this QR pass directly on your smartphone to the driver.
          </Text>
          <Text style={styles.guidelineText}>
            • Transit coverage is active for this trip under statutory insurance provisions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16
  },
  ticketTop: {
    backgroundColor: COLORS.primary,
    padding: 18
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  statusPill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  statusPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  headerInfo: {},
  serviceName: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600'
  },
  vehicleNumber: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2
  },
  ticketBody: {
    padding: 16
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2
  },
  fieldVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  fieldSub: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  routeBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trackLine: {
    width: 2,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginLeft: 6,
    marginVertical: 2
  },
  routePointLabel: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  routePointValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  totalFare: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary
  },
  perforatedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    marginHorizontal: -16
  },
  cutoutLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f1f5f9'
  },
  cutoutRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f1f5f9'
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed'
  },
  cashCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5
  },
  cashCalloutSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0'
  },
  cashCalloutPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a'
  },
  cashCalloutTitle: {
    fontSize: 13,
    fontWeight: '800'
  },
  cashCalloutSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16
  },
  pendingQrBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed'
  },
  pendingQrTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8
  },
  pendingQrSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280
  },
  bookingIdTag: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  bookingIdTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8'
  },
  guidelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  guidelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 8
  },
  guidelineText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginVertical: 12
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});

export default DigitalTicketScreen;
