import { Platform } from 'react-native';

// Health Connect is Android-only. Keep all calls guarded so missing services or
// individual permissions never prevent the rest of CrownWatch from opening.
let HC = null;
try { HC = require('react-native-health-connect'); } catch (e) { HC = null; }

const PERMISSIONS = {
  steps: { accessType: 'read', recordType: 'Steps' },
  calories: { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  distance: { accessType: 'read', recordType: 'Distance' },
  weight: { accessType: 'read', recordType: 'Weight' },
};
const short = (e) => String(e && e.message ? e.message : e).slice(0, 140);
const hasPermission = (list, recordType) => (list || []).some((p) => p.recordType === recordType && p.accessType === 'read');

function dayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { operator: 'between', startTime: start.toISOString(), endTime: now.toISOString() };
}
function weekRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return { operator: 'between', startTime: start.toISOString(), endTime: now.toISOString() };
}
function energyKcal(result) {
  const value = result?.ACTIVE_CALORIES_TOTAL || result;
  if (typeof value?.inKilocalories === 'number') return value.inKilocalories;
  if (typeof value?.inCalories === 'number') return value.inCalories / 1000;
  if (typeof value?.inJoules === 'number') return value.inJoules / 4184;
  if (typeof value?.inKilojoules === 'number') return value.inKilojoules / 4.184;
  return null;
}
function distanceMeters(result) {
  const value = result?.DISTANCE || result;
  if (typeof value?.inMeters === 'number') return value.inMeters;
  if (typeof value?.inKilometers === 'number') return value.inKilometers * 1000;
  if (typeof value?.inCentimeters === 'number') return value.inCentimeters / 100;
  return null;
}

// state: unsupported | missing | update | needsPermission | ready | error
export async function healthStatus() {
  if (Platform.OS !== 'android' || !HC) return { state: 'unsupported', permissions: {} };
  try {
    const status = await HC.getSdkStatus();
    if (status === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE) return { state: 'missing', permissions: {} };
    if (status === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return { state: 'update', permissions: {} };
    await HC.initialize();
    const granted = await HC.getGrantedPermissions();
    const permissions = {
      steps: hasPermission(granted, 'Steps'),
      calories: hasPermission(granted, 'ActiveCaloriesBurned'),
      distance: hasPermission(granted, 'Distance'),
      weight: hasPermission(granted, 'Weight'),
    };
    return { state: permissions.steps ? 'ready' : 'needsPermission', permissions };
  } catch (e) {
    return { state: 'error', message: short(e), permissions: {} };
  }
}

export async function connectHealth() {
  if (!HC) return { state: 'unsupported', permissions: {} };
  try {
    await HC.initialize();
    await HC.requestPermission(Object.values(PERMISSIONS));
  } catch (e) {
    return { state: 'error', message: short(e), permissions: {} };
  }
  return healthStatus();
}

async function aggregate(recordType, timeRangeFilter) {
  if (!HC) return null;
  try { return await HC.aggregateRecord({ recordType, timeRangeFilter }); } catch (e) { return null; }
}

export async function stepsToday(now = new Date()) {
  const result = await aggregate('Steps', dayRange(now));
  const value = result?.COUNT_TOTAL;
  return typeof value === 'number' ? Math.max(0, Math.round(value)) : null;
}

// Steps recorded during a Walk Session, bounded to the session's start and current time.
export async function stepsDuring(startedAt, now = new Date()) {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (Number.isNaN(start.getTime()) || start >= now) return 0;
  const result = await aggregate('Steps', { operator: 'between', startTime: start.toISOString(), endTime: now.toISOString() });
  const value = result?.COUNT_TOTAL;
  return typeof value === 'number' ? Math.max(0, Math.round(value)) : null;
}

// Activity measurements for the home dashboard. Missing permissions/data are null,
// not fabricated zeroes, so the UI can distinguish "no data" from a real zero.
export async function activityToday(now = new Date(), status = null) {
  const h = status || await healthStatus();
  if (h.state !== 'ready') return { steps: null, activeCalories: null, distanceMeters: null, weightKg: null };
  const range = dayRange(now);
  const jobs = [
    h.permissions?.steps ? aggregate('Steps', range) : Promise.resolve(null),
    h.permissions?.calories ? aggregate('ActiveCaloriesBurned', range) : Promise.resolve(null),
    h.permissions?.distance ? aggregate('Distance', range) : Promise.resolve(null),
  ];
  const [stepsResult, caloriesResult, distanceResult] = await Promise.all(jobs);
  let weightKg = null;
  if (h.permissions?.weight && HC?.readRecords) {
    try {
      const start = new Date(now.getTime() - 30 * 86400000);
      const response = await HC.readRecords('Weight', {
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: now.toISOString() },
        ascending: false,
      });
      const records = response?.records || [];
      const latest = records.sort((a, b) => new Date(b.time || b.startTime || 0) - new Date(a.time || a.startTime || 0))[0];
      const mass = latest?.weight;
      if (typeof mass?.inKilograms === 'number') weightKg = mass.inKilograms;
      else if (typeof mass?.inGrams === 'number') weightKg = mass.inGrams / 1000;
      else if (typeof mass?.inPounds === 'number') weightKg = mass.inPounds * 0.45359237;
    } catch (e) { /* Weight is optional; other dashboard metrics remain usable. */ }
  }
  return {
    steps: typeof stepsResult?.COUNT_TOTAL === 'number' ? Math.max(0, Math.round(stepsResult.COUNT_TOTAL)) : null,
    activeCalories: energyKcal(caloriesResult),
    distanceMeters: distanceMeters(distanceResult),
    weightKg,
  };
}

export async function activityWeek(now = new Date(), status = null) {
  const h = status || await healthStatus();
  if (h.state !== 'ready') return { steps: null, activeCalories: null };
  const range = weekRange(now);
  const [stepsResult, caloriesResult] = await Promise.all([
    h.permissions?.steps ? aggregate('Steps', range) : Promise.resolve(null),
    h.permissions?.calories ? aggregate('ActiveCaloriesBurned', range) : Promise.resolve(null),
  ]);
  return {
    steps: typeof stepsResult?.COUNT_TOTAL === 'number' ? Math.max(0, Math.round(stepsResult.COUNT_TOTAL)) : null,
    activeCalories: energyKcal(caloriesResult),
  };
}

export function openHealthApp() {
  try { if (HC) HC.openHealthConnectSettings(); } catch (e) {}
}

export function healthMessage(h) {
  switch (h.state) {
    case 'missing': return 'Health Connect is not installed. Install Health Connect from the Play Store, then try again.';
    case 'update': return 'Health Connect needs an update. Open the Play Store, update it, then try again.';
    case 'needsPermission': return 'CrownWatch needs permission to read your steps. Tap Connect and allow access in Health Connect.';
    case 'unsupported': return 'Health Connect is not available in this build.';
    case 'error': return `Could not reach Health Connect: ${h.message || 'unknown problem'}`;
    default: return '';
  }
}
