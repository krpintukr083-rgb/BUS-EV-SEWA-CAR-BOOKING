import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const FareReceiptModal = ({ visible, receipt, onClose }) => {
  if (!receipt) return null;

  const totalFare = receipt.totalFare || 0;
  const commission = receipt.platformCommission || receipt.commission || Math.round(totalFare * 0.2);
  const netEarnings = receipt.driverEarnings || receipt.netEarnings || (totalFare - commission);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.tripDoneText}>TRIP COMPLETED</Text>
            <Text style={styles.tripIdText}>Booking #{receipt.tripId || receipt.bookingId}</Text>
          </View>

          {/* Earnings Highlight */}
          <View style={styles.earningsBox}>
            <Text style={styles.earningsLabel}>Driver Net Earnings (80%)</Text>
            <Text style={styles.earningsValue}>₹{netEarnings}</Text>
            <Text style={styles.walletCredited}>✓ Credited to Driver Wallet</Text>
          </View>

          {/* Detailed Breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>Fare Breakdown</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Gross Trip Fare</Text>
              <Text style={styles.rowValue}>₹{totalFare}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Platform Commission (20%)</Text>
              <Text style={[styles.rowValue, { color: COLORS.danger }]}>- ₹{commission}</Text>
            </View>
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalLabel}>Driver Net Payout</Text>
              <Text style={styles.totalValue}>₹{netEarnings}</Text>
            </View>
          </View>

          {/* Payment Method Badge */}
          <View style={styles.paymentInfoRow}>
            <Ionicons name="card" size={16} color={COLORS.primary} />
            <Text style={styles.paymentMethodText}>
              Payment: {receipt.paymentMethod || 'Online'} ({receipt.paymentStatus || 'Paid'})
            </Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  tripDoneText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8
  },
  tripIdText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  earningsBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: SPACING.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: SPACING.lg
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
    textTransform: 'uppercase'
  },
  earningsValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 4
  },
  walletCredited: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600'
  },
  breakdownCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 6
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.success
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginBottom: SPACING.lg
  },
  paymentMethodText: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center'
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800'
  }
});

export default FareReceiptModal;
