import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

console.warn('[CUSTOMER_PUSH] notificationService module loaded');

export const CUSTOMER_CHANNEL_ID = 'customer-booking-updates';

// 1. Modern Expo 54 Notification Presentation Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 2. Dedicated Android High-Importance Channel Initialization
export const initCustomerNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CUSTOMER_CHANNEL_ID, {
        name: 'Booking Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibration: true,
        showBadge: true,
        lightColor: '#1D4ED8',
      });
      console.log(`[CUSTOMER_PUSH] Notification channel '${CUSTOMER_CHANNEL_ID}' initialized successfully.`);
    } catch (chanErr) {
      console.warn('[CUSTOMER_PUSH] Channel creation warning:', chanErr?.message || chanErr);
    }
  }
};

// 3. Android 13+ Notification Permission Request
export const requestCustomerNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    console.log('[NOTIFICATION_PERMISSION_DEBUG]', { customerGranted: finalStatus === 'granted', status: finalStatus });
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('[CUSTOMER_PUSH] Permission request error:', err?.message || err);
    return false;
  }
};

// 4. Token Registration with Backend
export const registerForPushNotificationsAsync = async () => {
  try {
    console.log('[CUSTOMER_PUSH] registerForPushNotificationsAsync() started');
    await initCustomerNotificationChannel();

    const isGranted = await requestCustomerNotificationPermissions();
    if (!isGranted) {
      console.warn('[CUSTOMER_PUSH] Aborting token registration: permission not granted.');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      'a503a782-662b-4065-af56-4af4ce094530';

    let nativeFcmToken = null;
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      nativeFcmToken = deviceToken?.data || null;
      if (nativeFcmToken) {
        console.log(`[CUSTOMER_PUSH] Native FCM device token acquired (prefix: ${String(nativeFcmToken).substring(0, 10)}...)`);
      }
    } catch (fcmErr) {
      console.warn('[CUSTOMER_PUSH] Native FCM token not available (requires google-services.json for com.travelease.customer):', fcmErr?.message || fcmErr);
    }

    let expoPushToken = null;
    try {
      const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
      expoPushToken = tokenObj?.data || null;
      if (expoPushToken) {
        console.log(`[CUSTOMER_PUSH] Expo push token acquired: ${String(expoPushToken).substring(0, 25)}...`);
      }
    } catch (expoErr) {
      console.warn('[CUSTOMER_PUSH] Expo token fetch error:', expoErr?.message || expoErr);
    }

    const tokenToSend = expoPushToken || nativeFcmToken;
    if (tokenToSend) {
      console.log('[CUSTOMER_PUSH] Registering token with backend POST /api/customer/push-token');
      const response = await api.post('/customer/push-token', {
        pushToken: expoPushToken || tokenToSend,
        expoPushToken: expoPushToken || null,
        fcmToken: nativeFcmToken || null
      });
      console.log('[CUSTOMER_PUSH] Backend token registration response status:', response?.status || 200);
      return tokenToSend;
    }

    return null;
  } catch (e) {
    console.warn('[CUSTOMER_PUSH] Error during push registration:', e?.message || e);
    return null;
  }
};

// 5. Token Rotation / Refresh Listener
export const setupCustomerPushTokenChangeListener = () => {
  try {
    if (typeof Notifications.addPushTokenListener === 'function') {
      const sub = Notifications.addPushTokenListener(async (tokenData) => {
        const newToken = tokenData?.data || (typeof tokenData === 'string' ? tokenData : null);
        if (newToken && typeof newToken === 'string' && newToken.startsWith('ExponentPushToken[')) {
          console.log('[CUSTOMER_PUSH] Rotated token received, updating backend...');
          try {
            await api.post('/customer/push-token', {
              pushToken: newToken,
              expoPushToken: newToken
            });
            console.log('[CUSTOMER_PUSH] Rotated token updated successfully.');
          } catch (err) {
            console.warn('[CUSTOMER_PUSH] Failed to update rotated token:', err?.message || err);
          }
        }
      });
      return sub;
    }
  } catch (e) {
    console.warn('[CUSTOMER_PUSH] Listener setup error:', e?.message || e);
  }
  return null;
};

// 6. Display Local Notification for Customer Booking Status Updates
export const notifyCustomerBookingStatus = async (booking, statusTitle, statusMessage) => {
  try {
    await initCustomerNotificationChannel();
    const bId = booking?._id || booking?.bookingId;
    if (!bId) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: statusTitle || 'Booking Update',
        body: statusMessage || `Booking #${bId} status updated: ${booking.bookingStatus || ''}`,
        data: {
          bookingId: bId,
          type: 'CUSTOMER_BOOKING_STATUS',
          screen: 'BookingDetails'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: CUSTOMER_CHANNEL_ID,
      },
      trigger: null,
    });
    console.log(`[CUSTOMER_PUSH] Displayed notification for booking ${bId}: ${statusTitle}`);
  } catch (err) {
    console.warn('[CUSTOMER_PUSH] Failed to display local notification:', err?.message || err);
  }
};

