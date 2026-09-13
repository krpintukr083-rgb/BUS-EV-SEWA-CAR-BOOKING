import React, { useState } from 'react';
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
import Input from '../../components/Input';
import { COLORS } from '../../constants/colors';

const BookingCancellationScreen = ({ route, navigation }) => {
  const { bookingId, bookingData } = route.params || {};
  const [reason, setReason] = useState('Change of travel plan');
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);

  const cancellationReasons = [
    'Change of travel plan',
    'Emergency / Medical reasons',
    'Booked alternative transport',
    'Vehicle or timing conflict',
    'Other reason'
  ];

  const bookingFare = bookingData?.fare || 0;
  const cancellationFee = Math.round(bookingFare * 0.1); // 10% standard processing
  const estimatedRefund = Math.max(0, bookingFare - cancellationFee);

  const handleConfirmCancellation = async () => {
    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel booking ${bookingData?.bookingId || bookingId}? An estimated refund of ₹${estimatedRefund} will be credited to your original payment source.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const finalReason = reason === 'Other reason' && customNote.trim() ? customNote.trim() : reason;
              const res = await customerService.cancelBooking(bookingId || bookingData?._id, finalReason);

              if (res.success) {
                Alert.alert(
                  'Cancellation Successful',
                  'Your booking has been cancelled and refund process has been initiated.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('Main', { screen: 'MyBookings' })
                    }
                  ]
                );
              } else {
                Alert.alert('Cancellation Error', res.message || 'Unable to cancel booking');
              }
            } catch (err) {
              console.log('Cancellation error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to cancel booking');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Booking Cancellation" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={24} color="#b45309" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.warningTitle}>Cancellation Policy Notice</Text>
            <Text style={styles.warningSub}>
              Cancellations requested before scheduled departure are eligible for refunds under the Transport Cancellation Terms.
            </Text>
          </View>
        </View>

        {/* Booking Summary Box */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Summary</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Booking ID</Text>
            <Text style={styles.rowVal}>{bookingData?.bookingId || 'BK-REFERENCE'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Service</Text>
            <Text style={styles.rowVal}>{bookingData?.serviceType || 'Transport Service'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vehicle</Text>
            <Text style={styles.rowVal}>
              {bookingData?.vehicle?.busName || bookingData?.vehicle?.vehicleName || 'Registered Transport'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Paid Amount</Text>
            <Text style={styles.rowValBold}>₹{bookingFare}</Text>
          </View>
        </View>

        {/* Reason Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reason for Cancellation</Text>
          {cancellationReasons.map(r => (
            <TouchableOpacity
              key={r}
              style={[
                styles.reasonRow,
                reason === r && styles.selectedReasonRow
              ]}
              onPress={() => setReason(r)}
            >
              <View style={styles.radio}>
                {reason === r && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.reasonText, reason === r && styles.selectedReasonText]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}

          {reason === 'Other reason' && (
            <View style={{ marginTop: 10 }}>
              <Input
                placeholder="Describe your reason..."
                value={customNote}
                onChangeText={setCustomNote}
              />
            </View>
          )}
        </View>

        {/* Refund Estimation Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Refund Estimation</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Original Booking Fare</Text>
            <Text style={styles.rowVal}>₹{bookingFare}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cancellation & Processing Charge (10%)</Text>
            <Text style={[styles.rowVal, { color: COLORS.danger }]}>- ₹{cancellationFee}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Estimated Refund Amount</Text>
            <Text style={styles.totalVal}>₹{estimatedRefund}</Text>
          </View>

          <Text style={styles.refundMethodText}>
            Refund will be initiated to your original payment method within 24-48 business hours.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button
          title={loading ? 'Processing Cancellation...' : 'Confirm Cancellation'}
          onPress={handleConfirmCancellation}
          loading={loading}
          disabled={loading}
          style={{ backgroundColor: COLORS.danger }}
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e'
  },
  warningSub: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
    lineHeight: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkNavy,
    marginBottom: 14
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
  rowVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkNavy
  },
  rowValBold: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6
  },
  selectedReasonRow: {
    backgroundColor: '#eff6ff'
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textPrimary
  },
  selectedReasonText: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.darkNavy
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.success
  },
  refundMethodText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 16
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

export default BookingCancellationScreen;
