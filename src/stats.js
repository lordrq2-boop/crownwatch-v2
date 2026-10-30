import { addDays, atTime, dateKey, mondayOf, parseKey } from './dates';
import { doneKey, taskActiveOn } from './planner';

// Everything scheduled on one day, with what happened to it.
export function dayItems(state, key, now) {
  const today = dateKey(now);
  return state.tasks
    .filter((t) => taskActiveOn(t, key))
    .map((task) => {
      const record = state.done[doneKey(key, task.id)];
      const deadline = atTime(key, task.time);
      let status;
      if (record) status = record.status;
      else if (key < today) status = 'missed';
      else if (key === today) status = deadline <= now ? 'overdue' : 'upcoming';
      else status = 'upcoming';
      return { task, record, deadline, status, dateKey: key };
    })
    .sort((a, b) => a.deadline - b.deadline);
}

export function dayScore(items) {
  const c = { total: items.length, done: 0, skipped: 0, missed: 0, pending: 0 };
  for (const i of items) {
    if (i.status === 'done') c.done++;
    else if (i.status === 'skipped') c.skipped++;
    else if (i.status === 'missed') c.missed++;
    else c.pending++;
  }
  return { ...c, ratio: c.total ? c.done / c.total : null, complete: c.total > 0 && c.done === c.total };
}

export const firstDay = (state) => (state.tasks.length ? state.tasks.map((t) => t.startDate).sort()[0] : null);

// Days (newest first, today included) that had something scheduled.
export function history(state, now, days = 30) {
  const out = [];
  const today = parseKey(dateKey(now));
  for (let i = 0; i < days; i++) {
    const key = dateKey(addDays(today, -i));
    const items = dayItems(state, key, now);
    if (items.length) out.push({ key, items, score: dayScore(items) });
  }
  return out;
}

// Consecutive days with every task done. Days with no tasks are skipped over. Today only counts once finished.
export function streaks(state, now) {
  const start = firstDay(state);
  if (!start) return { current: 0, best: 0 };
  const today = parseKey(dateKey(now));
  let best = 0, run = 0, current = 0;
  const first = parseKey(start);
  const span = Math.round((today - first) / 86400000);
  const results = [];
  for (let i = 0; i <= span; i++) {
    const d = addDays(first, i);
    const score = dayScore(dayItems(state, dateKey(d), now));
    results.push({ isToday: i === span, score });
  }
  for (const r of results) {
    if (r.score.total === 0) continue;
    if (r.score.complete) { run++; best = Math.max(best, run); }
    else if (r.isToday && r.score.skipped === 0) { /* today still in progress: neither counts nor breaks */ }
    else run = 0;
  }
  current = run;
  return { current, best };
}

// The seven days of the current week.
export function weekStrip(state, now) {
  const monday = mondayOf(now);
  const todayKey = dateKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const key = dateKey(addDays(monday, i));
    const score = dayScore(dayItems(state, key, now));
    return { key, index: i, score, isToday: key === todayKey, isFuture: key > todayKey };
  });
}

export function weekSummary(state, now) {
  const strip = weekStrip(state, now);
  const active = strip.filter((d) => d.score.total > 0);
  return { strip, activeDays: active.length, completeDays: active.filter((d) => d.score.complete).length };
}

// Share of finished-or-missed tasks that were done, over the last N days.
export function completionRate(state, now, days = 30) {
  let done = 0, resolved = 0;
  const today = parseKey(dateKey(now));
  for (let i = 0; i < days; i++) {
    const s = dayScore(dayItems(state, dateKey(addDays(today, -i)), now));
    done += s.done;
    resolved += s.done + s.skipped + s.missed;
  }
  return resolved === 0 ? null : done / resolved;
}

// Of tasks that were done, how many were finished by their deadline.
export function onTimeRate(state, now, days = 30) {
  let onTime = 0, total = 0;
  const today = parseKey(dateKey(now));
  for (let i = 0; i < days; i++) {
    for (const it of dayItems(state, dateKey(addDays(today, -i)), now)) {
      if (it.status === 'done' && it.record && it.record.at) {
        total++;
        if (new Date(it.record.at) <= new Date(it.deadline.getTime() + 60000)) onTime++;
      }
    }
  }
  return total === 0 ? null : onTime / total;
}

export function lastDays(state, now, count) {
  const today = parseKey(dateKey(now));
  return Array.from({ length: count }, (_, i) => {
    const key = dateKey(addDays(today, -(count - 1 - i)));
    return { key, date: addDays(today, -(count - 1 - i)), score: dayScore(dayItems(state, key, now)) };
  });
}

export function categoryBreakdown(state, now, days = 30) {
  const map = {};
  const today = parseKey(dateKey(now));
  for (let i = 0; i < days; i++) {
    for (const it of dayItems(state, dateKey(addDays(today, -i)), now)) {
      if (it.status === 'upcoming' || it.status === 'overdue') continue;
      const m = (map[it.task.category] = map[it.task.category] || { done: 0, total: 0 });
      m.total++;
      if (it.status === 'done') m.done++;
    }
  }
  return Object.entries(map).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total);
}

export function totalDone(state) {
  return Object.values(state.done).filter((r) => r.status === 'done').length;
}
