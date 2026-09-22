import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

const CHANNEL_ID = 'driver-booking-requests';
const STORAGE_PREFIX = 'driver_notified_booking_requests_';

const getProjectId = () => {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    Constants?.manifest2?.extra?.eas?.projectId ||
    Constants?.manifest?.extra?.eas?.projectId ||
    null
  );
};

// 1. Configure Foreground Notification Presentation Behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Initialize Dedicated Android High-Importance Channel
export const initNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Booking Requests',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibration: true,
        showBadge: true,
        lightColor: '#1D4ED8',
      });
    } catch (e) {
      console.warn('Error setting notification channel:', e);
    }
  }
};

// 3. Request Android 13+ Notification Permission
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Error requesting notification permissions:', e);
    return false;
  }
};

// 4. Register / Update Push Token with Backend
export const registerPushTokenWithBackend = async (apiClient) => {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.log('[PUSH] permission not granted');
      return null;
    }
    console.log('[PUSH] permission granted');

    await initNotificationChannel();

    const projectId = getProjectId();
    console.log('[PUSH] projectId:', projectId || 'Not configured in EAS');

    let pushToken = null;
    try {
      const tokenOptions = projectId ? { projectId } : undefined;
      const tokenObj = await Notifications.getExpoPushTokenAsync(tokenOptions).catch((err) => {
        console.warn('[PUSH] getExpoPushTokenAsync note:', err?.message || err);
        return null;
      });
      pushToken = tokenObj?.data;

      if (!pushToken) {
        const deviceTokenObj = await Notifications.getDevicePushTokenAsync().catch((err) => {
          console.warn('[PUSH] getDevicePushTokenAsync note:', err?.message || err);
          return null;
        });
        pushToken = deviceTokenObj?.data;
      }
    } catch (tokenErr) {
      console.warn('[PUSH] Push token retrieval note:', tokenErr?.message || tokenErr);
    }

    // STRICT: Never generate or register a fake push token
    if (!pushToken) {
      console.warn('[PUSH] Failed to obtain a real push token. No fake token will be registered.');
      return null;
    }

    console.log('[PUSH] real token:', pushToken);

    if (apiClient) {
      try {
        if (typeof apiClient.registerPushToken === 'function') {
          await apiClient.registerPushToken(pushToken);
        } else if (typeof apiClient.post === 'function') {
          await apiClient.post('/driver/push-token', { pushToken });
        }
        console.log('[PUSH] token registration success');
      } catch (regErr) {
        console.error('[PUSH] token registration failed:', regErr?.response?.data?.message || regErr?.message || regErr);
        return null;
      }
    }

    return pushToken;
  } catch (e) {
    console.error('[PUSH] token registration failed:', e?.message || e);
    return null;
  }
};

// 4b. Push Token Refresh / Change Listener
export const setupPushTokenChangeListener = (apiClient) => {
  try {
    if (typeof Notifications.addPushTokenListener === 'function') {
      const subscription = Notifications.addPushTokenListener(async (tokenData) => {
        const newToken = tokenData?.data || tokenData;
        if (newToken && typeof newToken === 'string' && newToken.trim() !== '') {
          console.log('[PUSH] real token:', newToken);
          if (apiClient) {
            try {
              if (typeof apiClient.registerPushToken === 'function') {
                await apiClient.registerPushToken(newToken);
              } else if (typeof apiClient.post === 'function') {
                await apiClient.post('/driver/push-token', { pushToken: newToken });
              }
              console.log('[PUSH] token registration success');
            } catch (err) {
              console.error('[PUSH] token registration failed:', err?.response?.data?.message || err?.message || err);
            }
          }
        }
      });
      return subscription;
    }
  } catch (e) {
    console.warn('Error setting up push token listener:', e?.message || e);
  }
  return null;
};

// Helper to get storage key per driver
const getStorageKey = (driverId) => `${STORAGE_PREFIX}${driverId || 'session'}`;

// 5. De-duplicated Booking Request Detection & Top Notification Trigger
export const checkAndNotifyBookingRequests = async (requests, driverId) => {
  if (!Array.isArray(requests) || requests.length === 0) return;

  try {
    const key = getStorageKey(driverId);
    const stored = await AsyncStorage.getItem(key);
    const notifiedIds = new Set(stored ? JSON.parse(stored) : []);
    let newNotifiedCount = 0;

    for (const item of requests) {
      const bId = item._id || item.bookingId;
      if (!bId) continue;

      // Filter: Only pending/active new requests
      const status = item.bookingStatus || '';
      const isPending = [
        'Pending Admin Confirmation',
        'PENDING_ADMIN_CONFIRMATION',
        'Pending Driver Confirmation',
        'Pending',
        'Awaiting Cash Collection'
      ].includes(status);

      if (!isPending) continue;

      // De-duplication check: Skip if already notified
      if (notifiedIds.has(bId)) continue;

      // Extract details
      const origin = (item.pickupLocation || 'Pickup Point').split('(')[0].trim();
      const dest = (item.dropLocation || 'Destination').split('(')[0].trim();
      const bodyText = `${origin} → ${dest} booking request. Tap to view.`;

      // Trigger Android Top Heads-Up Notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Bus Booking Request',
          body: bodyText,
          data: {
            bookingId: bId,
            bookingCode: item.bookingId || bId,
            screen: 'Requests'
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null // Deliver immediately
      });

      notifiedIds.add(bId);
      newNotifiedCount++;
    }

    if (newNotifiedCount > 0) {
      await AsyncStorage.setItem(key, JSON.stringify(Array.from(notifiedIds)));
    }
  } catch (e) {
    console.warn('Error checking/notifying booking requests:', e);
  }
};

// 6. Clear Notification Cache on Driver Logout
export const clearDriverNotificationCache = async (driverId) => {
  try {
    const key = getStorageKey(driverId);
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('Error clearing driver notification cache:', e);
  }
};

export default {
  initNotificationChannel,
  requestNotificationPermissions,
  registerPushTokenWithBackend,
  setupPushTokenChangeListener,
  checkAndNotifyBookingRequests,
  clearDriverNotificationCache,
};
