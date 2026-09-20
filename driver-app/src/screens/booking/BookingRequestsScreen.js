import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Modal, TouchableOpacity, TextInput } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../state/AuthContext';
import { useLanguage } from '../../state/LanguageContext';
import { driverService } from '../../services/driverService';
import DriverHeader from '../../components/DriverHeader';
import RideRequestCard from '../../components/RideRequestCard';

const REJECTION_REASONS = [
  'Customer did not arrive',
  'Wrong pickup location / route',
  'Vehicle mechanical problem',
  'Emergency / Breakdown',
  'Other personal reason'
];

const BookingRequestsScreen = ({ navigation }) => {

  const { isOnline, toggleOnlineStatus } = useAuth();
  const { t } = useLanguage();

  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  const loadRequests = async () => {
    try {
      const res = await driverService.getBookingRequests();
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRequests(res.data.data);
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.warn('Error loading requests', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
      const interval = setInterval(loadRequests, 6000);
      return () => clearInterval(interval);
    }, [isOnline])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleAccept = async (bookingId) => {
    try {
      await driverService.acceptRide(bookingId);
    } catch (e) {
      console.warn('Accept ride API call note:', e?.response?.data?.message || e.message);
    } finally {
      navigation.navigate('BusConfirmation', { bookingId });
    }
  };

  const promptReject = (bookingId) => {
    setSelectedBookingId(bookingId);
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedBookingId) return;
    const finalReason = selectedReason === 'Other personal reason' && customReason ? customReason : selectedReason;

    try {
      const res = await driverService.rejectRide(selectedBookingId, finalReason);
      if (res.data?.success) {
        setRequests((prev) => prev.filter((r) => r._id !== selectedBookingId));
        setRejectModalVisible(false);
        setSelectedBookingId(null);
      }
    } catch (e) {
      Alert.alert('Reject Failed', e.response?.data?.message || 'Could not reject request.');
    }
  };

  return (
    <View style={styles.container}>
      <DriverHeader navigation={navigation} title="Booking Requests" showBack={false} />

      {!isOnline && (
        <View style={styles.offlineWarning}>
          <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
          <Text style={styles.offlineWarningText}>
            You are currently OFFLINE. Switch ONLINE to receive new trip requests.
          </Text>
          <TouchableOpacity style={styles.goOnlineBtn} onPress={() => toggleOnlineStatus(true)}>
            <Text style={styles.goOnlineText}>Go Online</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id || item.bookingId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <RideRequestCard
            request={item}
            onAccept={handleAccept}
            onReject={promptReject}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={COLORS.surfaceHighlight} />
            <Text style={styles.emptyTitle}>{t('noRequests')}</Text>
            <Text style={styles.emptySub}>
              {isOnline
                ? 'Stay active and near popular transport hubs to receive incoming trip requests.'
                : 'Turn on your online switch to start receiving ride dispatches.'}
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="slide" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rejection Reason</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {REJECTION_REASONS.map((reason, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.reasonItem, selectedReason === reason && styles.selectedReasonItem]}
                onPress={() => setSelectedReason(reason)}
              >
                <Ionicons
                  name={selectedReason === reason ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selectedReason === reason ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            {selectedReason === 'Other personal reason' && (
              <TextInput
                style={styles.customInput}
                placeholder="Specify rejection reason..."
                placeholderTextColor={COLORS.textMuted}
                value={customReason}
                onChangeText={setCustomReason}
              />
            )}

            <TouchableOpacity style={styles.confirmRejectBtn} onPress={confirmReject}>
              <Text style={styles.confirmRejectText}>Confirm Rejection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.huge * 2
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 8
  },
  offlineWarningText: {
    fontSize: 12,
    color: COLORS.warning,
    flex: 1,
    fontWeight: '600'
  },
  goOnlineBtn: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  goOnlineText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.huge * 2,
    paddingHorizontal: SPACING.xl
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.md
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.sm
  },
  selectedReasonItem: {
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600'
  },
  customInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md
  },
  confirmRejectBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm
  },
  confirmRejectText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  }
});

export default BookingRequestsScreen;
