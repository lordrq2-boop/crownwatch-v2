import { addDays, dateKey, parseKey } from './dates';
import { dayItems, dayScore } from './stats';
import { focusTotals, weekKey } from './focus';

const startOfDay = (key) => parseKey(key).getTime();

export function createWeeklyReview(state, mondayKey, now = new Date()) {
  const monday = parseKey(mondayKey);
  const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
  const dayRows = days.map((key) => {
    const items = dayItems(state, key, now);
    return { key, score: dayScore(items) };
  });
  const totals = dayRows.reduce((a, d) => ({
    scheduled: a.scheduled + d.score.total,
    done: a.done + d.score.done,
    skipped: a.skipped + d.score.skipped,
    missed: a.missed + d.score.missed,
  }), { scheduled: 0, done: 0, skipped: 0, missed: 0 });
  const focus = focusTotals(state.focus?.history, startOfDay(mondayKey), addDays(monday, 7).getTime());
  const focusByDay = days.map((key) => {
    const from = startOfDay(key);
    const to = from + 86400000;
    const seconds = (focus.sessions || []).filter((s) => s.startedAt >= from && s.startedAt < to).reduce((n, s) => n + (s.actualFocusSeconds || 0), 0);
    return { key, seconds };
  });
  const mostProductive = [...dayRows].sort((a, b) => b.score.done - a.score.done)[0];
  const mostFocused = [...focusByDay].sort((a, b) => b.seconds - a.seconds)[0];
  const resolved = totals.done + totals.skipped + totals.missed;
  return {
    weekStart: mondayKey,
    generatedAt: now.toISOString(),
    tasks: { ...totals, completionRate: resolved ? totals.done / resolved : null, mostProductiveDay: mostProductive?.score.done ? mostProductive.key : null },
    focus: { seconds: focus.seconds, completed: focus.completed, interruptions: focus.interruptions, averageSeconds: focus.sessions.length ? Math.round(focus.seconds / focus.sessions.length) : 0, weeklyGoalMinutes: state.focus?.settings?.weeklyGoalMinutes || 600, goalProgress: (state.focus?.settings?.weeklyGoalMinutes || 600) > 0 ? focus.seconds / ((state.focus?.settings?.weeklyGoalMinutes || 600) * 60) : 0, mostFocusedDay: mostFocused?.seconds ? mostFocused.key : null, byDay: focusByDay },
    health: null,
  };
}

export function addMissingWeeklyReviews(state, now = new Date()) {
  const current = weekKey(now);
  const candidates = new Set([
    ...(state.tasks || []).map((t) => t.weekStart).filter(Boolean),
    ...(state.focus?.history || []).map((s) => weekKey(new Date(s.startedAt))),
  ]);
  const reviews = { ...(state.focus?.weeklyReviews || {}) };
  let changed = false;
  for (const mondayKey of [...candidates].sort()) {
    if (mondayKey >= current || reviews[mondayKey]) continue;
    reviews[mondayKey] = createWeeklyReview(state, mondayKey, now);
    changed = true;
  }
  return changed ? { ...state, focus: { ...state.focus, weeklyReviews: reviews } } : state;
}
