import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState, Alert, BackHandler, View, StatusBar, Share } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, PixelifySans_500Medium, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import TodayScreen from './src/screens/TodayScreen';
import WeekScreen from './src/screens/WeekScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import TaskFormScreen from './src/screens/TaskFormScreen';
import VoiceTaskScreen from './src/screens/VoiceTaskScreen';
import CarryOverScreen from './src/screens/CarryOverScreen';
import TimerScreen from './src/screens/TimerScreen';
import WalkScreen from './src/screens/WalkScreen';
import ProofScreen from './src/screens/ProofScreen';
import PairScreen from './src/screens/PairScreen';
import FocusScreen from './src/screens/FocusScreen';
import { completeFocusSession, distractFocus, makeFocusSession, migrateFocus, nextPomodoroType, pauseFocus, remainingSeconds, resumeFocus } from './src/focus';
import { addMissingWeeklyReviews } from './src/weeklyReview';
import { ambientSound as getAmbientSound } from './src/ambient';
import TabBar from './src/TabBar';
import Celebration from './src/Celebration';
import { AnimContext } from './src/anim';
import { loadState, saveState } from './src/storage';
import { applySchedule, clearShown, openRingtonePicker, sendTest, setupNotifications, useLastNotificationResponse } from './src/notify';
import { activityToday, activityBetween, activityWeek, connectHealth, healthMessage, healthStatus, importHealthHistory, openHealthApp } from './src/health';
import { ErrorBoundary, installErrorCapture } from './src/errors';
import { addDays, atTime, dateKey, parseKey } from './src/dates';
import { MAX_PASSES, currentWeekStart, doneKey, nextWeekStart, previousWeekTasks, tasksOfWeek, todaysItems, undoMsLeft, weekEndKey } from './src/planner';
import { streaks, weekStrip } from './src/stats';
import { colors } from './src/theme';
import { getAggregatedWeather, searchCities, testNimet, testOpenMeteo, testOpenMeteoModels, testVisualCrossing, testWeatherApi, weatherNeedsRefresh } from './src/weather';

installErrorCapture();

function resolveExpiredFocus(current, now = Date.now()) {
  const active = current?.focus?.active;
  if (!active || remainingSeconds(active, now) > 0) return current;
  const completed = completeFocusSession(active, now);
  const history = [...(current.focus.history || []), completed];
  const nextType = active.type === 'focus' ? nextPomodoroType(history, current.focus.settings) : null;
  return { ...current, focus: { ...current.focus, history, active: nextType ? makeFocusSession(nextType, current.focus.settings, active.taskId) : null } };
}

export default function App() {
  return <ErrorBoundary><SafeAreaProvider><Root /></SafeAreaProvider></ErrorBoundary>;
}

