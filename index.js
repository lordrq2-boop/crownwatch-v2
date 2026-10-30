import { registerRootComponent } from 'expo';

import App from './App';

// The alarm engine needs a background handler registered before the app starts (ignored in Expo Go).
try {
  const lib = require('react-native-notify-kit');
  (lib.default || lib).onBackgroundEvent(async () => {});
} catch (e) {}

registerRootComponent(App);
