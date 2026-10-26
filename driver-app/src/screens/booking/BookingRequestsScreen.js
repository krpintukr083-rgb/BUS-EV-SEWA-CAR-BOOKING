import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../state/AuthContext';
import { driverService } from '../../services/driverService';
import { checkAndNotifyBookingRequests } from '../../services/notificationService';
import DriverHeader from '../../components/DriverHeader';
import RideRequestCard from '../../components/RideRequestCard';
import { getAcceptedBookingId, normalizeIncomingRequests } from '../../utils/bookingHandoff';

const REJECTION_REASONS = [
  'Customer did not arrive',
  'Wrong pickup location / route',
  'Vehicle mechanical problem',
  'Emergency / Breakdown',
  'Other personal reason'
];

const BookingRequestsScreen = ({ route, navigation }) => {

  const { driver, user, isOnline, toggleOnlineStatus } = useAuth();
  const targetBookingId = route?.params?.bookingId || null;

  const [requests, setRequests] = useState([]);
  const [requestLoadError, setRequestLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const scrollRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const screenFocusedRef = useRef(false);
  const hiddenRequestIdsRef = useRef(new Set());

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        if (e?.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadRequests = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    console.log(`[REQUEST_DEBUG] fetch started - requestId: ${requestId}, screenFocused: ${screenFocusedRef.current}, endpoint: /api/driver/booking-requests`);
    try {
      const response = await driverService.getBookingRequests();
      console.log(`[REQUEST_DEBUG] response status - requestId: ${requestId}, status: ${response?.status || 200}, success: ${response.data?.success}`);
      if (response.data?.success && Array.isArray(response.data.data)) {
        if (requestId !== latestRequestIdRef.current || !screenFocusedRef.current) {
          console.log(`[REQUEST_DEBUG] fetch aborted - requestId mismatch or screen not focused. latestRequestId: ${latestRequestIdRef.current}, screenFocused: ${screenFocusedRef.current}`);
          return;
        }
        const validRequests = normalizeIncomingRequests(response.data.data)
          .filter(request => !hiddenRequestIdsRef.current.has(String(request._id)));
        
        const receivedServiceTypes = validRequests.map(r => r.serviceType);
        const carBookingFound = validRequests.some(r => r.serviceType?.toLowerCase() === 'car');
        console.log('[CAR_UI_DEBUG]', {
          receivedBookingIds: validRequests.map(r => r._id || r.bookingId),
          receivedServiceTypes,
          carBookingFound,
          hiddenByFilter: response.data.data.length - validRequests.length,
          hiddenByStaleLogic: 0 // Will implement stale logic logging if needed
        });

        const latest = validRequests[0];
        if (__DEV__) {
          console.info(
            `[BOOKING_REQUESTS] count=${validRequests.length}` +
            ` latest=${latest?.bookingId || latest?._id || 'none'}` +
            ` createdAt=${latest?.createdAt || 'none'}` +
            ` mode=${latest?.bookingMode || 'none'}` +
            ` scheduleId=${latest?.scheduleId || 'none'}` +
            ` route=${latest ? `${latest.pickupLocation || ''} -> ${latest.dropLocation || ''}` : 'none'}`
          );
        }
        console.log(`[REQUEST_DEBUG] pending booking count: ${validRequests.length}`);
        console.log(`[REQUEST_DEBUG] booking IDs: ${validRequests.map(r => r._id || r.bookingId).join(', ')}`);
        setRequestLoadError(false);
        setRequests(validRequests);
        checkAndNotifyBookingRequests(validRequests, user?._id || driver?._id);
      } else {
        if (requestId !== latestRequestIdRef.current || !screenFocusedRef.current) return;
        setRequestLoadError(true);
        setRequests([]);
      }
    } catch (error) {
      if (requestId !== latestRequestIdRef.current || !screenFocusedRef.current) return;
      console.warn('Error loading requests', error);
      setRequestLoadError(true);
    }
  }, [driver?._id, user?._id]);

  useFocusEffect(
    useCallback(() => {
      console.log('[REQUEST_DEBUG] screen focused');
      screenFocusedRef.current = true;
      loadRequests();
      const interval = setInterval(loadRequests, 6000);
      const previousAppState = { current: AppState.currentState };
      const appStateSub = AppState.addEventListener('change', nextState => {
        console.log(`[REQUEST_DEBUG] appState changed: ${previousAppState.current} -> ${nextState}`);
        if (nextState === 'active' && previousAppState.current !== 'active') loadRequests();
        previousAppState.current = nextState;
      });
      const notifSub = Notifications.addNotificationReceivedListener(() => {
        console.log('[REQUEST_DEBUG] notification received');
        loadRequests();
      });
      const notifResponseSub = Notifications.addNotificationResponseReceivedListener(() => {
        console.log('[REQUEST_DEBUG] notification tapped');
        loadRequests();
      });

      return () => {
        console.log('[REQUEST_DEBUG] screen unfocused');
        screenFocusedRef.current = false;
        latestRequestIdRef.current += 1;
        clearInterval(interval);
        appStateSub.remove();
        if (notifSub && notifSub.remove) {
          notifSub.remove();
        }
        if (notifResponseSub && notifResponseSub.remove) {
          notifResponseSub.remove();
        }
      };
    }, [isOnline, loadRequests])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRequests();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAccept = async (bookingId) => {
    try {
      const res = await driverService.acceptRide(bookingId);
      if (!res?.data?.success) {
        Alert.alert('Accept Failed', res?.data?.message || 'The booking was not accepted. Refresh requests and try again.');
        await loadRequests();
        return;
      }
      const acceptedBookingId = getAcceptedBookingId(res);
      if (!acceptedBookingId) {
        Alert.alert('Accept Failed', 'The accepted booking ID was missing from the server response. Refresh requests and try again.');
        await loadRequests();
        return;
      }
      hiddenRequestIdsRef.current.add(String(acceptedBookingId));
      console.log('ACCEPT SUCCESS\nbookingId:', acceptedBookingId, '\nbookingStatus:', res?.data?.data?.bookingStatus, '\ndriverConfirmed:', res?.data?.data?.driverConfirmed);
      // Remove accepted booking from pending requests list so it is no longer actionable
      setRequests((prev) => prev.filter((r) =>
        String(r._id) !== String(acceptedBookingId) &&
        String(r.bookingId) !== String(acceptedBookingId)
      ));
      navigation.navigate('BusConfirmation', {
        bookingId: acceptedBookingId,
        highlightBookingId: acceptedBookingId
      });
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 409) {
        const isSelfConflict = msg && msg.toLowerCase().includes('already accepted another');
        
        // Hide the booking from the local list immediately since it's no longer actionable
        if (!isSelfConflict) {
          hiddenRequestIdsRef.current.add(String(bookingId));
          setRequests((prev) => prev.filter((r) => 
            String(r._id) !== String(bookingId) && 
            String(r.bookingId) !== String(bookingId)
          ));
        }

        Alert.alert(
          isSelfConflict ? 'Already Committed' : 'Request Unavailable',
          isSelfConflict 
            ? (msg || 'You have already accepted another instant booking.')
            : (msg || 'This request was already accepted by another driver.'),
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Accept Failed', msg || 'The booking was not accepted. Refresh requests and try again.');
      }
      await loadRequests();
    }
  };

  const promptReject = (bookingId) => {
    setSelectedBookingId(bookingId);
    setSelectedReason(REJECTION_REASONS[0]);
    setCustomReason('');
    setRejectModalVisible(true);
  };

  const closeRejectModal = () => {
    Keyboard.dismiss();
    setRejectModalVisible(false);
    setSelectedBookingId(null);
  };

  const confirmReject = async () => {
    if (!selectedBookingId || rejectLoading) return;
    const finalReason = selectedReason === 'Other personal reason' && customReason.trim()
      ? customReason.trim()
      : selectedReason;

    try {
      setRejectLoading(true);
      const res = await driverService.rejectRide(selectedBookingId, finalReason);
      if (res.data?.success) {
        hiddenRequestIdsRef.current.add(String(selectedBookingId));
        setRequests((prev) => prev.filter((r) => String(r._id) !== String(selectedBookingId)));
        closeRejectModal();
      }
    } catch (e) {
      Alert.alert('Reject Failed', e.response?.data?.message || 'Could not reject request.');
    } finally {
      setRejectLoading(false);
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
        renderItem={({ item }) => {
          const isHighlighted = targetBookingId && (String(item._id) === String(targetBookingId) || String(item.bookingId) === String(targetBookingId));
          return (
            <View style={isHighlighted ? { borderColor: COLORS.primary, borderWidth: 2, borderRadius: 12 } : null}>
              <RideRequestCard
                request={item}
                onAccept={handleAccept}
                onReject={promptReject}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {requestLoadError ? 'Unable to load booking requests. Pull to refresh.' : 'No incoming requests right now'}
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType={isWeb ? 'fade' : 'slide'}
        statusBarTranslucent
        onRequestClose={closeRejectModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={closeRejectModal} accessible={false}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.modalCard,
              {
                maxHeight: isWeb
                  ? Math.min(windowHeight * 0.85, 600)
                  : keyboardVisible && keyboardHeight > 0
                    ? Math.max(260, windowHeight - keyboardHeight - (Platform.OS === 'android' ? 24 : 40))
                    : windowHeight * 0.85,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="close-circle-outline" size={22} color={COLORS.danger} style={styles.modalTitleIcon} />
                <Text style={styles.modalTitle}>Select Rejection Reason</Text>
              </View>
              <TouchableOpacity
                onPress={closeRejectModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.modalScrollBody}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              {REJECTION_REASONS.map((reason, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.reasonItem, selectedReason === reason && styles.selectedReasonItem]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selectedReason === reason ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedReason === reason ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={[styles.reasonText, selectedReason === reason && styles.selectedReasonText]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedReason === 'Other personal reason' && (
                <TextInput
                  style={styles.customInput}
                  placeholder="Specify rejection reason..."
                  placeholderTextColor={COLORS.textMuted}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline={false}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 120);
                  }}
                />
              )}
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                {
                  paddingBottom: isWeb
                    ? SPACING.md
                    : Math.max(insets.bottom, SPACING.md),
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.confirmRejectBtn, rejectLoading && { opacity: 0.7 }]}
                onPress={confirmReject}
                disabled={rejectLoading}
                activeOpacity={0.8}
              >
                {rejectLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmRejectText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? SPACING.lg : 0,
  },
  modalCard: {
    width: Platform.OS === 'web' ? '92%' : '100%',
    maxWidth: 480,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollBody: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.sm,
  },
  selectedReasonItem: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(10, 102, 194, 0.12)',
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  selectedReasonText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  customInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING.sm,
    fontSize: 13,
  },
  modalFooter: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  confirmRejectBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmRejectText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  }
});

export default BookingRequestsScreen;
