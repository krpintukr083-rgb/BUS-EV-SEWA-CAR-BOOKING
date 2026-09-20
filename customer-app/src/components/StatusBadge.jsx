import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const StatusBadge = ({ status, text }) => {
  if (!status) return null;
  const s = status.toLowerCase();

  let bg = COLORS.successLight;
  let textCol = COLORS.success;

  let displayText = text || status;

  if (s === 'pending admin confirmation' || s === 'pending_admin_confirmation') {
    bg = '#fef3c7';
    textCol = '#b45309';
    displayText = text || 'Waiting for Admin Confirmation';
  } else if (s === 'admin confirmed' || s === 'admin_confirmed') {
    bg = '#dcfce7';
    textCol = '#15803d';
    displayText = text || '✓ Booking Confirmed';
  } else if (['pending', 'pending cash', 'pending driver confirmation', 'requested', 'in progress', 'inactive'].includes(s)) {
    bg = COLORS.warningLight;
    textCol = COLORS.warning;
  } else if (['cancelled', 'rejected', 'failed', 'blocked'].includes(s)) {
    bg = COLORS.dangerLight;
    textCol = COLORS.danger;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: textCol }]}>{displayText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  }
});

export default StatusBadge;
