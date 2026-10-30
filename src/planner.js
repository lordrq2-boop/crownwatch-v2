import { addDays, atTime, dateKey, mondayOf, parseKey, weekdayIndex, fmtTime } from './dates';

export const MAX_PASSES = 2;
export const NAG_COUNT = 6; // repeats after the first reminder, if the task is still not done
export const MAX_QUEUED = 400; // Android allows about 500 scheduled alarms per app
// Minutes after creating a task during which it can still be removed (to fix a typo by adding it again).
// Set to 0 for fully strict: no undo at all.
export const UNDO_WINDOW_MINUTES = 5;

export const doneKey = (key, taskId) => `${key}|${taskId}`;
export const weekEndKey = (weekStart) => dateKey(addDays(parseKey(weekStart), 6));
export const currentWeekStart = (now) => dateKey(mondayOf(now));
export const nextWeekStart = (now) => dateKey(addDays(mondayOf(now), 7));

// A task rings only inside its own week, on its chosen days, from its start date.
export function taskActiveOn(task, key) {
  if (key < task.startDate || key > weekEndKey(task.weekStart)) return false;
  return task.days.includes(weekdayIndex(parseKey(key)));
}

export const tasksOfWeek = (state, weekStart) => state.tasks.filter((t) => t.weekStart === weekStart);

// The most recent earlier week that had tasks, for "carry over".
export function previousWeekTasks(state, now) {
  const cur = currentWeekStart(now);
  const earlier = state.tasks.map((t) => t.weekStart).filter((w) => w < cur).sort();
  if (earlier.length === 0) return [];
  const last = earlier[earlier.length - 1];
  return tasksOfWeek(state, last);
}

// Today's tasks with a status: done, skipped, overdue or upcoming.
export function todaysItems(state, now) {
  const key = dateKey(now);
  return state.tasks
    .filter((t) => taskActiveOn(t, key))
    .map((task) => {
      const deadline = atTime(key, task.time);
      const record = state.done[doneKey(key, task.id)];
      let status = 'upcoming';
      if (record) status = record.status;
      else if (deadline <= now) status = 'overdue';
      return { task, deadline, status, record, dateKey: key, session: state.sessions?.[doneKey(key, task.id)] || null };
    })
    .sort((a, b) => a.deadline - b.deadline);
}

export const getOverdue = (state, now) => todaysItems(state, now).filter((i) => i.status === 'overdue');

export function undoMsLeft(task, state, now) {
  if (UNDO_WINDOW_MINUTES <= 0 || !task.createdAt) return 0;
  const hasHistory = Object.keys(state.done).some((k) => k.endsWith(`|${task.id}`));
  if (hasHistory) return 0;
  return Math.max(0, task.createdAt + UNDO_WINDOW_MINUTES * 60000 - now.getTime());
}

// Every notification the phone should have queued: one at the task time, then repeats until it is done.
// Only the soonest MAX_QUEUED are queued; the list is refreshed whenever the app opens or anything changes.
export function planReminders(state, now) {
  const gap = (state.settings && state.settings.nagMinutes) || 5;
  const out = [];
  let day = parseKey(dateKey(now));
  for (let n = 0; n < 14; n++, day = addDays(day, 1)) {
    const key = dateKey(day);
    for (const task of state.tasks) {
      if (!taskActiveOn(task, key)) continue;
      if (state.done[doneKey(key, task.id)]) continue;
      const session = state.sessions && state.sessions[doneKey(key, task.id)];
      // A running timer replaces the normal reminders with one alert when it ends.
      const base = session ? new Date(session.startedAt + session.minutes * 60000) : atTime(key, task.time);
      for (let i = 0; i <= NAG_COUNT; i++) {
        const when = new Date(base.getTime() + i * gap * 60000);
        if (when.getTime() <= now.getTime() + 2000) continue;
        out.push({
          id: `${task.id}_${key}_${i}`,
          when,
          level: i === 0 ? 'due' : 'nag',
          index: i,
          title: i === 0 ? task.title : `${task.title} is still not done`,
          body: session ? (i === 0 ? 'Timer finished. Open the app and tap Finish.' : 'Your timer finished. Tap to finish it.') : task.proof === 'steps' ? (i === 0 ? `Due at ${fmtTime(task.time)}. Open the app to check your steps.` : `Reminder ${i} of ${NAG_COUNT}. Open the app to check your steps.`) : i === 0 ? `Due at ${fmtTime(task.time)}. Tap to finish it.` : `Reminder ${i} of ${NAG_COUNT}. Tap to finish it.`,
          taskId: task.id,
          dateKey: key,
        });
      }
    }
  }
  out.sort((a, b) => a.when - b.when);
  return out.slice(0, MAX_QUEUED);
}
