// Timestamp-based Pomodoro helpers. Timer progress is derived from persisted timestamps,
// so it remains correct after backgrounding or reopening the app.
export const DEFAULT_FOCUS_SETTINGS = {
  dailyGoalMinutes: 120,
  weeklyGoalMinutes: 600,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  weeklyReviewNotification: false,
  weeklyReviewHour: 19,
  ambientSound: 'rain',
  ambientVolume: 0.35,
  ambientDuringBreaks: true,
};

export const emptyFocus = () => ({
  settings: { ...DEFAULT_FOCUS_SETTINGS },
  active: null,
  history: [],
  weeklyReviews: {},
});

export function migrateFocus(value) {
  const base = emptyFocus();
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    ...value,
    settings: { ...base.settings, ...(value.settings || {}) },
    active: value.active && typeof value.active === 'object' ? value.active : null,
    history: Array.isArray(value.history) ? value.history : [],
    weeklyReviews: value.weeklyReviews && typeof value.weeklyReviews === 'object' ? value.weeklyReviews : {},
  };
}

export function remainingSeconds(session, now = Date.now()) {
  if (!session) return 0;
  const elapsed = Math.max(0, Number(session.elapsedSeconds) || 0);
  const running = session.runningSince ? Math.max(0, (now - session.runningSince) / 1000) : 0;
  return Math.max(0, Math.ceil(session.plannedSeconds - elapsed - running));
}

export function elapsedSeconds(session, now = Date.now()) {
  if (!session) return 0;
  const elapsed = Math.max(0, Number(session.elapsedSeconds) || 0);
  const running = session.runningSince ? Math.max(0, (now - session.runningSince) / 1000) : 0;
  return Math.min(session.plannedSeconds, Math.floor(elapsed + running));
}

export function makeFocusSession(type, settings, taskId = null, now = Date.now()) {
  const minutes = type === 'focus' ? settings.focusMinutes : type === 'longBreak' ? settings.longBreakMinutes : settings.shortBreakMinutes;
  return {
    id: `focus_${now}_${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    type,
    plannedSeconds: Math.max(1, Number(minutes) || 25) * 60,
    elapsedSeconds: 0,
    runningSince: now,
    startedAt: now,
    paused: false,
    distracted: false,
    interruptionCount: 0,
    status: 'running',
  };
}

export function pauseFocus(session, now = Date.now()) {
  if (!session?.runningSince) return session;
  return { ...session, elapsedSeconds: elapsedSeconds(session, now), runningSince: null, paused: true, distracted: false };
}

export function resumeFocus(session, now = Date.now()) {
  if (!session || session.runningSince) return session;
  return { ...session, runningSince: now, paused: false, distracted: false };
}

export function distractFocus(session, now = Date.now()) {
  if (!session || session.distracted) return session;
  const paused = pauseFocus(session, now);
  return { ...paused, distracted: true, interruptionCount: (paused.interruptionCount || 0) + 1 };
}

export function nextPomodoroType(history, settings) {
  const completedFocuses = (history || []).filter((s) => s.type === 'focus' && s.status === 'completed').length;
  return completedFocuses > 0 && completedFocuses % Math.max(1, settings.longBreakEvery || 4) === 0 ? 'longBreak' : 'shortBreak';
}

export function completeFocusSession(session, now = Date.now()) {
  const elapsed = elapsedSeconds(session, now);
  return {
    ...session,
    elapsedSeconds: elapsed,
    runningSince: null,
    paused: false,
    distracted: false,
    endedAt: now,
    status: remainingSeconds(session, now) === 0 ? 'completed' : 'endedEarly',
    actualFocusSeconds: elapsed,
  };
}

export function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function weekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function focusTotals(history, from, to) {
  const sessions = (history || []).filter((s) => s.type === 'focus' && s.startedAt >= from && s.startedAt < to);
  return {
    seconds: sessions.reduce((sum, s) => sum + (Number(s.actualFocusSeconds) || 0), 0),
    completed: sessions.filter((s) => s.status === 'completed').length,
    interruptions: sessions.reduce((sum, s) => sum + (Number(s.interruptionCount) || 0), 0),
    sessions,
  };
}
