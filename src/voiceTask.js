import { CATEGORIES, categoryOf } from './categories';
import { weekdayIndex } from './dates';

const dayWords = [
  ['monday', 0], ['tuesday', 1], ['wednesday', 2], ['thursday', 3], ['friday', 4], ['saturday', 5], ['sunday', 6],
];

export function parseVoiceTask(raw, now = new Date()) {
  const original = String(raw || '').trim();
  if (!original) return { ok: false, reason: 'I did not catch a task. Try speaking again.' };
  let text = original.toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
  let days = [];
  let week = 'this';
  const tomorrow = /\btomorrow\b/.test(text);
  const today = /\btoday\b/.test(text);
  const weekdays = /\bweekdays\b/.test(text);
  const everyDay = /\b(every day|daily)\b/.test(text);
  if (tomorrow) days = [((weekdayIndex(now) + 1) % 7)];
  else if (today) days = [weekdayIndex(now)];
  else if (weekdays) days = [0, 1, 2, 3, 4];
  else if (everyDay) days = [0, 1, 2, 3, 4, 5, 6];
  else {
    for (const [name, index] of dayWords) if (new RegExp(`\\b${name}s?\\b`).test(text)) days.push(index);
    if (days.length) days = [...new Set(days)].sort();
  }
  if (!days.length) days = [weekdayIndex(now)];
  if (/\bnext week\b/.test(text)) week = 'next';

  let time = null;
  const m24 = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  const m12 = text.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (m24) time = `${String(Number(m24[1])).padStart(2, '0')}:${m24[2]}`;
  else if (m12) {
    let h = Number(m12[1]) % 12;
    if (m12[3].replace(/\./g, '').startsWith('p')) h += 12;
    time = `${String(h).padStart(2, '0')}:${m12[2] || '00'}`;
  }

  const durationMatch = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|half an?)\s*(hours?|hrs?|minutes?|mins?)\b/);
  const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, 'half a': 30, 'half an': 30 };
  let minutes = durationMatch ? (numberWords[durationMatch[1]] || Number(durationMatch[1])) * (/hour|hr/.test(durationMatch[2]) ? 60 : 1) : null;
  if (minutes != null) minutes = Math.max(5, Math.min(180, minutes));

  let category = 'other';
  const rules = [
    ['study', /\b(study|read|revise|lesson|flashcards|course)\b/],
    ['gym', /\b(gym|workout|exercise|run|running|weights)\b/],
    ['walk', /\b(walk|walking|stroll)\b/],
    ['move', /\b(stretch|push.?ups|mobility|yoga)\b/],
    ['eat', /\b(eat|breakfast|lunch|dinner|cook|meal)\b/],
    ['water', /\b(water|hydrate|drink)\b/],
    ['sleep', /\b(sleep|bed|wind down)\b/],
    ['home', /\b(clean|laundry|dishes|chores|wash)\b/],
    ['work', /\b(work|script|edit|email|meeting|project)\b/],
  ];
  for (const [id, regex] of rules) if (regex.test(text)) { category = id; break; }

  let title = original
    .replace(/^\s*(hey\s+)?crownflow[, ]*/i, '')
    .replace(/^\s*(please\s+)?(create|add|make|schedule|set up)\s+(a\s+)?(new\s+)?(task|reminder)\s*(to\s+)?/i, '')
    .replace(/\b(today|tomorrow|every day|daily|weekdays|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/ig, '')
    .replace(/\b(at\s+)?(1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(a\.?m\.?|p\.?m\.?)\b/ig, '')
    .replace(/\b(at\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)\b/ig, '')
    .replace(/\b(for\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|half an?)\s*(hours?|hrs?|minutes?|mins?)\b/ig, '')
    .replace(/\b(at|for|on)\b/ig, ' ').replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
  title = title.replace(/^(to|that)\s+/i, '').trim();
  if (title.length > 60) title = title.slice(0, 60).trim();
  if (!title) return { ok: false, reason: 'I heard the instruction, but could not identify the task name. Please edit the words and try again.' };

  const cat = categoryOf(category);
  const proof = cat.proof;
  const finalMinutes = minutes || cat.minutes;
  const missing = [];
  if (!time) missing.push('finish time');
  return { ok: true, data: { category, title, time: time || '18:00', days, proof, minutes: proof === 'timer' ? finalMinutes : 0 }, week, missing, assumptions: { day: !today && !tomorrow && !weekdays && !everyDay && !dayWords.some(([name]) => new RegExp(`\\b${name}s?\\b`).test(text)), time: !time, duration: !durationMatch } };
}
