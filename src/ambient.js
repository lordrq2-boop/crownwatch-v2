export const AMBIENT_SOUNDS = [
  { id: 'rain', label: 'Rain', source: require('../assets/ambient/rain.wav') },
  { id: 'forest', label: 'Forest', source: require('../assets/ambient/forest.wav') },
  { id: 'fireplace', label: 'Fireplace', source: require('../assets/ambient/fireplace.wav') },
  { id: 'white-noise', label: 'White noise', source: require('../assets/ambient/white-noise.wav') },
  { id: 'brown-noise', label: 'Brown noise', source: require('../assets/ambient/brown-noise.wav') },
];

export const ambientSound = (id) => AMBIENT_SOUNDS.find((s) => s.id === id) || AMBIENT_SOUNDS[0];
