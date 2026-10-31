import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState, Alert, BackHandler, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, PixelifySans_500Medium, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import TodayScreen from './src/screens/TodayScreen';
import WeekScreen from './src/screens/WeekScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import TaskFormScreen from './src/screens/TaskFormScreen';
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
import { activityToday, activityBetween, activityWeek, connectHealth, healthMessage, healthStatus, openHealthApp } from './src/health';
import { ErrorBoundary, installErrorCapture } from './src/errors';
import { addDays, atTime, dateKey, parseKey } from './src/dates';
import { MAX_PASSES, currentWeekStart, doneKey, nextWeekStart, previousWeekTasks, tasksOfWeek, todaysItems, undoMsLeft, weekEndKey } from './src/planner';
import { streaks, weekStrip } from './src/stats';
import { colors } from './src/theme';

installErrorCapture();

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
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const ambientPlayer = useAudioPlayer(null);
  const loaded = useRef(false);
  const healthBusy = useRef(false);
  const handledResponse = useRef(null);
  const response = useLastNotificationResponse();

  const checkNotifications = useCallback(async () => setNotif(await setupNotifications()), []);

  const refreshHealth = useCallback(async () => {
    if (healthBusy.current) return;
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
    } finally {
      healthBusy.current = false;
    }
  }, []);

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
      loaded.current = true;
      setState(saved);
      await refreshHealth();
    })();
  }, []);

  useEffect(() => {
    if (!state || !loaded.current) return;
    setState((current) => current ? addMissingWeeklyReviews(current, new Date()) : current);
  }, [state?.tasks, state?.done, state?.focus?.history]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((current) => current && loaded.current ? addMissingWeeklyReviews(current, new Date()) : current);
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

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
  }, [state?.tasks, state?.done, state?.sessions, state?.settings?.nagMinutes, state?.settings?.sound, state?.settings?.ringSeconds, state?.settings?.reliable, state?.focus?.settings?.weeklyReviewNotification, state?.focus?.settings?.weeklyReviewHour, state?.focus?.active?.id, state?.focus?.active?.runningSince, state?.focus?.active?.elapsedSeconds]);

  // The main-screen clock is deliberately paused on forms to keep text entry smooth.
  useEffect(() => {
    if (screen) return undefined;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
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
      }
    });
    return () => sub.remove();
  }, [checkNotifications, refreshHealth]);

  // Refresh Health Connect while the app is foregrounded. Health Connect's
  // upstream sources may themselves publish with a delay; this is a poll, not a guarantee.
  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState === 'active') refreshHealth();
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshHealth]);

  // A Walk Session expires after 30 minutes even if CrownFlow was backgrounded.
  useEffect(() => {
    if (!state?.walkSession?.expiresAt) return undefined;
    const checkExpiry = () => {
      if (Date.now() >= state.walkSession.expiresAt) {
        setState((current) => current ? { ...current, walkSession: null } : current);
        setScreen((current) => current?.name === 'walk' ? null : current);
        Alert.alert('Walk session ended', 'Your 30-minute Walk Session has ended. Your daily activity totals remain in Health Connect.');
      }
    };
    checkExpiry();
    const id = setInterval(checkExpiry, 1000);
    return () => clearInterval(id);
  }, [state?.walkSession?.expiresAt]);

  // Pomodoro completion is timestamp-based; this check only updates the UI/state.
  // Rechecking on foreground also catches a session that expired while Android suspended the app.
  useEffect(() => {
    if (!state?.focus?.active) return undefined;
    const checkFocusExpiry = () => {
      setState((current) => {
        const active = current?.focus?.active;
        if (!active || remainingSeconds(active, Date.now()) > 0) return current;
        const completed = completeFocusSession(active, Date.now());
        const history = [...(current.focus.history || []), completed];
        const nextType = active.type === 'focus' ? nextPomodoroType(history, current.focus.settings) : null;
        return { ...current, focus: { ...current.focus, history, active: nextType ? makeFocusSession(nextType, current.focus.settings, active.taskId) : null } };
      });
    };
    checkFocusExpiry();
    const id = setInterval(checkFocusExpiry, 1000);
    return () => clearInterval(id);
  }, [state?.focus?.active?.id]);

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
  const animations = settings.animations !== false;
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
    return frame(<TaskFormScreen initialWeek={screen.week} paired={paired} onSave={saveTask} onBack={close} onPair={() => setScreen({ name: 'pair', returnTo: screen })} />);
  }
  if (screen?.name === 'carry') {
    return frame(<CarryOverScreen tasks={carrySource(screen.target)} target={screen.target} onConfirm={(chosen) => carryOver(chosen, screen.target)} onBack={close} />);
  }
  if (screen?.name === 'settings') {
    return frame(<SettingsScreen paired={paired} notif={notif} testMsg={testMsg} settings={settings} health={health} stepGoal={settings.stepGoal || 3000} onBack={close} onPair={() => setScreen({ name: 'pair', returnTo: screen })} onRecheck={checkNotifications} onTest={runTest} onChange={changeSettings} onPickRingtone={openRingtonePicker} onConnectHealth={connect} onRefreshHealth={refreshHealth} onOpenHealth={openHealthApp} onResetTestData={resetTestData} focusSettings={state.focus?.settings} onFocusChange={(patch) => update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), settings: { ...migrateFocus(s.focus).settings, ...patch } } }))} />);
  }

  return frame(
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'today' ? <TodayScreen items={items} strip={strip} streak={streak} now={now} activity={activity} stepGoal={settings.stepGoal || 3000} health={health} walkSession={state.walkSession} notif={notif} needsPlan={thisWeek.length === 0} activeTimerItem={activeTimerItem} onOpenTask={openTask} onAction={prove} onAdd={() => setScreen({ name: 'form', week: 'this' })} onSettings={() => setScreen({ name: 'settings' })} onPlan={() => (previousWeekTasks(state, now).length > 0 ? setScreen({ name: 'carry', target: 'this' }) : setScreen({ name: 'form', week: 'this' }))} onConnectHealth={connect} onStartWalk={startOrResumeWalk} onResumeTimer={() => activeTimerItem && setScreen({ name: 'timer', taskId: activeTimerItem.task.id, dateKey: activeTimerItem.dateKey })} focus={state.focus} onFocus={() => setTab('focus')} /> : null}
        {tab === 'focus' ? <FocusScreen focus={migrateFocus(state.focus)} tasks={state.tasks} now={now} onStart={startFocus} onPause={pauseActiveFocus} onResume={resumeActiveFocus} onFinish={endActiveFocus} onDistract={distractActiveFocus} onBackToFocus={backToFocus} onStartBreak={(type) => startFocus(null, type)} onSettings={() => setScreen({ name: 'settings' })} ambientPlaying={ambientPlaying} ambientSound={state.focus?.settings?.ambientSound || 'rain'} ambientVolume={state.focus?.settings?.ambientVolume ?? 0.35} onAmbientToggle={() => setAmbientPlaying((v) => !v)} onAmbientSound={(v) => update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), settings: { ...migrateFocus(s.focus).settings, ambientSound: v } } }))} onAmbientVolume={(v) => update((s) => ({ ...s, focus: { ...migrateFocus(s.focus), settings: { ...migrateFocus(s.focus).settings, ambientVolume: v } } }))} /> : null}
        {tab === 'week' ? <WeekScreen thisWeek={thisWeek} nextWeek={nextWeek} weekStart={cw} nextStart={nw} canCarry={previousWeekTasks(state, now).length > 0} onOpenTask={openTask} onAdd={(w) => setScreen({ name: 'form', week: w })} onCarry={(t) => setScreen({ name: 'carry', target: t })} /> : null}
        {tab === 'history' ? <HistoryScreen state={state} now={nowCoarse} focus={state.focus} /> : null}
        {tab === 'insights' ? <InsightsScreen state={state} now={nowCoarse} healthWeek={healthWeek} /> : null}
      </View>
      <TabBar tab={tab} onChange={setTab} onAdd={() => setScreen({ name: 'form', week: 'this' })} />
    </View>
  );
}
