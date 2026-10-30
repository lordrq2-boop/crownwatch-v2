// A different long sentence for every day, so skipping takes real effort and cannot be memorised.
const TEMPLATES = [
  'I am choosing comfort over my own promise today and I know that skipping {task} is exactly how good habits quietly die.',
  'Nobody forced me to commit to {task}, I decided that myself, and today I am breaking my word to the person I said I wanted to become.',
  'I accept that every time I skip {task} I teach myself that my promises mean nothing, and I am doing it anyway today.',
  'Skipping {task} will not hurt anybody except me, and I am still willing to trade my goals for a few minutes of ease right now.',
  'I understand that tomorrow I will still have to do {task} and today I am only making that future version of me work twice as hard.',
  'I made a plan for {task} while I was thinking clearly, and I am overruling that plan only because I do not feel like doing it.',
  'The person I want to be would do {task} without being reminded, and today I am letting a weaker version of myself make the decision.',
  'I admit that I have no real emergency and that I am skipping {task} only because it feels easier than showing up for myself.',
  'I know that discipline is doing {task} when I do not feel like it, and I am choosing to be undisciplined today of my own free will.',
  'Every small excuse I accept today makes the next excuse easier, and I am deliberately accepting this one about {task}.',
  'I am aware that a skipped day shows in my history forever and that I cannot edit it later, and I am skipping {task} regardless.',
  'I could do {task} right now if I wanted to, and by typing this sentence I am admitting that I simply do not want it enough today.',
  'I promised myself {task} and I am choosing to disappoint myself again, knowing that the disappointment will be mine to carry tonight.',
  'I understand that people who reach their goals do {task} on the days they hate it, and today I am choosing to be someone who does not.',
  'This skip will be written into my history and counted against my week, and I am still willing to give up {task} for nothing in return.',
  'I am not too busy and I am not unable, I am only unwilling to do {task} today, and I am prepared to look at that honestly tomorrow.',
  'If a friend skipped {task} for no reason I would call it an excuse, and I am now giving myself the exact same excuse today.',
  'I understand that I have a limited number of skips this week and I am spending one of them on {task} instead of doing the work.',
  'I accept that nothing about {task} is impossible today, that I am simply tired of trying, and that I am quitting this one on purpose.',
  'I am trading the version of me that finishes what he starts for a few easy hours, and I am doing it by skipping {task} today.',
  'I know that regret costs more than effort, and I am still deciding to skip {task} and pay for it later instead of now.',
  'I am letting today win over my discipline, I am dropping {task} without a real reason, and I will have to live with that choice.',
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function skipPhrase(dateKey, task) {
  const t = TEMPLATES[hash(`${dateKey}|${task.id}`) % TEMPLATES.length];
  return t.replace('{task}', task.title.trim() || 'this task');
}

// Typing must match the sentence; capitals, spaces and punctuation are forgiven.
const flat = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export const phraseMatches = (typed, phrase) => flat(typed) === flat(phrase);
export const PHRASE_COUNT = TEMPLATES.length;
