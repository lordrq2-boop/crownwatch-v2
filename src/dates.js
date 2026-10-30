// All dates are handled in the phone's local time. Day keys look like 2026-10-27.
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LONG_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
// Returns local midnight of the day n days after d.
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const weekdayIndex = (d) => (d.getDay() + 6) % 7; // Monday = 0
export const mondayOf = (d) => addDays(d, -weekdayIndex(d));
export const atTime = (key, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = parseKey(key);
  d.setHours(h, m, 0, 0);
  return d;
};

export function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}
export const fmtClock = (d) => fmtTime(`${d.getHours()}:${d.getMinutes()}`);
export const fmtLongDate = (d) => `${LONG_DAYS[weekdayIndex(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const fmtShortDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

export function fmtDays(days) {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [0, 1, 2, 3, 4].every((i) => days.includes(i))) return 'Weekdays';
  return [...days].sort().map((i) => DAY_NAMES[i]).join(', ');
}

export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// "2h 14m", "45m", "30s"
export function fmtCountdown(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

// "24:59" style for the timer screen
export function fmtClockDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function fmtDayHeading(key, now) {
  const d = parseKey(key);
  const today = dateKey(now);
  if (key === today) return 'Today';
  if (key === dateKey(addDays(parseKey(today), -1))) return 'Yesterday';
  return `${LONG_DAYS[weekdayIndex(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export const fmtMonthDay = (d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

export function greeting(now) {
  const h = now.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
