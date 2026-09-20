import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const StatusBadge = ({ status, text, style, textStyle }) => {
  if (!status) return null;
  const s = status.toLowerCase();

  let bg = COLORS.successLight;
  let textCol = COLORS.success;

  let displayText = text || status;

  if (s === 'pending admin confirmation' || s === 'pending_admin_confirmation' || s === 'pending driver confirmation') {
    bg = '#fef3c7';
    textCol = '#b45309';
    displayText = text || 'Waiting for Driver';
  } else if (s === 'admin confirmed' || s === 'admin_confirmed') {
    bg = '#dcfce7';
    textCol = '#15803d';
    displayText = text || '✓ Confirmed';
  } else if (['pending', 'pending cash', 'pending driver confirmation', 'requested', 'in progress', 'inactive'].includes(s)) {
    bg = COLORS.warningLight;
    textCol = COLORS.warning;
  } else if (['cancelled', 'rejected', 'failed', 'blocked'].includes(s)) {
    bg = COLORS.dangerLight;
    textCol = COLORS.danger;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color: textCol }, textStyle]} numberOfLines={1}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: 170,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  }
});

export default StatusBadge;
