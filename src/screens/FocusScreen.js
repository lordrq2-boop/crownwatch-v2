import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Btn, Card, Icon, Pill, ProgressRing, SectionHeader, useInsets } from '../ui';
import { FadeUp } from '../anim';
import { colors, radius, type } from '../theme';
import { elapsedSeconds, formatClock, remainingSeconds } from '../focus';
import { AMBIENT_SOUNDS } from '../ambient';

const MODE = { focus: 'Focus', shortBreak: 'Short break', longBreak: 'Long break' };

export default function FocusScreen({ focus, tasks, now, onStart, onPause, onResume, onFinish, onDistract, onBackToFocus, onStartBreak, onSettings, ambientPlaying, ambientSound, ambientVolume, onAmbientToggle, onAmbientSound, onAmbientVolume }) {
  const insets = useInsets();
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const active = focus.active;
  const remaining = active ? remainingSeconds(active, clock) : 0;
  const elapsed = active ? elapsedSeconds(active, clock) : 0;
  const progress = active?.plannedSeconds ? elapsed / active.plannedSeconds : 0;
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todaySeconds = (focus.history || []).filter((s) => s.type === 'focus' && s.startedAt >= todayStart.getTime()).reduce((n, s) => n + (s.actualFocusSeconds || 0), 0) + (active?.type === 'focus' ? elapsed : 0);
  const goal = Math.max(1, focus.settings.dailyGoalMinutes || 120) * 60;
  const taskTitle = active?.taskId ? tasks.find((t) => t.id === active.taskId)?.title : null;
  const recent = useMemo(() => [...(focus.history || [])].slice(-5).reverse(), [focus.history]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 34 }} showsVerticalScrollIndicator={false}>
      <FadeUp>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={type.display}>Focus</Text>
            <Text style={type.small}>One session at a time. Make it count.</Text>
          </View>
          <Pressable onPress={onSettings} style={styles.settings}><Icon name="settings-outline" size={21} color={colors.text} /></Pressable>
        </View>
      </FadeUp>

      <FadeUp delay={70}>
        <Card style={styles.timerCard}>
          <Pill label={active ? MODE[active.type] : 'Pomodoro'} tone="gold" />
          <View style={styles.ringWrap}>
            <ProgressRing size={238} stroke={12} progress={progress}>
              <Text style={styles.clock}>{active ? formatClock(remaining) : formatClock((focus.settings.focusMinutes || 25) * 60)}</Text>
              <Text style={styles.clockCaption}>{active?.distracted ? 'DISTRACTED' : active?.paused ? 'PAUSED' : active ? 'REMAINING' : 'READY WHEN YOU ARE'}</Text>
            </ProgressRing>
          </View>
          {taskTitle ? <Text style={styles.taskLabel}>Working on: {taskTitle}</Text> : <Text style={styles.taskLabel}>No task attached · standalone focus</Text>}
          {active ? (
            <>
              <View style={styles.actions}>
                {active.runningSince ? <Btn label="Pause" icon="pause" kind="secondary" onPress={onPause} style={{ flex: 1 }} /> : <Btn label={active.distracted ? 'Back to focus' : 'Resume'} icon="play" onPress={active.distracted ? onBackToFocus : onResume} style={{ flex: 1 }} />}
                <Btn label={active.type === 'focus' ? 'End' : 'Skip break'} icon={active.type === 'focus' ? 'stop' : 'play-skip-forward'} kind="quiet" onPress={onFinish} style={{ flex: 1 }} />
              </View>
              {active.type === 'focus' ? <Btn label="I got distracted" icon="alert-circle-outline" kind="quiet" onPress={onDistract} disabled={active.distracted || !active.runningSince} style={{ marginTop: 10 }} /> : null}
              <Text style={[type.small, { textAlign: 'center', marginTop: 10 }]}>{active.interruptionCount || 0} interruptions recorded</Text>
            </>
          ) : (
            <Btn label={`Start ${focus.settings.focusMinutes || 25}-minute focus`} icon="play" onPress={() => onStart(null)} style={{ marginTop: 10 }} />
          )}
          {!active ? <View style={styles.breakRow}><Pressable onPress={() => onStartBreak('shortBreak')}><Text style={styles.breakLink}>Start short break</Text></Pressable><Pressable onPress={() => onStartBreak('longBreak')}><Text style={styles.breakLink}>Start long break</Text></Pressable></View> : null}
        </Card>
      </FadeUp>

      <FadeUp delay={110}>
        <SectionHeader title="Ambient sounds" right="Offline · bundled" />
        <Card>
          <View style={styles.ambientHead}>
            <View style={{ flex: 1 }}>
              <Text style={type.title}>Set the atmosphere</Text>
              <Text style={type.small}>Optional background audio for your session.</Text>
            </View>
            <Btn label={ambientPlaying ? 'Pause' : 'Play'} icon={ambientPlaying ? 'pause' : 'play'} small kind={ambientPlaying ? 'secondary' : 'primary'} onPress={onAmbientToggle} />
          </View>
          <View style={styles.soundChoices}>
            {AMBIENT_SOUNDS.map((sound) => (
              <Pressable key={sound.id} onPress={() => onAmbientSound(sound.id)} style={[styles.soundChip, ambientSound === sound.id && styles.soundChipOn]}>
                <Text style={[styles.soundText, ambientSound === sound.id && { color: colors.ink }]}>{sound.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.volumeRow}>
            <Icon name="volume-low-outline" size={18} color={colors.muted} />
            <Pressable onPress={() => onAmbientVolume(Math.max(0, Math.round((ambientVolume - 0.1) * 10) / 10))} style={styles.volumeBtn}><Icon name="remove" color={colors.text} size={18} /></Pressable>
            <Text style={styles.volumeValue}>{Math.round(ambientVolume * 100)}%</Text>
            <Pressable onPress={() => onAmbientVolume(Math.min(1, Math.round((ambientVolume + 0.1) * 10) / 10))} style={styles.volumeBtn}><Icon name="add" color={colors.text} size={18} /></Pressable>
            <Icon name="volume-high-outline" size={18} color={colors.muted} />
          </View>
        </Card>
      </FadeUp>

      <FadeUp delay={130}>
        <SectionHeader title="Today's focus" right={`${Math.floor(todaySeconds / 60)} / ${Math.floor(goal / 60)} min`} />
        <Card>
          <View style={styles.goalTrack}><View style={[styles.goalFill, { width: `${Math.min(100, todaySeconds / goal * 100)}%` }]} /></View>
          <Text style={[type.small, { marginTop: 9 }]}>{Math.round(Math.min(100, todaySeconds / goal * 100))}% of your daily focus goal</Text>
        </Card>
      </FadeUp>

      <FadeUp delay={190}>
        <SectionHeader title="Attach a task" right="Optional" />
        <Card>
          <Text style={[type.small, { marginBottom: 10 }]}>Start a focus session for a task, or keep it independent. Focus never marks a task complete.</Text>
          {tasks.length ? tasks.slice(0, 6).map((task) => (
            <Pressable key={task.id} disabled={!!active} onPress={() => onStart(task.id)} style={styles.taskRow}>
              <Icon name="radio-button-off" size={18} color={colors.gold} />
              <Text numberOfLines={1} style={[type.body, { flex: 1, marginLeft: 10 }]}>{task.title}</Text>
              <Text style={styles.startText}>{active ? 'Busy' : 'Focus'}</Text>
            </Pressable>
          )) : <Text style={type.small}>Add tasks to your weekly plan to see them here.</Text>}
        </Card>
      </FadeUp>

      <FadeUp delay={250}>
        <SectionHeader title="Recent sessions" />
        <Card>
          {recent.length ? recent.map((s) => (
            <View key={s.id} style={styles.historyRow}>
              <Icon name={s.type === 'focus' ? 'radio-button-on' : 'cafe-outline'} color={s.type === 'focus' ? colors.gold : colors.muted} size={18} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={type.body}>{MODE[s.type] || 'Session'}</Text>
                <Text style={type.small}>{s.status === 'completed' ? 'Completed' : 'Ended early'} · {Math.round((s.actualFocusSeconds || 0) / 60)} min · {s.interruptionCount || 0} interruptions</Text>
              </View>
            </View>
          )) : <Text style={type.small}>Your completed focus sessions will appear here.</Text>}
        </Card>
      </FadeUp>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { flexDirection: 'row', alignItems: 'center' },
  settings: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  timerCard: { marginTop: 22, alignItems: 'center', paddingVertical: 22 },
  ringWrap: { marginVertical: 22 },
  clock: { fontSize: 48, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  clockCaption: { fontSize: 10, letterSpacing: 1.2, fontWeight: '800', color: colors.muted, marginTop: 5 },
  taskLabel: { color: colors.muted, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  breakRow: { flexDirection: 'row', gap: 24, marginTop: 18 },
  breakLink: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  goalTrack: { height: 9, borderRadius: 6, backgroundColor: colors.panelHi, overflow: 'hidden' },
  goalFill: { height: 9, backgroundColor: colors.gold, borderRadius: 6 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line },
  startText: { color: colors.gold, fontWeight: '800', fontSize: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  ambientHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  soundChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  soundChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.line },
  soundChipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  soundText: { fontSize: 12, fontWeight: '800', color: colors.text },
  volumeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16 },
  volumeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.panelHi, alignItems: 'center', justifyContent: 'center' },
  volumeValue: { color: colors.text, fontWeight: '800', width: 42, textAlign: 'center' },
});
