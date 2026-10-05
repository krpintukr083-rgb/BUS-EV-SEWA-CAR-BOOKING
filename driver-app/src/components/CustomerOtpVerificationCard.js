import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import driverService from '../services/driverService';
import { getBookingDisplayFare } from '../utils/fareResolver';
import { getOtpBookingId } from '../utils/bookingHandoff';

export default function CustomerOtpVerificationCard({ booking, acceptedBookingId, onVerified, onCancel }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef([]);

  if (!booking) return null;

  const bookingIdStr = booking.bookingId || booking._id?.slice(-6)?.toUpperCase() || 'N/A';
  const customerName = booking.customer?.name || booking.user?.name || booking.passengerName || 'Passenger';
  const busName = booking.vehicle?.vehicleName || booking.vehicleName || 'Royal Intercity Deluxe Express';
  const vehicleNo = booking.vehicle?.vehicleNumber || booking.vehicleNumber || 'DL 01 AB 4321';
  const seatNo = booking.selectedSeats?.join(', ') || booking.seats?.join(', ') || booking.seatNumber || 'A1';
  const pickup = booking.pickupLocation || booking.from || 'Delhi';
  const drop = booking.dropLocation || booking.to || 'Jaipur';
  const fare = getBookingDisplayFare(booking) ?? 850;

  const isComplete = otp.length === 6;

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the Customer OTP.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const targetId = getOtpBookingId(booking, acceptedBookingId);
      if (!targetId) {
        throw new Error('Accepted booking ID is unavailable.');
      }
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

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request?',
      'Are you sure you want to cancel this booking request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setErrorMsg('');
            try {
              const targetId = getOtpBookingId(booking, acceptedBookingId);
              if (!targetId) {
                throw new Error('Booking ID is unavailable.');
              }
              const res = await driverService.rejectBusBooking(targetId, 'Driver cancelled before OTP verification');
              if (res?.data?.success || res?.status === 200 || res?.data?.status === 'success' || res?.success) {
                Alert.alert('Success', 'Booking request cancelled successfully.');
                if (onVerified) onVerified(booking);
              } else {
                Alert.alert('Error', res?.data?.message || 'Failed to cancel booking request');
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to cancel booking request');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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
              <TextInput
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                style={[
                  styles.otpInput,
                  digit ? styles.digitBoxFilled : null,
                  isFocused ? styles.digitBoxFocused : null
                ]}
                keyboardType="number-pad"
                maxLength={6}
                value={digit}
                autoFocus={idx === 0}
                selectionColor="#2563EB"
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  if (cleaned.length > 1) {
                    setOtp(cleaned.substring(0, 6));
                    setErrorMsg('');
                    inputRefs.current[Math.min(cleaned.length, 6) - 1]?.focus();
                    return;
                  }
                  let newOtp = otp.split('');
                  newOtp[idx] = cleaned;
                  setOtp(newOtp.join(''));
                  setErrorMsg('');
                  if (cleaned && idx < 5) {
                    inputRefs.current[idx + 1]?.focus();
                  }
                }}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === 'Backspace' && !digit && idx > 0) {
                    inputRefs.current[idx - 1]?.focus();
                    let newOtp = otp.split('');
                    newOtp[idx - 1] = '';
                    setOtp(newOtp.join(''));
                  }
                }}
              />
            );
          })}
        </View>

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

        <TouchableOpacity
          style={styles.cancelRequestBtn}
          onPress={handleCancelRequest}
          disabled={loading}
        >
          <Text style={styles.cancelRequestBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(59, 130, 246, 0.1)' },
      default: {
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      }
    })
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 16
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
    alignItems: 'flex-start',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16
  },
  otpSection: {
    alignItems: 'center'
  },
  otpSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  otpSubtitle: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center'
  },
  digitBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.m
  },
  otpInput: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    padding: 0,
    opacity: 1,
  },
  digitBoxFilled: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderWidth: 2,
  },
  digitBoxFocused: {
    borderColor: '#2563EB',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
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
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  verifyBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  verifyBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
    opacity: 0.5
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white
  },
  cancelRequestBtn: {
    marginTop: SPACING.m,
    paddingVertical: 12,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  cancelRequestBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger
  }
});
