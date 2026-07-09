/**
 * Firebase push notification registration helper.
 *
 * Call registerPushNotifications() once after the user is authenticated
 * (works for BOTH customers and the admin). It does nothing on web —
 * only runs inside the native Capacitor app.
 *
 * What it does:
 *  1. Asks for permission to send notifications.
 *  2. Registers the device with Firebase and gets an FCM token.
 *  3. Sends that token to our backend (PUT /auth/fcm-token) so the server
 *     can address push notifications to this specific device/user.
 *  4. IMPORTANT: when a push arrives while the app is OPEN (foreground),
 *     Android does not display it automatically — so we catch it and show
 *     it manually as a local notification. Without this, notifications
 *     only appear when the app is closed or in the background.
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import api from '../api/api';

// Attach listeners only once, even if registerPushNotifications()
// is called from several pages (customer home + admin dashboard).
let listenersAttached = false;

export async function registerPushNotifications() {
  // Only works inside the native Android / iOS app
  if (!Capacitor.isNativePlatform()) return;

  // 1. Permission for push notifications (Android 13+ shows a system dialog)
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    console.warn('Push notification permission denied');
    return;
  }

  // Permission for local notifications (used to display foreground pushes)
  try {
    await LocalNotifications.requestPermissions();
  } catch (e) {
    console.warn('Local notification permission issue:', e);
  }

  // 2. Attach listeners BEFORE registering, so no event is missed
  if (!listenersAttached) {
    listenersAttached = true;

    // Fired when Firebase issues the device token
    PushNotifications.addListener('registration', async (token) => {
      try {
        await api.put('/auth/fcm-token', { fcm_token: token.value });
        console.log('FCM token saved to server');
      } catch (e) {
        console.error('Failed to save FCM token:', e);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', JSON.stringify(err));
    });

    // 3. Push received while the app is OPEN (foreground):
    //    Android shows nothing by default — display it ourselves.
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 2147483647),
            title: notification.title || 'Kids Salon',
            body:  notification.body  || '',
          }],
        });
      } catch (e) {
        console.error('Failed to show foreground notification:', e);
      }
    });
  }

  // 4. Register with Firebase (triggers the 'registration' listener)
  await PushNotifications.register();
}
