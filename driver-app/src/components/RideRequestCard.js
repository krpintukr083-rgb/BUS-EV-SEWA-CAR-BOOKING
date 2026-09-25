import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import CountdownTimer from './CountdownTimer';

const RideRequestCard = ({ request, onAccept, onReject }) => {
  if (!request) return null;

  const fareAmount = request.fare || request.totalFare || 0;
  const isCash = request.paymentMethod === 'Offline Cash' || request.paymentMethod === 'Cash';
  const callCustomer = () => {
    const phone = String(request.customerPhone).replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Unable to open dialer', 'Please try calling the customer again.');
    });
  };

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={styles.serviceBadge}>
            <Text style={styles.serviceText}>{request.serviceType || 'Car'}</Text>
          </View>
          <Text style={styles.bookingIdText}>#{request.bookingId}</Text>
        </View>
        <CountdownTimer initialSeconds={request.remainingSeconds || request.countdownSeconds || 45} />
      </View>

      {/* Customer Row */}
      <View style={styles.customerRow}>
        <View style={styles.avatarMini}>
          <Ionicons name="person" size={14} color={COLORS.primary} />
        </View>
        <Text style={styles.customerName}>{request.customer?.name || 'Passenger'}</Text>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color="#FBBF24" />
          <Text style={styles.ratingText}>{request.customerRating || '4.9'}</Text>
        </View>
      </View>

      {request.customerPhone ? (
        <TouchableOpacity style={styles.callCustomerButton} onPress={callCustomer} activeOpacity={0.8}>
          <Ionicons name="call" size={16} color={COLORS.online} />
          <View>
            <Text style={styles.customerPhone}>{request.customerPhone}</Text>
            <Text style={styles.callCustomerText}>Call Customer</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Route Info */}
      <View style={styles.routeContainer}>
        <View style={styles.routeItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.online }]} />
          <View style={styles.routeTextCol}>
            <Text style={styles.routeLabel}>PICKUP</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>{request.pickupLocation}</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routeItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
          <View style={styles.routeTextCol}>
            <Text style={styles.routeLabel}>DROP-OFF</Text>
            <Text style={styles.routeAddress} numberOfLines={2}>{request.dropLocation}</Text>
          </View>
        </View>
      </View>

      {/* Fare & Payment Row */}
      <View style={styles.fareRow}>
        <View>
          <Text style={styles.fareLabel}>ESTIMATED FARE</Text>
          <Text style={styles.fareValue}>₹{fareAmount}</Text>
        </View>
        <View style={styles.paymentBadge}>
          <Ionicons name={isCash ? 'cash' : 'card'} size={14} color={isCash ? COLORS.warning : COLORS.primary} />
          <Text style={styles.paymentText}>{request.paymentMethod || 'Online'}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => onReject(request._id)}
          activeOpacity={0.8}
        >
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => onAccept(request._id)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={styles.acceptBtnText}>Accept Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  serviceBadge: {
    backgroundColor: 'rgba(10, 102, 194, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(10, 102, 194, 0.4)'
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryLight,
    textTransform: 'uppercase'
  },
  bookingIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 6
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(10, 102, 194, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  callCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 9,
    backgroundColor: COLORS.successBg,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: SPACING.md
  },
  customerPhone: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  callCustomerText: {
    color: COLORS.online,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1
  },
  routeContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: COLORS.borderHighlight,
    marginLeft: 4,
    marginVertical: 2
  },
  routeTextCol: {
    flex: 1
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5
  },
  routeAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 1
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  fareLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted
  },
  fareValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.success
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center'
  },
  rejectBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '800'
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  }
});

export default RideRequestCard;