function Root() {
  const [fontsLoaded, fontError] = useFonts({ PixelifySans_500Medium, PixelifySans_700Bold });
  const [state, setState] = useState(null);
  const [tab, setTab] = useState('today');
  const [screen, setScreen] = useState(null);
  const [now, setNow] = useState(new Date());
  const [notif, setNotif] = useState({ ok: true, reason: '', exact: true });
  const [testMsg, setTestMsg] = useState('');
  const [celebrate, setCelebrate] = useState(0);
  const [health, setHealth] = useState({ state: 'unknown', permissions: {} });
  const [activity, setActivity] = useState({ steps: null, activeCalories: null, distanceMeters: null, weightKg: null });
  const [healthWeek, setHealthWeek] = useState({ steps: null, activeCalories: null });
  const [weather, setWeather] = useState({ city: null, data: null, error: null });
  const [weatherApiKey, setWeatherApiKey] = useState('');
  const [weatherProviderKeys, setWeatherProviderKeys] = useState({ weatherApi: '', nimet: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const ambientPlayer = useAudioPlayer(null);
  const loaded = useRef(false);
  const healthBusy = useRef(false);
  const handledResponse = useRef(null);
  const response = useLastNotificationResponse();

  const checkNotifications = useCallback(async () => setNotif(await setupNotifications()), []);

  const refreshHealth = useCallback(async () => {
    if (healthBusy.current) return { state: 'busy' };
    healthBusy.current = true;
    try {
      const h = await healthStatus();
      setHealth(h);
      if (h.state === 'ready') {
        const [todayData, weekData] = await Promise.all([activityToday(new Date(), h), activityWeek(new Date(), h)]);
        setActivity(todayData);
        setHealthWeek(weekData);
      } else {
        setActivity({ steps: null, activeCalories: null, distanceMeters: null, weightKg: null });
        setHealthWeek({ steps: null, activeCalories: null });
      }
      return h;
    } finally {
      healthBusy.current = false;
    }
  }, []);

  const refreshWeather = useCallback(async (force = false, cityOverride = null) => {
    const city = cityOverride || state?.settings?.weatherCity;
    if (!city) return { skipped: true };
    if (!force && !weatherNeedsRefresh(weather.data?.fetchedAt, new Date(), weather.data?.timezone || city.timezone)) return { skipped: true };
    try {
      const data = await getAggregatedWeather(city, weatherProviderKeys);
      const resolvedCity = { ...city, timezone: data.timezone || city.timezone };
      setWeather({ city: resolvedCity, data, error: null });
      setState((current) => current ? { ...current, settings: { ...current.settings, weatherCity: resolvedCity, weatherData: data } } : current);
      return { ok: true };
    } catch (error) {
      setWeather((current) => ({ ...current, city, error: error.message || 'Weather could not be refreshed.' }));
      return { ok: false, error };
    }
  }, [state?.settings?.weatherCity, weather.data?.fetchedAt, weatherProviderKeys]);

  const refreshAll = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setNow(new Date());
    setState((current) => current ? addMissingWeeklyReviews(current, new Date()) : current);
    try {
      await Promise.allSettled([refreshHealth(), refreshWeather(true), checkNotifications()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refreshHealth, refreshWeather, checkNotifications]);

  const useCurrentWeatherLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location permission was not granted. You can search for a city manually instead.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const roundedLat = Math.round(position.coords.latitude * 100) / 100;
      const roundedLon = Math.round(position.coords.longitude * 100) / 100;
      const addresses = await Location.reverseGeocodeAsync({ latitude: roundedLat, longitude: roundedLon });
      const address = addresses?.[0] || {};
      const cityName = address.city || address.district || address.subregion || address.region;
      if (!cityName) throw new Error('Could not identify a nearby city. Search for it manually instead.');
      const city = { name: cityName, admin: address.region || address.subregion || '', country: address.country || '', latitude: roundedLat, longitude: roundedLon, timezone: 'auto' };
      setState((current) => current ? { ...current, settings: { ...current.settings, weatherCity: city } } : current);
      setWeather((current) => ({ ...current, city, error: null }));
      await refreshWeather(true, city);
      return city;
    } catch (error) {
      Alert.alert('Weather location', error.message || 'Could not determine your city.');
      return null;
    }
  }, [refreshWeather]);

  const selectWeatherCity = useCallback(async (city) => {
    setState((current) => current ? { ...current, settings: { ...current.settings, weatherCity: city } } : current);
    setWeather((current) => ({ ...current, city, error: null }));
    await refreshWeather(true, city);
  }, [refreshWeather]);

  const ambientSettings = state?.focus?.settings || {};
  const ambientShouldPlay = ambientPlaying && (ambientSettings.ambientDuringBreaks !== false || !state?.focus?.active || state.focus.active.type === 'focus');
  const ambientLoaded = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!ambientShouldPlay || !state) {
      ambientPlayer.pause();
      try { ambientPlayer.setActiveForLockScreen(false); } catch (e) {}
      return undefined;
    }
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
        const sound = getAmbientSound(ambientSettings.ambientSound);
        if (ambientLoaded.current !== sound.id) {
          ambientPlayer.replace(sound.source);
          ambientLoaded.current = sound.id;
        }
        ambientPlayer.loop = true;
        if (!cancelled) {
          ambientPlayer.setActiveForLockScreen(true, { title: `${sound.label} ambience`, artist: 'CrownFlow', albumTitle: 'Focus sounds' });
          ambientPlayer.play();
        }
      } catch (e) {
        if (!cancelled) setAmbientPlaying(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ambientShouldPlay, ambientSettings.ambientSound]);

  useEffect(() => {
    ambientPlayer.volume = Math.max(0, Math.min(1, Number(ambientSettings.ambientVolume ?? 0.35)));
  }, [ambientSettings.ambientVolume]);

  useEffect(() => {
    (async () => {
      await checkNotifications();
      const saved = addMissingWeeklyReviews(await loadState(), new Date());
      try { const storedWeatherKey = await SecureStore.getItemAsync('crownflow.weatherApiKey'); const nimetKey = await SecureStore.getItemAsync('crownflow.nimetApiKey'); if (storedWeatherKey) setWeatherApiKey(storedWeatherKey); setWeatherProviderKeys({ weatherApi: storedWeatherKey || '', nimet: nimetKey || '' }); } catch (e) {}
      loaded.current = true;
      setState(saved);
      setWeather({ city: saved.settings?.weatherCity || null, data: saved.settings?.weatherData || null, error: null });
      await refreshHealth();
      if (saved.settings?.weatherCity) {
        try {
          if (weatherNeedsRefresh(saved.settings?.weatherData?.fetchedAt, new Date(), saved.settings?.weatherData?.timezone || saved.settings?.weatherCity?.timezone)) {
            const storedWeatherKey = await SecureStore.getItemAsync('crownflow.weatherApiKey').catch(() => '');
            const nimetKey = await SecureStore.getItemAsync('crownflow.nimetApiKey').catch(() => '');
            setWeatherProviderKeys({ weatherApi: storedWeatherKey || '', nimet: nimetKey || '' });
            const data = await getAggregatedWeather(saved.settings.weatherCity, { weatherApi: storedWeatherKey || '', nimet: nimetKey || '' });
            saved.settings.weatherCity = { ...saved.settings.weatherCity, timezone: data.timezone || saved.settings.weatherCity.timezone };
            setWeather({ city: saved.settings.weatherCity, data, error: null });
            saved.settings.weatherData = data;
            await saveState(saved);
          }
        } catch (error) { setWeather({ city: saved.settings.weatherCity, data: saved.settings?.weatherData || null, error: error.message || 'Weather could not be refreshed.' }); }
      }
    })();
  }, []);

  useEffect(() => {
    if (!state || !loaded.current) return;
    setState((current) => current ? addMissingWeeklyReviews(current, new Date()) : current);
  }, [state?.tasks, state?.done, state?.focus?.history]);

  useEffect(() => {
    if (!state || health.state !== 'ready') return undefined;
    const reviewKeys = Object.keys(state.focus?.weeklyReviews || {}).filter((key) => !state.focus.weeklyReviews[key].health);
    if (!reviewKeys.length) return undefined;
    let cancelled = false;
    Promise.all(reviewKeys.map(async (key) => {
      const start = parseKey(key);
      return [key, await activityBetween(start, addDays(start, 7), health)];
    })).then((results) => {
      if (cancelled) return;
      setState((current) => {
        if (!current) return current;
        const focus = migrateFocus(current.focus);
        const weeklyReviews = { ...focus.weeklyReviews };
        for (const [key, value] of results) if (weeklyReviews[key] && !weeklyReviews[key].health) weeklyReviews[key] = { ...weeklyReviews[key], health: value };
        return { ...current, focus: { ...focus, weeklyReviews } };
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [state?.focus?.weeklyReviews, health.state]);

  // Save every state change, including pairing and Walk Session state. Alarm
  // scheduling is kept separate so health refreshes don't rebuild notifications.
  useEffect(() => {
    if (!state || !loaded.current) return;
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!state || !loaded.current) return;
    applySchedule(state);
  }, [state?.tasks, state?.done, state?.sessions, state?.settings?.nagMinutes, state?.settings?.sound, state?.settings?.ringSeconds, state?.settings?.reliable, state?.settings?.weatherChangeAlerts, state?.settings?.weatherData, state?.focus?.settings?.weeklyReviewNotification, state?.focus?.settings?.weeklyReviewHour, state?.focus?.active?.id, state?.focus?.active?.runningSince, state?.focus?.active?.elapsedSeconds]);

  // The main-screen clock is deliberately paused on forms to keep text entry smooth.
  useEffect(() => {
    if (screen) return undefined;
    setNow(new Date());
    const id = setInterval(() => { if (AppState.currentState === 'active') setNow(new Date()); }, 60000);
    return () => clearInterval(id);
  }, [screen]);

  // Android Back returns through the current screen, then to Home from other tabs.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen) {
        setScreen((current) => current?.returnTo || null);
        return true;
      }
      if (tab !== 'today') {
        setTab('today');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen, tab]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') {
        setNow(new Date());
        checkNotifications();
        clearShown();
        refreshHealth();
        refreshWeather(false);
        setState((current) => {
          if (!current) return current;
          const reviewed = addMissingWeeklyReviews(current, new Date());
          const focusResolved = resolveExpiredFocus(reviewed, Date.now());
          if (focusResolved.walkSession?.expiresAt && Date.now() >= focusResolved.walkSession.expiresAt) return { ...focusResolved, walkSession: null };
          return focusResolved;
        });
      }
    });
    return () => sub.remove();
  }, [checkNotifications, refreshHealth, refreshWeather]);

  // A Walk Session expires after 30 minutes even if CrownFlow was backgrounded.
  useEffect(() => {
    if (!state?.walkSession?.expiresAt) return undefined;
    const checkExpiry = () => {
      if (AppState.currentState !== 'active') return;
      if (Date.now() >= state.walkSession.expiresAt) {
        setState((current) => current ? { ...current, walkSession: null } : current);
        setScreen((current) => current?.name === 'walk' ? null : current);
        Alert.alert('Walk session ended', 'Your 30-minute Walk Session has ended. Your daily activity totals remain in Health Connect.');
      }
    };
    checkExpiry();
    const id = setTimeout(checkExpiry, Math.max(250, state.walkSession.expiresAt - Date.now() + 100));
    return () => clearTimeout(id);
  }, [state?.walkSession?.expiresAt]);

  // A single timeout handles completion; timestamp checks on foreground recover from Android suspension.
  useEffect(() => {
    const active = state?.focus?.active;
    if (!active) return undefined;
    const finishIfExpired = () => setState((current) => resolveExpiredFocus(current, Date.now()));
    const delay = Math.max(250, remainingSeconds(active, Date.now()) * 1000 + 150);
    const id = setTimeout(finishIfExpired, delay);
    return () => clearTimeout(id);
  }, [state?.focus?.active?.id, state?.focus?.active?.runningSince, state?.focus?.active?.elapsedSeconds]);

  // Opening Insights triggers a fresh read, in addition to the regular refresh.
  useEffect(() => { if (tab === 'insights') refreshHealth(); }, [tab, refreshHealth]);

  useEffect(() => {
    if (screen?.name !== 'timer' || !state) return;
    const key = doneKey(screen.dateKey, screen.taskId);
    if (!state.sessions?.[key]) setScreen(null);
  }, [screen, state?.sessions]);

  // A notification opens the matching task, as before.
  useEffect(() => {
    if (!state || !response) return;
    try {
      const id = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handledResponse.current === id) return;
      handledResponse.current = id;
      const data = response.notification.request.content.data || {};
      if (data.type === 'focusComplete') { setTab('focus'); return; }
      if (data.type === 'weeklyReview') { setTab('insights'); return; }
      const item = todaysItems(state, new Date()).find((i) => i.task.id === data.taskId);
      if (!item) return;
      const pending = item.status === 'upcoming' || item.status === 'overdue';
      if (pending && (item.task.proof === 'qr' || item.task.proof === 'photo')) setScreen({ name: 'proof', item });
      else setScreen({ name: 'task', taskId: item.task.id });
    } catch (e) {}
  }, [response, state]);

  const todayKey = dateKey(now);
  const minuteStamp = Math.floor(now.getTime() / 60000);
  const nowCoarse = useMemo(() => new Date(minuteStamp * 60000), [minuteStamp]);
  const streak = useMemo(() => (state ? streaks(state, nowCoarse) : { current: 0, best: 0 }), [state?.tasks, state?.done, todayKey]);
  const strip = useMemo(() => (state ? weekStrip(state, nowCoarse) : []), [state?.tasks, state?.done, todayKey, minuteStamp]);

  if (!state || !(fontsLoaded || fontError)) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;

  const settings = state.settings;
  const animations = settings.animations !== false && settings.reduceMotion !== true;
  const items = todaysItems(state, now);
  const activeSessionKey = Object.keys(state.sessions || {})[0];
  const activeSessionSplit = activeSessionKey ? activeSessionKey.indexOf('|') : -1;
  const activeSessionDate = activeSessionSplit >= 0 ? activeSessionKey.slice(0, activeSessionSplit) : null;
  const activeSessionTaskId = activeSessionSplit >= 0 ? activeSessionKey.slice(activeSessionSplit + 1) : null;
  const activeSessionTask = activeSessionTaskId ? state.tasks.find((task) => task.id === activeSessionTaskId) : null;
  const activeTimerItem = activeSessionTask ? { task: activeSessionTask, dateKey: activeSessionDate, session: state.sessions[activeSessionKey] } : null;
  const cw = currentWeekStart(now);
  const nw = nextWeekStart(now);
  const thisWeek = tasksOfWeek(state, cw);
  const nextWeek = tasksOfWeek(state, nw);
  const passesUsed = state.passes.week === cw ? state.passes.used : 0;
  const passesLeft = Math.max(0, MAX_PASSES - passesUsed);
  const paired = !!state.pairSecret;

  const update = (fn) => setState((s) => fn(s));
  const close = () => setScreen(null);

  const finish = (item, extra) => {
    update((s) => {
      const k = doneKey(item.dateKey, item.task.id);
      if (s.done[k]) return s;
      const sessions = { ...(s.sessions || {}) };
      delete sessions[k];
      return { ...s, sessions, done: { ...s.done, [k]: { status: 'done', at: new Date().toISOString(), ...extra } } };
    });
    clearShown();
    setCelebrate((n) => n + 1);
    close();
  };

  const skip = (item) => {
    update((s) => {
      const used = s.passes.week === cw ? s.passes.used : 0;
      return { ...s, passes: { week: cw, used: used + 1 }, done: { ...s.done, [doneKey(item.dateKey, item.task.id)]: { status: 'skipped', at: new Date().toISOString() } } };
    });
    clearShown();
    close();
  };

  const startSession = (item) => {
    const key = doneKey(item.dateKey, item.task.id);
    const existingKey = Object.keys(state.sessions || {})[0];
    if (existingKey === key) {
      setScreen({ name: 'timer', taskId: item.task.id, dateKey: item.dateKey, returnTo: screen?.name === 'task' ? screen : null });
      return;
    }
    if (existingKey && existingKey !== key) {
      const split = existingKey.indexOf('|');
      const existingDate = existingKey.slice(0, split);
      const existingTaskId = existingKey.slice(split + 1);
      const existingTask = state.tasks.find((task) => task.id === existingTaskId);
      if (existingTask) {
        Alert.alert('Timer already running', `"${existingTask.title}" already has an active timer. Resume or cancel it before starting another.`);
        setScreen({ name: 'timer', taskId: existingTaskId, dateKey: existingDate });
        return;
      }
    }
    const session = { startedAt: Date.now(), minutes: item.task.minutes };
    update((s) => ({ ...s, sessions: { ...(s.sessions || {}), [key]: session } }));
    setScreen({ name: 'timer', taskId: item.task.id, dateKey: item.dateKey, returnTo: screen?.name === 'task' ? screen : null });
  };

  const cancelSession = (item) => {
    update((s) => {
      const sessions = { ...(s.sessions || {}) };
      delete sessions[doneKey(item.dateKey, item.task.id)];
      return { ...s, sessions };
    });
    close();
  };

  const prove = (item) => {
    if (item.task.proof === 'timer') return startSession(item);
    return setScreen({ name: 'proof', item, returnTo: { name: 'task', taskId: item.task.id } });
  };

  const firstDayFor = (time) => {
    const t = new Date();
    return dateKey(addDays(parseKey(dateKey(t)), atTime(dateKey(t), time) > t ? 0 : 1));
  };

  const saveTask = (data, weekChoice) => {
    const weekStart = weekChoice === 'next' ? nw : cw;
    const startDate = weekChoice === 'next' ? nw : firstDayFor(data.time);
    if (startDate > weekEndKey(weekStart)) {
      Alert.alert('Too late for this week', 'Today\'s time has passed and the week is nearly over. Add it for next week instead.');
      return;
    }
    const task = { id: `t${Date.now()}`, createdAt: Date.now(), weekStart, startDate, ...data };
    update((s) => ({ ...s, tasks: [...s.tasks, task] }));
    setTab(weekChoice === 'next' ? 'week' : 'today');
    close();
  };

  const undoTask = (task) => {
    update((s) => (undoMsLeft(task, s, new Date()) > 0 ? { ...s, tasks: s.tasks.filter((t) => t.id !== task.id) } : s));
    close();
  };

  const carryOver = (chosen, target) => {
    const weekStart = target === 'next' ? nw : cw;
    const copies = chosen.map((t, i) => ({ ...t, id: `t${Date.now()}_${i}`, createdAt: Date.now(), weekStart, startDate: target === 'next' ? nw : firstDayFor(t.time) })).filter((t) => t.startDate <= weekEndKey(weekStart));
    update((s) => ({ ...s, tasks: [...s.tasks, ...copies] }));
    setTab(target === 'next' ? 'week' : 'today');
    close();
  };

  const carrySource = (target) => (target === 'next' && thisWeek.length > 0 ? thisWeek : previousWeekTasks(state, now));
  const openTask = (task) => setScreen({ name: 'task', taskId: task.id });
  const changeSettings = (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const startFocus = (taskId = null, type = 'focus') => {
    if (state.focus?.active) { setTab('focus'); return; }
    update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), active: makeFocusSession(type, s.focus?.settings || migrateFocus(null).settings, taskId) } }));
    setTab('focus');
  };
  const updateActiveFocus = (fn) => update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), active: fn(s.focus?.active) } }));
  const pauseActiveFocus = () => updateActiveFocus((a) => pauseFocus(a));
  const resumeActiveFocus = () => updateActiveFocus((a) => resumeFocus(a));
  const distractActiveFocus = () => updateActiveFocus((a) => distractFocus(a));
  const backToFocus = () => updateActiveFocus((a) => resumeFocus(a));
  const endActiveFocus = () => update((s) => {
    const f = migrateFocus(s.focus);
    if (!f.active) return s;
    const ended = completeFocusSession(f.active);
    return { ...s, focus: { ...f, active: null, history: [...f.history, ended] } };
  });
  const runTest = async () => setTestMsg(await sendTest(settings));
  const connect = async () => {
    const h = await connectHealth();
    setHealth(h);
    if (h.state === 'ready') await refreshHealth();
    else Alert.alert('Health Connect', healthMessage(h));
  };

  const startOrResumeWalk = async () => {
    if (state.walkSession && Date.now() < state.walkSession.expiresAt) {
      setScreen({ name: 'walk' });
      return;
    }
    let h = await healthStatus();
    if (h.state === 'needsPermission') h = await connectHealth();
    setHealth(h);
    if (h.state !== 'ready') { Alert.alert('Health Connect', healthMessage(h)); return; }
    const currentActivity = await activityToday(new Date(), h);
    setActivity(currentActivity);
    const startedAt = Date.now();
    const walkSession = { startedAt, expiresAt: startedAt + 30 * 60 * 1000 };
    update((s) => ({ ...s, walkSession }));
    setScreen({ name: 'walk' });
  };

  const finishWalk = () => {
    update((s) => ({ ...s, walkSession: null }));
    close();
    refreshHealth();
  };

  const importHealthData = async (onProgress = () => {}) => {
    const h = await healthStatus(); setHealth(h);
    if (h.state !== 'ready') throw new Error(healthMessage(h) || 'Connect Health Connect first.');
    const imported = await importHealthHistory(onProgress, h, new Date());
    update((s) => ({ ...s, healthHistory: { ...(s.healthHistory || {}), ...imported } }));
    await refreshHealth();
    return Object.keys(imported).length;
  };

  const clearHistory = () => {
    update((s) => ({ ...s, done: {}, healthHistory: {}, historyClearedBefore: dateKey(new Date()), focus: { ...migrateFocus(s.focus), history: [], weeklyReviews: {} } }));
  };

  const resetTestData = () => {
    update((s) => ({ ...s, tasks: [], done: {}, sessions: {}, walkSession: null, passes: { week: null, used: 0 } }));
    close();
    setTab('today');
  };

  const frame = (content) => (
    <AnimContext.Provider value={animations}>
      <View style={{ flex: 1, backgroundColor: colors.ground }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.ground} />
        {content}
        {celebrate > 0 && animations ? <Celebration key={celebrate} onDone={() => setCelebrate(0)} /> : null}
      </View>
    </AnimContext.Provider>
  );

  if (screen?.name === 'proof') {
    return frame(<ProofScreen task={screen.item.task} dateKey={screen.item.dateKey} secret={state.pairSecret} onDone={(extra) => finish(screen.item, extra)} onBack={() => setScreen(screen.returnTo || null)} onPair={() => setScreen({ name: 'pair', returnTo: screen })} />);
  }
  if (screen?.name === 'pair') {
    return frame(<PairScreen alreadyPaired={paired} onSave={(secret) => { update((s) => ({ ...s, pairSecret: secret })); setScreen(screen.returnTo || null); }} onBack={() => setScreen(screen.returnTo || null)} />);
  }
  if (screen?.name === 'walk' && state.walkSession) {
    return frame(<WalkScreen session={state.walkSession} onBack={close} onFinish={finishWalk} />);
  }
  if (screen?.name === 'timer') {
    const timerTask = state.tasks.find((task) => task.id === screen.taskId);
    const timerSession = state.sessions?.[doneKey(screen.dateKey, screen.taskId)];
    const timerItem = timerTask && timerSession ? { task: timerTask, dateKey: screen.dateKey, session: timerSession } : null;
    if (timerItem) return frame(<TimerScreen item={timerItem} session={timerItem.session} onBack={() => setScreen(screen.returnTo || null)} onFinish={() => finish(timerItem, { proof: 'timer', minutes: timerItem.session.minutes })} onCancel={() => cancelSession(timerItem)} />);
  }
  if (screen?.name === 'task') {
    const task = state.tasks.find((t) => t.id === screen.taskId);
    if (task) return frame(<TaskDetailScreen task={task} state={state} now={nowCoarse} passesLeft={passesLeft} onBack={close} onStart={prove} onSkip={skip} onUndo={() => undoTask(task)} />);
  }
  if (screen?.name === 'form') {
    return frame(<TaskFormScreen initialWeek={screen.week} paired={paired} onSave={saveTask} onBack={close} onVoice={() => setScreen({ name: 'voice', week: screen.week })} onPair={() => setScreen({ name: 'pair', returnTo: screen })} />);
  }
  if (screen?.name === 'voice') {
    return frame(<VoiceTaskScreen initialWeek={screen.week} settings={state.settings} onSave={saveTask} onBack={close} />);
  }
  if (screen?.name === 'carry') {
    return frame(<CarryOverScreen tasks={carrySource(screen.target)} target={screen.target} onConfirm={(chosen) => carryOver(chosen, screen.target)} onBack={close} />);
  }
  const exportData = async (data) => {
    try {
      await Share.share({ title: 'CrownFlow backup', message: JSON.stringify({ app: 'CrownFlow', version: '0.9.4', exportedAt: new Date().toISOString(), data: { ...data, pairSecret: null } }, null, 2) });
    } catch (error) { Alert.alert('Backup', 'Could not open the share sheet.'); }
  };

  if (screen?.name === 'history') {
    return frame(<HistoryScreen state={state} now={nowCoarse} focus={state.focus} onBack={() => { setScreen(null); setTab('insights'); }} />);
  }

  if (screen?.name === 'settings') {
    return frame(<SettingsScreen paired={paired} notif={notif} testMsg={testMsg} settings={settings} health={health} stepGoal={settings.stepGoal || 3000} onBack={close} onPair={() => setScreen({ name: 'pair', returnTo: screen })} onRecheck={checkNotifications} onTest={runTest} onChange={changeSettings} onPickRingtone={openRingtonePicker} onConnectHealth={connect} onRefreshHealth={refreshHealth} onOpenHealth={openHealthApp} onResetTestData={resetTestData} onClearHistory={clearHistory} onImportHealthData={importHealthData} focusSettings={state.focus?.settings} onFocusChange={(patch) => update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), settings: { ...migrateFocus(s.focus).settings, ...patch } } }))} weather={weather} onWeatherUseLocation={useCurrentWeatherLocation} onWeatherSearch={searchCities} onWeatherSelect={selectWeatherCity} weatherApiKey={weatherApiKey} weatherProviderKeys={weatherProviderKeys} onSaveWeatherProviderKey={async (provider, key) => { const clean = String(key || '').trim(); const storageKey = provider === 'weatherApi' ? 'crownflow.weatherApiKey' : 'crownflow.nimetApiKey'; if (clean) await SecureStore.setItemAsync(storageKey, clean); else await SecureStore.deleteItemAsync(storageKey); const next = { ...weatherProviderKeys, [provider]: clean }; setWeatherProviderKeys(next); if (provider === 'weatherApi') setWeatherApiKey(clean); return true; }} onTestOpenMeteo={async () => { if (!state?.settings?.weatherCity) throw new Error('Choose a weather city first.'); await testOpenMeteo(state.settings.weatherCity); return true; }} onTestWeatherModels={async () => { if (!state?.settings?.weatherCity) throw new Error('Choose a weather city first.'); return testOpenMeteoModels(state.settings.weatherCity); }} onTestWeatherApi={async (key) => { if (!state?.settings?.weatherCity) throw new Error('Choose a weather city first.'); return testWeatherApi(state.settings.weatherCity, key); }} onTestVisualCrossing={async () => { if (!state?.settings?.weatherCity) throw new Error('Choose a weather city first.'); await testVisualCrossing(state.settings.weatherCity); return true; }} onTestNimet={async (key) => { if (!state?.settings?.weatherCity) throw new Error('Choose a weather city first.'); return testNimet(state.settings.weatherCity, key); }} onExport={() => exportData(state)} />);
  }

  return frame(
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'today' ? <TodayScreen items={items} strip={strip} streak={streak} now={now} activity={activity} stepGoal={settings.stepGoal || 3000} health={health} walkSession={state.walkSession} notif={notif} needsPlan={thisWeek.length === 0} activeTimerItem={activeTimerItem} onOpenTask={openTask} onAction={prove} onAdd={() => setScreen({ name: 'form', week: 'this' })} onSettings={() => setScreen({ name: 'settings' })} onVoice={() => setScreen({ name: 'voice', week: 'this' })} onPlan={() => (previousWeekTasks(state, now).length > 0 ? setScreen({ name: 'carry', target: 'this' }) : setScreen({ name: 'form', week: 'this' }))} onConnectHealth={connect} onStartWalk={startOrResumeWalk} onResumeTimer={() => activeTimerItem && setScreen({ name: 'timer', taskId: activeTimerItem.task.id, dateKey: activeTimerItem.dateKey })} focus={state.focus} onFocus={() => setTab('focus')} weather={weather} refreshing={refreshing} onRefresh={refreshAll} homeWidgets={settings.homeWidgets || {}} /> : null}
        {tab === 'focus' ? <FocusScreen focus={migrateFocus(state.focus)} tasks={state.tasks} now={now} onStart={startFocus} onPause={pauseActiveFocus} onResume={resumeActiveFocus} onFinish={endActiveFocus} onDistract={distractActiveFocus} onBackToFocus={backToFocus} onStartBreak={(type) => startFocus(null, type)} onSettings={() => setScreen({ name: 'settings' })} ambientPlaying={ambientPlaying} ambientSound={state.focus?.settings?.ambientSound || 'rain'} ambientVolume={state.focus?.settings?.ambientVolume ?? 0.35} onAmbientToggle={() => setAmbientPlaying((v) => !v)} onAmbientSound={(v) => update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), settings: { ...migrateFocus(s.focus).settings, ambientSound: v } } }))} onAmbientVolume={(v) => update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), settings: { ...migrateFocus(s.focus).settings, ambientVolume: v } } }))} /> : null}
        {tab === 'week' ? <WeekScreen thisWeek={thisWeek} nextWeek={nextWeek} weekStart={cw} nextStart={nw} canCarry={previousWeekTasks(state, now).length > 0} onOpenTask={openTask} onAdd={(w) => setScreen({ name: 'form', week: w })} onCarry={(t) => setScreen({ name: 'carry', target: t })} /> : null}
        
        {tab === 'insights' ? <InsightsScreen state={state} now={nowCoarse} healthWeek={healthWeek} onOpenHistory={() => setScreen({ name: 'history' })} /> : null}
      </View>
      <TabBar tab={tab} onChange={setTab} onAdd={() => setScreen({ name: 'form', week: 'this' })} />
    </View>
  );
}
