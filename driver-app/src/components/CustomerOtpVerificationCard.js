import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import driverService from '../services/driverService';

export default function CustomerOtpVerificationCard({ booking, onVerified, onCancel }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!booking) return null;

  const bookingIdStr = booking.bookingId || booking._id?.slice(-6)?.toUpperCase() || 'N/A';
  const customerName = booking.customer?.name || booking.user?.name || booking.passengerName || 'Passenger';
  const busName = booking.vehicle?.vehicleName || booking.vehicleName || 'Royal Intercity Deluxe Express';
  const vehicleNo = booking.vehicle?.vehicleNumber || booking.vehicleNumber || 'DL 01 AB 4321';
  const seatNo = booking.selectedSeats?.join(', ') || booking.seats?.join(', ') || booking.seatNumber || 'A1';
  const pickup = booking.pickupLocation || booking.from || 'Delhi';
  const drop = booking.dropLocation || booking.to || 'Jaipur';
  const fare = booking.fare || booking.totalFare || 850;

  const isComplete = otp.length === 6;

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the Customer OTP.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const targetId = booking._id || booking.bookingId;
      const res = await driverService.verifyBookingOtp(targetId, otp.trim());
      if (res?.data?.success || res?.status === 200 || res?.data?.status === 'success' || res?.success) {
        Alert.alert('OTP Verified', 'Customer OTP verified successfully. Booking confirmed!');
        if (onVerified) onVerified(booking);
      } else {
        const msg = res?.data?.message || 'Invalid OTP. Please check the 6-digit code with the customer.';
        setErrorMsg(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP. Please check the 6-digit code with the customer.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color={COLORS.primary} />
        <Text style={styles.headerTitle}>BOOKING ONBOARDING</Text>
      </View>

      {/* Details List */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Customer:</Text>
          <Text style={styles.detailValue}>{customerName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Booking ID:</Text>
          <Text style={[styles.detailValue, { color: COLORS.primary }]}>#{bookingIdStr}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bus:</Text>
          <Text style={styles.detailValue}>{busName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle:</Text>
          <Text style={styles.detailValue}>{vehicleNo}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Seat:</Text>
          <Text style={styles.detailValue}>{seatNo}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Route:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{pickup} → {drop}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fare:</Text>
          <Text style={[styles.detailValue, { color: COLORS.success, fontSize: 16, fontWeight: '800' }]}>₹{fare}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Customer OTP Verification Section */}
      <View style={styles.otpSection}>
        <Text style={styles.otpSectionTitle}>CUSTOMER OTP VERIFICATION</Text>
        <Text style={styles.otpSubtitle}>Enter Customer OTP</Text>

        {/* 6 Digit Input Boxes */}
        <View style={styles.digitBoxesRow}>
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const digit = otp[idx] || '';
            const isFocused = otp.length === idx;
            return (
              <View
                key={idx}
                style={[
                  styles.digitBox,
                  digit ? styles.digitBoxFilled : null,
                  isFocused ? styles.digitBoxFocused : null
                ]}
              >
                <Text style={styles.digitText}>{digit}</Text>
              </View>
            );
          })}
        </View>

        {/* Hidden TextInput overlaid to capture input */}
        <TextInput
          style={styles.hiddenInput}
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={(val) => {
            setOtp(val.replace(/[^0-9]/g, ''));
            setErrorMsg('');
          }}
          autoFocus
        />

        {!!errorMsg && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              !isComplete && styles.verifyBtnDisabled,
              loading && { opacity: 0.7 }
            ]}
            onPress={handleVerify}
            disabled={!isComplete || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-decagram" size={18} color={COLORS.white} />
                <Text style={styles.verifyBtnText}>Verify & Confirm</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginVertical: SPACING.s,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.card
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.s
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5
  },
  detailsContainer: {
    gap: 6
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.m
  },
  otpSection: {
    alignItems: 'center'
  },
  otpSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.warning,
    letterSpacing: 1,
    marginBottom: 2
  },
  otpSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.m
  },
  digitBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.m
  },
  digitBox: {
    width: 42,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  digitBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(10, 102, 194, 0.1)'
  },
  digitBoxFocused: {
    borderColor: COLORS.warning,
    borderWidth: 2
  },
  digitText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  hiddenInput: {
    position: 'absolute',
    top: 40,
    width: 280,
    height: 50,
    opacity: 0.01
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    width: '100%',
    marginTop: 4
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  verifyBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  verifyBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
    opacity: 0.5
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white
  }
});
