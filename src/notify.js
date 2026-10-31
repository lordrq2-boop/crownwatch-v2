import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { planReminders } from './planner';
import { remainingSeconds } from './focus';
import { findNextWeatherChange, forecastTimeToDate, formatForecastTime } from './weather';

// Reminders that ring out. Each reminder plays a sound for 10 to 30 seconds, like an alarm tone, then repeats
// every few minutes until the task is done. The sound lives on a notification channel, and Android keeps a
// channel's sound once it exists, so every choice has its own channel:
//   ring_jingle_10 / _20 / _30  our bundled bell jingle
//   ring_phone                  the phone's own tone: you pick any ringtone or alarm tone in Android's sound picker
// All of them are marked as alarms, so they play at the phone's Alarm volume.
export const PACKAGE = 'com.crown.crownwatch';
export const JINGLES = { 10: 'jingle_10.ogg', 20: 'jingle_20.ogg', 30: 'jingle_30.ogg' };
const OLD_CHANNELS = ['alarm', 'alarm_v2', 'reminders_beep', 'reminders_default'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const short = (e) => String(e && e.message ? e.message : e).slice(0, 160);

export function channelIdFor(settings) {
  if (settings && settings.sound === 'phone') return 'ring_phone';
  const s = settings && [10, 20, 30].includes(settings.ringSeconds) ? settings.ringSeconds : 20;
  return `ring_jingle_${s}`;
}

const soundFileFor = (channelId) => (channelId === 'ring_phone' ? 'default' : JINGLES[channelId.replace('ring_jingle_', '')] || 'default');
const deliveryFor = (settings) => (settings && settings.reliable ? 'alarmClock' : 'bestEffort');

// Returns { ok, reason, exact }.
export async function setupNotifications() {
  try {
    if (Platform.OS === 'android') {
      for (const id of OLD_CHANNELS) {
        try { await Notifications.deleteNotificationChannelAsync(id); } catch (e) {}
      }
      const common = {
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 450, 250, 450, 250, 450, 250, 450],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableLights: true,
        lightColor: '#F4B731',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
        },
      };
      for (const [secs, file] of Object.entries(JINGLES)) {
        await Notifications.setNotificationChannelAsync(`ring_jingle_${secs}`, { ...common, name: `CrownFlow jingle (${secs} seconds)`, sound: file });
      }
      await Notifications.setNotificationChannelAsync('ring_phone', { ...common, name: 'Phone ringtone', sound: 'default' });
    }
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain !== false) perm = await Notifications.requestPermissionsAsync();
    let exact = true;
    try { exact = !!(await Notifications.getExactAlarmPermissionsAsync()).granted; } catch (e) {}
    if (perm.granted) return { ok: true, reason: '', exact };
    return {
      ok: false,
      exact,
      reason: perm.canAskAgain === false
        ? 'Notifications are blocked for CrownFlow. Open the phone Settings, Apps, CrownFlow, Notifications, and switch them on.'
        : 'Notifications are not allowed yet. Tap Check again and choose Allow.',
    };
  } catch (e) {
    return { ok: false, exact: false, reason: `Could not set up notifications: ${short(e)}` };
  }
}

// Clears everything and queues the plan again. Safe to call as often as needed.
export async function applySchedule(state, now = new Date()) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const channelId = channelIdFor(state.settings);
    const delivery = deliveryFor(state.settings);
    const sound = soundFileFor(channelId);
    const reminders = planReminders(state, now);
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, sound, data: { taskId: r.taskId, dateKey: r.dateKey } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.when, channelId, delivery },
      });
    }
    const activeFocus = state.focus?.active;
    if (activeFocus?.runningSince) {
      const secondsLeft = remainingSeconds(activeFocus, now.getTime());
      if (secondsLeft > 0) {
        await Notifications.scheduleNotificationAsync({
          identifier: `crownflow_focus_${activeFocus.id}`,
          content: {
            title: activeFocus.type === 'focus' ? 'Focus session complete' : 'Break complete',
            body: activeFocus.type === 'focus' ? 'Your focus time is up. Open CrownFlow to continue.' : 'Your break is over. Open CrownFlow when you are ready for the next session.',
            sound,
            data: { type: 'focusComplete', sessionId: activeFocus.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(now.getTime() + secondsLeft * 1000), channelId, delivery },
        });
      }
    }
    const reviewSettings = state.focus?.settings || {};
    if (reviewSettings.weeklyReviewNotification) {
      const hour = Math.max(0, Math.min(23, Number(reviewSettings.weeklyReviewHour ?? 19)));
      const trigger = Platform.OS === 'ios'
        ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, weekday: 2, hour, minute: 0, repeats: true }
        : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour, minute: 0 };
      await Notifications.scheduleNotificationAsync({
        identifier: 'crownflow_weekly_review',
        content: { title: 'Your weekly review', body: 'Take a moment to review last week’s tasks and focus progress.', data: { type: 'weeklyReview' } },
        trigger,
      });
    }
    // Weather alerts are optional and only schedule the next meaningful forecast change.
    try { const scheduled = await Notifications.getAllScheduledNotificationsAsync(); for (const item of scheduled) { if (item.content?.data?.type === 'weatherChange') await Notifications.cancelScheduledNotificationAsync(item.identifier); } } catch (e) {}
    if (state.settings?.weatherChangeAlerts && state.settings?.weatherData) {
      const change = findNextWeatherChange(state.settings.weatherData, now);
      if (change) {
        const expectedAt = forecastTimeToDate(change.at, state.settings.weatherData).getTime();
        const notifyAt = Math.max(now.getTime() + 60 * 1000, expectedAt - 30 *  60 * 1000);
        if (notifyAt < expectedAt && expectedAt > now.getTime() + 60 * 1000) {
          await Notifications.scheduleNotificationAsync({
            content: { title: change.title, body: `${change.detail}. Expected around ${formatForecastTime(change.at, state.settings.weatherData)}.`, data: { type: 'weatherChange', kind: change.kind, at: change.at } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(notifyAt) },
          });
        }
      }
    }
    return reminders.length;
  } catch (e) {
    return 0;
  }
}

// Removes reminders already in the notification shade. This also stops a tone that is still playing,
// so opening the app or finishing a task silences it.
export async function clearShown() {
  try { await Notifications.dismissAllNotificationsAsync(); } catch (e) {}
}

// One reminder in 10 seconds, with the chosen sound, so you can hear it.
export async function sendTest(settings) {
  try {
    const channelId = channelIdFor(settings);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'CrownFlow test', body: 'If you can hear this, reminders can ring out.', sound: soundFileFor(channelId) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId },
    });
    return 'Test sent. Leave the app or lock the phone and wait 10 seconds. It rings at your Alarm volume.';
  } catch (e) {
    return `Could not send the test: ${short(e)}`;
  }
}

// Opens Android's own sound screen for the phone-ringtone channel, where you pick any ringtone or alarm tone.
export async function openRingtonePicker() {
  try {
    await Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: PACKAGE },
      { key: 'android.provider.extra.CHANNEL_ID', value: 'ring_phone' },
    ]);
  } catch (e) {
    try { await Linking.openSettings(); } catch (e2) {}
  }
}

export const useLastNotificationResponse = Notifications.useLastNotificationResponse;
