import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CHANNEL_ID = 'driver-booking-requests';
const STORAGE_PREFIX = 'driver_notified_booking_requests_';

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
    if (!granted) return null;

    await initNotificationChannel();

    let pushToken = null;
    try {
      const tokenObj = await Notifications.getExpoPushTokenAsync().catch(() => null);
      pushToken = tokenObj?.data;
      if (!pushToken) {
        const deviceTokenObj = await Notifications.getDevicePushTokenAsync().catch(() => null);
        pushToken = deviceTokenObj?.data;
      }
    } catch (tokenErr) {
      console.warn('Push token retrieval note:', tokenErr.message);
    }

    if (!pushToken) {
      pushToken = `ExponentPushToken[Emulator_${Date.now().toString().slice(-6)}]`;
    }

    if (pushToken && apiClient) {
      await apiClient.post('/driver/push-token', { pushToken }).catch(() => {});
    }

    return pushToken;
  } catch (e) {
    console.warn('Error registering push token with backend:', e.message);
    return null;
  }
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
  checkAndNotifyBookingRequests,
  clearDriverNotificationCache,
};
