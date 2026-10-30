// What a task is about. Icons are Ionicons names. `proof` is the suggested way to prove it.
// `examples` feed the name box: the first one is the placeholder, all of them appear as tap-to-fill suggestions.
export const CATEGORIES = [
  { id: 'work', label: 'Work', icon: 'briefcase-outline', proof: 'qr', minutes: 45, examples: ['Write the script', 'Edit the video', 'Reply to emails', 'Plan tomorrow'] },
  { id: 'study', label: 'Study', icon: 'book-outline', proof: 'timer', minutes: 45, examples: ['Read 20 pages', 'Revise my notes', 'Finish a lesson', 'Practice flashcards'] },
  { id: 'gym', label: 'Gym', icon: 'barbell-outline', proof: 'timer', minutes: 60, examples: ['Take a run', 'Leg day', 'Chest and triceps', 'Back and biceps'] },
  { id: 'walk', label: 'Walk', icon: 'walk-outline', proof: 'timer', minutes: 30, examples: ['Take a 30 minute walk', 'Walk around the block', 'Evening stroll'] },
  { id: 'move', label: 'Move', icon: 'body-outline', proof: 'timer', minutes: 20, examples: ['Stretch for 10 minutes', 'Do 50 push-ups', 'Morning mobility'] },
  { id: 'eat', label: 'Eat', icon: 'restaurant-outline', proof: 'photo', minutes: 20, examples: ['Eat a proper lunch', 'Have breakfast', 'Cook dinner', 'Eat some fruit'] },
  { id: 'water', label: 'Hydrate', icon: 'water-outline', proof: 'photo', minutes: 5, examples: ['Drink a glass of water', 'Finish the water bottle'] },
  { id: 'sleep', label: 'Sleep', icon: 'moon-outline', proof: 'photo', minutes: 5, examples: ['Phone down, lights out', 'Wind down for bed', 'Be in bed'] },
  { id: 'home', label: 'Chores', icon: 'home-outline', proof: 'photo', minutes: 20, examples: ['Wash the dishes', 'Clean my room', 'Do the laundry', 'Take out the trash'] },
  { id: 'other', label: 'Other', icon: 'star-outline', proof: 'timer', minutes: 20, examples: ['Call a friend', 'Pay a bill', 'Something else'] },
];

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

export const PROOFS = {
  qr: { label: 'Daily code', short: 'Daily code', icon: 'qr-code-outline', blurb: 'Scan today\'s code from your PC' },
  photo: { label: 'Photo', short: 'Photo', icon: 'camera-outline', blurb: 'Take a photo as proof' },
  timer: { label: 'Timer', short: 'Timer', icon: 'timer-outline', blurb: 'Run a timer for the full time' },
};

export const TIMER_CHOICES = [5, 10, 15, 20, 30, 45, 60, 90];

// 8000 -> "8,000"
export const fmtSteps = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
