import { Platform } from 'react-native';

// Steps come from Health Connect, the Android service that other fitness apps (Google Fit, Mi Fitness, Samsung
// Health and so on) write into. Everything here is wrapped so a missing service never crashes the app.
let HC = null;
try {
  HC = require('react-native-health-connect');
} catch (e) {
  HC = null;
}

const STEPS_READ = { accessType: 'read', recordType: 'Steps' };
const short = (e) => String(e && e.message ? e.message : e).slice(0, 140);

// state: unsupported | missing | update | needsPermission | ready | error
export async function healthStatus() {
  if (Platform.OS !== 'android' || !HC) return { state: 'unsupported' };
  try {
    const status = await HC.getSdkStatus();
    if (status === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE) return { state: 'missing' };
    if (status === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return { state: 'update' };
    await HC.initialize();
    const granted = await HC.getGrantedPermissions();
    const ok = (granted || []).some((p) => p.recordType === 'Steps' && p.accessType === 'read');
    return { state: ok ? 'ready' : 'needsPermission' };
  } catch (e) {
    return { state: 'error', message: short(e) };
  }
}

// Opens Health Connect's own permission screen. Returns the new status.
export async function connectHealth() {
  if (!HC) return { state: 'unsupported' };
  try {
    await HC.initialize();
    await HC.requestPermission([STEPS_READ]);
  } catch (e) {
    return { state: 'error', message: short(e) };
  }
  return healthStatus();
}

// Steps since midnight today, or null if they cannot be read.
export async function stepsToday(now = new Date()) {
  if (!HC) return null;
  try {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const result = await HC.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: now.toISOString() },
    });
    return Math.max(0, Math.round((result && result.COUNT_TOTAL) || 0));
  } catch (e) {
    return null;
  }
}

export function openHealthApp() {
  try { if (HC) HC.openHealthConnectSettings(); } catch (e) {}
}

export function healthMessage(h) {
  switch (h.state) {
    case 'missing': return 'Health Connect is not installed. Install "Health Connect" from the Play Store, then try again.';
    case 'update': return 'Health Connect needs an update. Open the Play Store, update it, then try again.';
    case 'needsPermission': return 'CrownWatch is not allowed to read your steps yet. Tap Connect and allow Steps.';
    case 'unsupported': return 'Health Connect is not available in this build.';
    case 'error': return `Could not reach Health Connect: ${h.message || 'unknown problem'}`;
    default: return '';
  }
}
