import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Alert, View, StatusBar } from 'react-native';
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
import ProofScreen from './src/screens/ProofScreen';
import PairScreen from './src/screens/PairScreen';
import TabBar from './src/TabBar';
import Celebration from './src/Celebration';
import { AnimContext, FadeUp } from './src/anim';
import { loadState, saveState } from './src/storage';
import { applySchedule, clearShown, openRingtonePicker, sendTest, setupNotifications, useLastNotificationResponse } from './src/notify';
import { connectHealth, healthMessage, healthStatus, openHealthApp, stepsToday } from './src/health';
import { fmtSteps } from './src/categories';
import { ErrorBoundary, installErrorCapture } from './src/errors';
import { addDays, atTime, dateKey, parseKey } from './src/dates';
import { MAX_PASSES, currentWeekStart, doneKey, nextWeekStart, previousWeekTasks, tasksOfWeek, todaysItems, undoMsLeft, weekEndKey } from './src/planner';
import { streaks, weekStrip } from './src/stats';
import { colors } from './src/theme';

installErrorCapture();

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
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
  const [health, setHealth] = useState({ state: 'unknown' });
  const [steps, setSteps] = useState(null);
  const stateRef = useRef(null);
  const finishRef = useRef(null);
  const loaded = useRef(false);
  const handledResponse = useRef(null);
  const response = useLastNotificationResponse();

  const checkNotifications = useCallback(async () => setNotif(await setupNotifications()), []);

  // Reads today's steps and finishes any step task whose goal is reached.
  const refreshSteps = useCallback(async () => {
    const st = stateRef.current;
    if (!st) return;
    const pending = todaysItems(st, new Date()).filter((i) => i.task.proof === 'steps' && (i.status === 'upcoming' || i.status === 'overdue'));
    if (pending.length === 0) return;
    const h = await healthStatus();
    setHealth(h);
    if (h.state !== 'ready') return;
    const n = await stepsToday();
    setSteps(n);
    if (n === null) return;
    for (const item of pending) {
      if (n >= item.task.steps && finishRef.current) finishRef.current(item, { proof: 'steps', steps: n });
    }
  }, []);

  useEffect(() => {
    (async () => {
      await checkNotifications();
      const s = await loadState();
      loaded.current = true;
      stateRef.current = s;
      setState(s);
      setHealth(await healthStatus());
    })();
  }, []);

  // As soon as the screen is ready, check step goals (so a goal reached while the app was closed is counted at once).
  const ready = !!state;
  useEffect(() => {
    if (ready) refreshSteps();
  }, [ready]);

  // The clock only ticks while you are on the main tabs. Pages like the new-task form are left alone
  // so typing is never interrupted by a redraw.
  useEffect(() => {
    if (screen) return undefined;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, [screen]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') { setNow(new Date()); checkNotifications(); clearShown(); refreshSteps(); }
    });
    return () => sub.remove();
  }, []);

  // While you are on the main tabs, step goals are checked every minute.
  useEffect(() => {
    if (screen) return undefined;
    const id = setInterval(() => refreshSteps(), 60000);
    return () => clearInterval(id);
  }, [screen]);

  // Save, and re-queue the reminders whenever the plan, completions, timers or settings change.
  useEffect(() => {
    if (!state || !loaded.current) return;
    stateRef.current = state;
    saveState(state);
    applySchedule(state);
  }, [state?.tasks, state?.done, state?.sessions, state?.settings]);

  const update = useCallback((fn) => setState((s) => fn(s)), []);
  const close = useCallback(() => setScreen(null), []);

  // Tapping a reminder opens that task (straight to scanning or the photo for those proofs).
  useEffect(() => {
    if (!state || !response) return;
    try {
      const id = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handledResponse.current === id) return;
      handledResponse.current = id;
      const data = response.notification.request.content.data || {};
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
  const sessionItem = items.find((i) => i.session && i.status !== 'done' && i.status !== 'skipped');
  const cw = currentWeekStart(now);
  const nw = nextWeekStart(now);
  const thisWeek = tasksOfWeek(state, cw);
  const nextWeek = tasksOfWeek(state, nw);
  const passesUsed = state.passes.week === cw ? state.passes.used : 0;
  const passesLeft = Math.max(0, MAX_PASSES - passesUsed);
  const paired = !!state.pairSecret;

  // ---------- actions ----------
  const finish = (item, extra) => {
    update((s) => {
      const k = doneKey(item.dateKey, item.task.id);
      if (s.done[k]) return s; // already finished (for example by a step check a moment ago)
      const sessions = { ...(s.sessions || {}) };
      delete sessions[k];
      return { ...s, sessions, done: { ...s.done, [k]: { status: 'done', at: new Date().toISOString(), ...extra } } };
    });
    clearShown();
    setCelebrate((n) => n + 1);
    close();
  };

  finishRef.current = finish;

  const skip = (item) => {
    update((s) => {
      const used = s.passes.week === cw ? s.passes.used : 0;
      return {
        ...s,
        passes: { week: cw, used: used + 1 },
        done: { ...s.done, [doneKey(item.dateKey, item.task.id)]: { status: 'skipped', at: new Date().toISOString() } },
      };
    });
    clearShown();
    close();
  };

  const startSession = (item) => {
    update((s) => ({ ...s, sessions: { ...(s.sessions || {}), [doneKey(item.dateKey, item.task.id)]: { startedAt: Date.now(), minutes: item.task.minutes } } }));
    close();
  };

  const cancelSession = (item) => {
    update((s) => {
      const sessions = { ...(s.sessions || {}) };
      delete sessions[doneKey(item.dateKey, item.task.id)];
      return { ...s, sessions };
    });
  };

  // Checks the step count right now. Reaching the goal finishes the task.
  const checkSteps = async (item) => {
    let h = await healthStatus();
    if (h.state === 'needsPermission') h = await connectHealth();
    setHealth(h);
    if (h.state !== 'ready') { Alert.alert('Health Connect', healthMessage(h)); return; }
    const n = await stepsToday();
    setSteps(n);
    if (n === null) { Alert.alert('Health Connect', 'Could not read your steps just now. Try again in a moment.'); return; }
    if (n >= item.task.steps) finish(item, { proof: 'steps', steps: n });
    else Alert.alert('Not there yet', `${fmtSteps(n)} of ${fmtSteps(item.task.steps)} steps so far. Keep going.`);
  };

  const prove = (item) => {
    if (item.task.proof === 'timer') return startSession(item);
    if (item.task.proof === 'steps') return checkSteps(item);
    return setScreen({ name: 'proof', item });
  };

  // First day a new task can remind: today if its time is still ahead, otherwise tomorrow.
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
    const copies = chosen.map((t, i) => ({
      ...t,
      id: `t${Date.now()}_${i}`,
      createdAt: Date.now(),
      weekStart,
      startDate: target === 'next' ? nw : firstDayFor(t.time),
    })).filter((t) => t.startDate <= weekEndKey(weekStart));
    update((s) => ({ ...s, tasks: [...s.tasks, ...copies] }));
    setTab(target === 'next' ? 'week' : 'today');
    close();
  };

  const carrySource = (target) => (target === 'next' && thisWeek.length > 0 ? thisWeek : previousWeekTasks(state, now));
  const openTask = (task) => setScreen({ name: 'task', taskId: task.id });
  const changeSettings = (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const runTest = async () => setTestMsg(await sendTest(settings));
  const connect = async () => { const h = await connectHealth(); setHealth(h); if (h.state === 'ready') refreshSteps(); else Alert.alert('Health Connect', healthMessage(h)); };

  // Every screen sits in this frame, so the celebration can appear over whichever one is showing.
  const frame = (content) => (
    <AnimContext.Provider value={animations}>
      <View style={{ flex: 1, backgroundColor: colors.ground }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.ground} />
        {content}
        {celebrate > 0 && animations ? <Celebration key={celebrate} onDone={() => setCelebrate(0)} /> : null}
      </View>
    </AnimContext.Provider>
  );

  // ---------- which screen ----------
  if (screen && screen.name === 'proof') {
    return frame(
      <ProofScreen
        task={screen.item.task}
        dateKey={screen.item.dateKey}
        secret={state.pairSecret}
        onDone={(extra) => finish(screen.item, extra)}
        onBack={close}
        onPair={() => setScreen({ name: 'pair', returnTo: screen })}
      />
    );
  }
  if (screen && screen.name === 'pair') {
    return frame(
      <PairScreen
        alreadyPaired={paired}
        onSave={(secret) => { update((s) => ({ ...s, pairSecret: secret })); setScreen(screen.returnTo || null); }}
        onBack={() => setScreen(screen.returnTo || null)}
      />
    );
  }
  if (sessionItem) {
    return frame(
      <TimerScreen
        key={sessionItem.task.id}
        item={sessionItem}
        session={sessionItem.session}
        onFinish={() => finish(sessionItem, { proof: 'timer', minutes: sessionItem.session.minutes })}
        onCancel={() => cancelSession(sessionItem)}
      />
    );
  }
  if (screen && screen.name === 'task') {
    const task = state.tasks.find((t) => t.id === screen.taskId);
    if (task) {
      return frame(<TaskDetailScreen task={task} state={state} now={nowCoarse} steps={steps} passesLeft={passesLeft} onBack={close} onStart={prove} onSkip={skip} onUndo={() => undoTask(task)} />);
    }
  }
  if (screen && screen.name === 'form') {
    return frame(<TaskFormScreen initialWeek={screen.week} paired={paired} health={health} onSave={saveTask} onBack={close} onPair={() => setScreen({ name: 'pair', returnTo: screen })} onConnectHealth={connect} />);
  }
  if (screen && screen.name === 'carry') {
    return frame(<CarryOverScreen tasks={carrySource(screen.target)} target={screen.target} onConfirm={(chosen) => carryOver(chosen, screen.target)} onBack={close} />);
  }
  if (screen && screen.name === 'settings') {
    return frame(
      <SettingsScreen
        paired={paired}
        notif={notif}
        testMsg={testMsg}
        settings={settings}
        passesLeft={passesLeft}
        health={health}
        steps={steps}
        onBack={close}
        onPair={() => setScreen({ name: 'pair', returnTo: screen })}
        onRecheck={checkNotifications}
        onTest={runTest}
        onChange={changeSettings}
        onPickRingtone={openRingtonePicker}
        onConnectHealth={connect}
        onOpenHealth={openHealthApp}
      />
    );
  }

  return frame(
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'today' ? (
          <TodayScreen
            items={items}
            strip={strip}
            streak={streak}
            now={now}
            steps={steps}
            notif={notif}
            needsPlan={thisWeek.length === 0}
            onOpenTask={openTask}
            onAction={prove}
            onAdd={() => setScreen({ name: 'form', week: 'this' })}
            onSettings={() => setScreen({ name: 'settings' })}
            onPlan={() => (previousWeekTasks(state, now).length > 0 ? setScreen({ name: 'carry', target: 'this' }) : setScreen({ name: 'form', week: 'this' }))}
          />
        ) : null}
        {tab === 'week' ? (
          <WeekScreen
            thisWeek={thisWeek}
            nextWeek={nextWeek}
            weekStart={cw}
            nextStart={nw}
            canCarry={previousWeekTasks(state, now).length > 0}
            onOpenTask={openTask}
            onAdd={(w) => setScreen({ name: 'form', week: w })}
            onCarry={(t) => setScreen({ name: 'carry', target: t })}
          />
        ) : null}
        {tab === 'history' ? <HistoryScreen state={state} now={nowCoarse} /> : null}
        {tab === 'insights' ? <InsightsScreen state={state} now={nowCoarse} /> : null}
      </View>
      <TabBar tab={tab} onChange={setTab} onAdd={() => setScreen({ name: 'form', week: 'this' })} />
    </View>
  );
}
