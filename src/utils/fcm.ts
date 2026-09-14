/**
 * EDUkenZA FCM Web Push & Native Web Notification Helper
 * Handles Web Push permissions, desktop browser notifications, and chime alerts.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Request Web Push Notification Permissions
export async function requestNotificationPermission(userId?: string): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const mockWebPushToken = `web_push_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('edukenza_push_token', mockWebPushToken);

      if (userId) {
        // Save FCM token document to Firestore
        try {
          await setDoc(doc(db, 'fcmTokens', `${userId}_web`), {
            tokenId: `${userId}_web`,
            userId,
            token: mockWebPushToken,
            deviceInfo: navigator.userAgent,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        } catch (err) {
          console.warn('Could not persist FCM token to Firestore:', err);
        }
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

// Show a native Browser Desktop Notification
export function showDesktopNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&auto=format&fit=crop&q=80',
        badge: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&auto=format&fit=crop&q=80',
        tag: 'edukenza-notification',
        ...options,
      });

      notification.onclick = function () {
        window.focus();
        notification.close();
      };

      // Auto-close desktop notification after 2 seconds (2000ms)
      setTimeout(() => {
        try {
          notification.close();
        } catch (e) {
          // ignore
        }
      }, 2000);
    } catch (e) {
      console.warn('Browser prevented background notification execution:', e);
    }
  }
}

// Play notification audio alert
export function playNotificationChime() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio Context might be locked by browser policies before user gesture
  }
}
