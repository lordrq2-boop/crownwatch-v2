import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey, mondayOf } from './dates';

const KEY = 'taskalarm.v1';

export const DEFAULT_SETTINGS = { animations: true, sound: 'jingle', ringSeconds: 20, nagMinutes: 5, reliable: false, stepGoal: 3000 };

export const emptyState = () => ({
  version: 4,
  // Tasks are never edited or removed once saved (apart from a short undo window), so history stays honest.
  // { id, category, title, time: 'HH:MM', days: [0-6], proof: 'qr'|'photo'|'timer', minutes,
  //   weekStart: 'YYYY-MM-DD' (the Monday of its week), startDate, createdAt }
  tasks: [],
  done: {}, // 'YYYY-MM-DD|taskId' -> { status: 'done'|'skipped', at, proof, uri, minutes }
  sessions: {}, // 'YYYY-MM-DD|taskId' -> { startedAt, minutes } for timers in progress
  walkSession: null, // { startedAt, expiresAt, startSteps } for the independent Walk activity
  pairSecret: null, // shared with the PC key tool
  passes: { week: null, used: 0 },
  settings: { ...DEFAULT_SETTINGS },
});

// Brings data saved by older versions up to date.
export function migrate(s) {
  const base = emptyState();
  const out = { ...base, ...s, version: 4 };
  const oldWeek = s.weekStart || dateKey(mondayOf(new Date()));
  out.tasks = (s.tasks || []).map((t) => {
    const { kind, key, strict, hint, steps, ...rest } = t;
    // Older CrownWatch versions allowed Steps as task proof. Preserve those tasks
    // as ordinary timed tasks; step totals now belong only to the Health dashboard.
    const legacyStepsProof = rest.proof === 'steps';
    return { ...rest, minutes: legacyStepsProof ? (rest.minutes || 30) : (rest.minutes || 0), createdAt: rest.createdAt || 0, weekStart: rest.weekStart || oldWeek, proof: legacyStepsProof || !rest.proof ? 'timer' : rest.proof, category: !rest.category || rest.category === 'wake' ? (kind === 'wake' ? 'other' : 'work') : rest.category };
  });
  out.done = s.done && typeof s.done === 'object' ? s.done : {};
  out.sessions = s.sessions && typeof s.sessions === 'object' ? s.sessions : {};
  out.passes = { ...base.passes, ...(s.passes || {}) };
  out.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  if (![3000, 5000, 8000, 10000].includes(out.settings.stepGoal)) out.settings.stepGoal = 3000;
  out.walkSession = s.walkSession && Number.isFinite(s.walkSession.expiresAt) ? s.walkSession : null;
  // 0.5 stored the sound as 'beep' or 'default'
  if (out.settings.sound === 'beep') out.settings.sound = 'jingle';
  if (out.settings.sound === 'default') out.settings.sound = 'phone';
  if (![10, 20, 30].includes(out.settings.ringSeconds)) out.settings.ringSeconds = 20;
  delete out.weekStart;
  delete out.qrCode;
  return out;
}

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch (e) {
    return emptyState();
  }
}

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Storage failure should never crash the app.
  }
}
