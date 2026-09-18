import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const QUICK_MESSAGES = [
  'I have arrived at your pickup location.',
  'Stuck in slight traffic, reaching in 3-5 mins.',
  'Please share your 4-digit PIN upon arrival.',
  'I am waiting near the main gate / landmark.'
];

const MaskedCallModal = ({ visible, customer, onClose, onSendMessage }) => {
  if (!customer) return null;

  const handleMaskedCall = () => {
    // In production, VoIP or proxy gateway is used. In app, dial masked/safe helpline.
    const maskedProxy = '+977-1-4200000';
    Linking.openURL(`tel:${maskedProxy}`).catch(() => {
      Alert.alert('Call Error', 'Could not open dialer.');
    });
  };

  const handleQuickMsg = (msg) => {
    if (onSendMessage) onSendMessage(msg);
    Alert.alert('Message Sent', `"${msg}" has been sent to the customer.`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="chatbubbles" size={22} color={COLORS.primary} />
              <Text style={styles.title}>Contact Passenger</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyCard}>
            <Ionicons name="lock-closed" size={16} color={COLORS.online} />
            <Text style={styles.privacyText}>
              Passenger phone number is protected. Calls are routed via secure platform proxy.
            </Text>
          </View>

          {/* Masked Call Button */}
          <TouchableOpacity style={styles.callBtn} onPress={handleMaskedCall} activeOpacity={0.8}>
            <Ionicons name="call" size={20} color="#FFF" />
            <Text style={styles.callBtnText}>Call Passenger (Masked Secure Call)</Text>
          </TouchableOpacity>

          {/* Quick Canned Messages */}
          <Text style={styles.cannedHeader}>Quick Messages</Text>
          <View style={styles.cannedList}>
            {QUICK_MESSAGES.map((msg, index) => (
              <TouchableOpacity
                key={index}
                style={styles.cannedItem}
                onPress={() => handleQuickMsg(msg)}
                activeOpacity={0.7}
              >
                <Ionicons name="paper-plane" size={14} color={COLORS.primary} />
                <Text style={styles.cannedText}>{msg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: SPACING.lg
  },
  privacyText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.online,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg
  },
  callBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  cannedHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm
  },
  cannedList: {
    gap: SPACING.sm
  },
  cannedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cannedText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1
  }
});

export default MaskedCallModal;
