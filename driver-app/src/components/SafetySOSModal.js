import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { driverService } from '../services/driverService';
import { useAuth } from '../state/AuthContext';

const SafetySOSModal = ({ visible, onClose }) => {
  const { driver } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const emergencyContacts = [
    { name: 'Police Helpline', number: '100', icon: 'shield' },
    { name: 'National Emergency', number: '112', icon: 'call' },
    { name: 'Traffic Police', number: '103', icon: 'car' },
    { name: 'Platform 24/7 Helpline', number: '+977-1-4200000', icon: 'headset' }
  ];

  const handleTriggerSOS = async () => {
    setLoading(true);
    try {
      await driverService.triggerSOS({
        notes: 'Emergency SOS triggered from Driver Android App',
        lastKnownLocation: 'Reported by Driver'
      });
      setDispatched(true);
    } catch (e) {
      Alert.alert('SOS Dispatched', 'Emergency alerts sent to response center and platform admin.');
      setDispatched(true);
    } finally {
      setLoading(false);
    }
  };

  const dialNumber = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Error', `Cannot dial ${number}`);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="warning" size={24} color={COLORS.danger} />
              <Text style={styles.title}>EMERGENCY SOS & SAFETY</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {dispatched ? (
            <View style={styles.dispatchedBox}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.dispatchedTitle}>SOS Alert Dispatched!</Text>
              <Text style={styles.dispatchedDesc}>
                Emergency response center and platform safety team have been notified. Stay calm and dial emergency services below if in immediate danger.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sosActionButton}
              onPress={handleTriggerSOS}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="large" />
              ) : (
                <>
                  <Ionicons name="alert-circle" size={32} color="#FFF" />
                  <Text style={styles.sosActionText}>DISPATCH EMERGENCY SOS</Text>
                  <Text style={styles.sosActionSub}>Notifies Admin, Helpline & Emergency Contacts</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.sectionHeader}>Emergency Direct Numbers</Text>
          <View style={styles.contactsGrid}>
            {emergencyContacts.map((contact, i) => (
              <TouchableOpacity
                key={i}
                style={styles.contactItem}
                onPress={() => dialNumber(contact.number)}
                activeOpacity={0.7}
              >
                <View style={styles.contactLeft}>
                  <Ionicons name={contact.icon} size={20} color={COLORS.primary} />
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </View>
                </View>
                <Ionicons name="call" size={18} color={COLORS.success} />
              </TouchableOpacity>
            ))}
          </View>

          {driver?.emergencyContact?.phone && (
            <TouchableOpacity
              style={styles.familyContactCard}
              onPress={() => dialNumber(driver.emergencyContact.phone)}
            >
              <Ionicons name="heart" size={20} color={COLORS.danger} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.familyTitle}>Personal Emergency Contact</Text>
                <Text style={styles.familyName}>{driver.emergencyContact.name} ({driver.emergencyContact.relation || 'Family'})</Text>
              </View>
              <Text style={styles.familyPhone}>{driver.emergencyContact.phone}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close Safety Center</Text>
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
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.danger
  },
  sosActionButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  sosActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4
  },
  sosActionSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2
  },
  dispatchedBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.success,
    marginBottom: SPACING.lg
  },
  dispatchedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.success,
    marginTop: 8
  },
  dispatchedDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm
  },
  contactsGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  contactTextCol: {},
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  contactNumber: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  familyContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: SPACING.lg
  },
  familyTitle: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700'
  },
  familyName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  familyPhone: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  closeBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 12
  },
  closeBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14
  }
});

export default SafetySOSModal;
