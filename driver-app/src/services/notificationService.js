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
      console.log('[PUSH] ERROR:', e?.message || e);
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
    console.log('[PUSH] ERROR:', e?.message || e);
    return false;
  }
};

// 4. Register / Update Push Token with Backend
export const registerPushTokenWithBackend = async (apiClient) => {
  try {
    // Step 1: Check and request notification permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    console.log(`[PUSH] permission status: ${finalStatus}`);

    if (finalStatus !== 'granted') {
      console.log(`[PUSH] ERROR: Notification permission not granted (${finalStatus})`);
      return null;
    }

    // Step 2: Initialize Android notification channel
    await initNotificationChannel();

    // Step 3: Resolve EAS projectId
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'a503a782-662b-4065-af56-4af4ce094530';
    console.log(`[PUSH] projectId: ${projectId}`);

    // Step 4: Request real Expo push token
    console.log('[PUSH] token request started');
    let pushToken = null;
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      pushToken = tokenResponse?.data;
    } catch (err) {
      console.log('[PUSH] ERROR:', err?.message || err);
      return null;
    }

    // STRICT: Validate real Expo push token (ABSOLUTELY NO FAKE TOKENS)
    if (
      !pushToken ||
      typeof pushToken !== 'string' ||
      !pushToken.startsWith('ExponentPushToken[') ||
      /ExponentPushToken\[Emulator_/i.test(pushToken)
    ) {
      console.log('[PUSH] ERROR: Real token not obtained or invalid format');
      return null;
    }

    console.log('[PUSH] real token received: YES — Valid Expo format');

    // Step 5: Register token with backend
    if (apiClient) {
      console.log('[PUSH] backend registration started');
      try {
        let res = null;
        if (typeof apiClient.registerPushToken === 'function') {
          res = await apiClient.registerPushToken(pushToken);
        } else if (typeof apiClient.post === 'function') {
          res = await apiClient.post('/driver/push-token', { pushToken });
        }
        const registrationStatus = res?.status ?? res?.data?.status ?? 200;
        console.log(`[PUSH] backend registration response: ${registrationStatus}`);
        console.log('[PUSH] token registration success');
      } catch (regErr) {
        const statusCode = regErr?.response?.status ?? 'ERR';
        console.log(`[PUSH] backend registration response: ${statusCode}`);
        const errMsg = regErr?.response?.data?.message || regErr?.message || regErr;
        console.log('[PUSH] ERROR:', errMsg);
        return null;
      }
    }

    return pushToken;
  } catch (e) {
    console.log('[PUSH] ERROR:', e?.message || e);
    return null;
  }
};

// 4b. Push Token Refresh / Change Listener
export const setupPushTokenChangeListener = (apiClient) => {
  try {
    if (typeof Notifications.addPushTokenListener === 'function') {
      const subscription = Notifications.addPushTokenListener(async (tokenData) => {
        const newToken = tokenData?.data || (typeof tokenData === 'string' ? tokenData : null);
        if (
          newToken &&
          typeof newToken === 'string' &&
          newToken.startsWith('ExponentPushToken[') &&
          !/ExponentPushToken\[Emulator_/i.test(newToken)
        ) {
          console.log('[PUSH] real token received: YES — Valid Expo format');
          if (apiClient) {
            console.log('[PUSH] backend registration started');
            try {
              let res = null;
              if (typeof apiClient.registerPushToken === 'function') {
                res = await apiClient.registerPushToken(newToken);
              } else if (typeof apiClient.post === 'function') {
                res = await apiClient.post('/driver/push-token', { pushToken: newToken });
              }
              const registrationStatus = res?.status ?? res?.data?.status ?? 200;
              console.log(`[PUSH] backend registration response: ${registrationStatus}`);
              console.log('[PUSH] token registration success');
            } catch (err) {
              const statusCode = err?.response?.status ?? 'ERR';
              console.log(`[PUSH] backend registration response: ${statusCode}`);
              console.log('[PUSH] ERROR:', err?.response?.data?.message || err?.message || err);
            }
          }
        }
      });
      return subscription;
    }
  } catch (e) {
    console.log('[PUSH] ERROR:', e?.message || e);
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
