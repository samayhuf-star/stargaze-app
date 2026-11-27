import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { readJson, writeJson } from './storage';

/** OneSignal App ID injected by app.config.js from OS_APPID_STARGAZE (EAS env). */
const APP_ID: string = (Constants.expoConfig?.extra as { oneSignalAppId?: string } | undefined)?.oneSignalAppId ?? '';

export const CONSENT_KEY = 'push-consent-v1'; // 'granted' | 'declined' | undefined (not asked yet)
export const GEMINIDS_KEY = 'geminids-reminder-v1';
const GEMINIDS_ID = 'geminids-2026';
const GEMINIDS_TAG = 'geminids_2026';

/** Geminids 2026: peak night 13–14 Dec. Reminder fires on the evening of the 13th, local time. */
export const GEMINIDS_REMINDER_AT = new Date(2026, 11, 13, 20, 0, 0);

export type Consent = 'granted' | 'declined' | undefined;

let initialized = false;

type OneSignalModule = typeof import('react-native-onesignal');

/** Loaded lazily so the native module is never touched before the user consents. */
function loadOneSignal(): OneSignalModule | null {
  if (Platform.OS === 'web' || !APP_ID) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-onesignal') as OneSignalModule;
  } catch (e) {
    console.warn('OneSignal unavailable', e);
    return null;
  }
}

/** Initialise OneSignal. Only ever called after the user said yes. */
function initOneSignal(): OneSignalModule | null {
  const mod = loadOneSignal();
  if (!mod) return null;
  if (!initialized) {
    mod.OneSignal.initialize(APP_ID);
    mod.OneSignal.User.addTag('app', 'stargaze');
    initialized = true;
  }
  return mod;
}

export async function getConsent(): Promise<Consent> {
  return readJson<Consent>(CONSENT_KEY, undefined);
}

/** Re-initialise on later launches when consent was already given. */
export async function initPushIfConsented(): Promise<void> {
  if ((await getConsent()) === 'granted') initOneSignal();
}

/** User accepted the in-app consent prompt: init OneSignal, then ask iOS for permission. */
export async function grantPushConsent(): Promise<boolean> {
  await writeJson(CONSENT_KEY, 'granted');
  const mod = initOneSignal();
  let allowed = false;
  try {
    if (mod) allowed = await mod.OneSignal.Notifications.requestPermission(true);
    else allowed = (await Notifications.requestPermissionsAsync()).granted;
  } catch (e) {
    console.warn('Notification permission failed', e);
  }
  return allowed;
}

export async function declinePushConsent(): Promise<void> {
  await writeJson(CONSENT_KEY, 'declined');
}

/** Turn the Geminids reminder on or off: a local notification plus a OneSignal tag for a server-side send. */
export async function setGeminidsReminder(on: boolean): Promise<boolean> {
  try {
    await Notifications.cancelScheduledNotificationAsync(GEMINIDS_ID).catch(() => undefined);
    if (!on) {
      if ((await getConsent()) === 'granted') initOneSignal()?.OneSignal.User.removeTag(GEMINIDS_TAG);
      await writeJson(GEMINIDS_KEY, false);
      return false;
    }
    if ((await getConsent()) !== 'granted') {
      const ok = await grantPushConsent();
      if (!ok) return false;
    } else {
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted && !(await Notifications.requestPermissionsAsync()).granted) return false;
    }
    initOneSignal()?.OneSignal.User.addTag(GEMINIDS_TAG, '1');
    if (GEMINIDS_REMINDER_AT.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        identifier: GEMINIDS_ID,
        content: {
          title: 'Geminids peak tonight',
          body: 'Up to 150 meteors an hour on 13–14 Dec. Best after 10 pm, away from lights. Open Stargaze to find Gemini.',
          data: { route: '/' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: GEMINIDS_REMINDER_AT },
      });
    }
    await writeJson(GEMINIDS_KEY, true);
    return true;
  } catch (e) {
    console.warn('Geminids reminder failed', e);
    return false;
  }
}
