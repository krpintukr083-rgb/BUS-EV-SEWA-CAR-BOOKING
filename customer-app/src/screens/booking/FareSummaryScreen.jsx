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
import { useBooking } from '../../context/BookingContext';
import { customerService } from '../../services/customerService';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';

const FareSummaryScreen = ({ navigation }) => {
  const { bookingDraft, updateDraft } = useBooking();
  const [loading, setLoading] = useState(false);
  const [busOffer, setBusOffer] = useState(null);

  useEffect(() => {
    const fetchOffer = async () => {
      if (bookingDraft.serviceType === 'Bus') {
        try {
          const res = await customerService.getBusOffer();
          if (res && res.success && res.data) {
            setBusOffer(res.data);
          }
        } catch (err) {
          console.log('Error fetching bus offer on FareSummary:', err);
        }
      }
    };
    fetchOffer();
  }, [bookingDraft.serviceType]);

  const getServiceColor = () => {
    if (bookingDraft.serviceType === 'EV-Sewa') return COLORS.evBadge;
    if (bookingDraft.serviceType === 'Car') return '#ea580c';
    return COLORS.primary;
  };

  const serviceColor = getServiceColor();

  const seatCount = (bookingDraft.serviceType === 'Bus' && bookingDraft.selectedSeats && bookingDraft.selectedSeats.length > 0)
    ? bookingDraft.selectedSeats.length
    : 1;
  const baseSeatRate = bookingDraft.vehicle?.fareRate || bookingDraft.vehicle?.fare || bookingDraft.baseFare || 0;
  const originalFare = baseSeatRate * seatCount;

  let discountPct = 0;
  let discountAmt = 0;
  let totalPayable = originalFare;

  if (
    bookingDraft.serviceType === 'Bus' &&
    busOffer &&
    busOffer.offerStatus === 'active' &&
    Number(busOffer.discountPercentage) > 0
  ) {
    discountPct = Number(busOffer.discountPercentage);
    discountAmt = Math.round(((originalFare * discountPct) / 100) * 100) / 100;
    totalPayable = Math.max(0, originalFare - discountAmt);
  }

  const handleProceedToPayment = async () => {
    try {
      setLoading(true);

      const payload = {
        vehicleId: bookingDraft.vehicle?._id,
        serviceType: bookingDraft.serviceType,
        pickupLocation: bookingDraft.pickupLocation,
        dropLocation: bookingDraft.dropLocation,
        passengerDetails: bookingDraft.passengerDetails,
        selectedSeats: bookingDraft.selectedSeats,
        fare: totalPayable,
        travelDate: bookingDraft.travelDate
      };

      const res = await customerService.createBooking(payload);

      if (res.success) {
        updateDraft({ confirmedBooking: res.data });
        navigation.navigate('Payment', {
          bookingId: res.data._id,
          bookingCode: res.data.bookingId,
          amount: res.data.fare || res.data.finalFare || totalPayable
        });
      } else {
        Alert.alert('Booking Error', res.message || 'Unable to create booking');
      }
    } catch (err) {
      console.log('Error creating booking:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to initialize booking';
      Alert.alert('Booking Notice', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Fare / Booking Summary" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Header Card */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={[styles.serviceTag, { backgroundColor: serviceColor + '15' }]}>
              <Ionicons
                name={
                  bookingDraft.serviceType === 'Bus'
                    ? 'bus'
                    : bookingDraft.serviceType === 'EV-Sewa'
                    ? 'leaf'
                    : 'car-sport'
                }
                size={14}
                color={serviceColor}
              />
              <Text style={[styles.serviceTagText, { color: serviceColor }]}>
                {bookingDraft.serviceType} Booking
              </Text>
            </View>
            <Text style={[styles.serviceFare, { color: serviceColor }]}>
              ₹{totalPayable}
            </Text>
          </View>

          <Text style={styles.vehicleTitle}>
            {bookingDraft.vehicle?.busName || bookingDraft.vehicle?.vehicleName || 'Standard Vehicle'}
          </Text>
          <Text style={styles.vehicleSub}>
            {bookingDraft.vehicle?.busNumber || bookingDraft.vehicle?.vehicleNumber} •{' '}
            {bookingDraft.vehicle?.busType || bookingDraft.vehicle?.vehicleModel}
          </Text>
        </View>

        {/* Route / Trip Details */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Trip Route</Text>

          <View style={styles.timeline}>
            <View style={styles.pointRow}>
              <View style={styles.originCircle} />
              <View style={styles.pointInfo}>
                <Text style={styles.pointLabel}>Pickup Point</Text>
                <Text style={styles.pointValue}>{bookingDraft.pickupLocation}</Text>
              </View>
            </View>
            <View style={styles.trackLine} />
            <View style={styles.pointRow}>
              <View style={styles.destCircle} />
              <View style={styles.pointInfo}>
                <Text style={styles.pointLabel}>Drop-off Point</Text>
                <Text style={styles.pointValue}>{bookingDraft.dropLocation}</Text>
              </View>
            </View>
          </View>

          {/* Seat selection if applicable */}
          {bookingDraft.selectedSeats && bookingDraft.selectedSeats.length > 0 && (
            <View style={styles.seatRow}>
              <Text style={styles.seatLabel}>Selected Seat(s):</Text>
              <View style={styles.seatsContainer}>
                {bookingDraft.selectedSeats.map(seat => (
                  <View key={seat} style={styles.seatBadge}>
                    <Text style={styles.seatBadgeText}>Seat {seat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Passenger Summary */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Passenger(s) Details</Text>
          {bookingDraft.passengerDetails?.map((p, idx) => (
            <View key={idx} style={styles.passengerSummaryRow}>
              <View style={styles.avatarMini}>
                <Text style={styles.avatarText}>{p.name?.charAt(0) || 'P'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerName}>{p.name}</Text>
                <Text style={styles.passengerMeta}>
                  {p.gender}, {p.age} yrs • +91 {p.phone}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Fare Breakdown */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Fare Breakdown</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Original Fare</Text>
            <Text style={styles.billVal}>₹{originalFare}</Text>
          </View>

          {discountAmt > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: COLORS.success, fontWeight: '700' }]}>
                Discount ({discountPct}%)
              </Text>
              <Text style={[styles.billVal, { color: COLORS.success, fontWeight: '700' }]}>
                -₹{discountAmt}
              </Text>
            </View>
          )}

          {bookingDraft.serviceType === 'Bus' && seatCount > 1 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>
                Seat Multiplier ({seatCount} seats × ₹{baseSeatRate})
              </Text>
              <Text style={styles.billVal}>₹{originalFare}</Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Platform Convenience Fee</Text>
            <Text style={[styles.billVal, { color: COLORS.success }]}>₹0 (Included)</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Complimentary Transit Insurance</Text>
            <Text style={[styles.billVal, { color: COLORS.success }]}>FREE</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable Amount</Text>
            <Text style={[styles.totalAmount, { color: serviceColor }]}>
              ₹{totalPayable}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <Button
          title={loading ? 'Creating Booking...' : 'Proceed to Payment'}
          onPress={handleProceedToPayment}
          loading={loading}
          disabled={loading}
          style={{ backgroundColor: serviceColor }}
        />
      </View>
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
    paddingBottom: 100
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  serviceTagText: {
    fontSize: 12,
    fontWeight: '700'
  },
  serviceFare: {
    fontSize: 20,
    fontWeight: '800'
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  vehicleSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 12
  },
  timeline: {
    paddingLeft: 4,
    marginBottom: 8
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  originCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginRight: 12
  },
  destCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 12
  },
  trackLine: {
    width: 2,
    height: 22,
    backgroundColor: '#cbd5e1',
    marginLeft: 4,
    marginVertical: 2
  },
  pointInfo: {
    flex: 1
  },
  pointLabel: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  pointValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8
  },
  seatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  seatsContainer: {
    flexDirection: 'row',
    gap: 6
  },
  seatBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  seatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  passengerSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  passengerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkNavy
  },
  passengerMeta: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  billLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  billVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkNavy
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '900'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8
  }
});

export default FareSummaryScreen;
