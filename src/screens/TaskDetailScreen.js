import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Btn, Card, Icon, IconBadge, Pill, SectionHeader, useInsets } from '../ui';
import { Pop, ScreenIn } from '../anim';
import SkipModal from '../SkipModal';
import { proofText } from '../TaskCard';
import { colors, radius, type } from '../theme';
import { categoryOf, PROOFS } from '../categories';
import { fmtDayHeading, fmtDays, fmtTime, fmtCountdown, dateKey, addDays, parseKey } from '../dates';
import { dayItems } from '../stats';
import { taskActiveOn, undoMsLeft } from '../planner';

export default function TaskDetailScreen({ task, state, now, passesLeft, onBack, onStart, onSkip, onUndo }) {
  const insets = useInsets();
  const [skipOpen, setSkipOpen] = useState(false);
  const cat = categoryOf(task.category);
  const proof = PROOFS[task.proof] || PROOFS.timer;
  const today = dateKey(now);
  const undoMs = undoMsLeft(task, state, now);

  // Results for the days this task has been scheduled, newest first.
  const rows = [];
  for (let i = 0; i < 21; i++) {
    const key = dateKey(addDays(parseKey(today), -i));
    if (!taskActiveOn(task, key)) continue;
    const it = dayItems(state, key, now).find((x) => x.task.id === task.id);
    if (it) rows.push(it);
  }
  const todayItem = rows.find((r) => r.dateKey === today);
  const canAct = todayItem && (todayItem.status === 'upcoming' || todayItem.status === 'overdue');

  return (
    <View style={styles.root}>
      <ScreenIn>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Pressable onPress={onBack} style={styles.back} hitSlop={10}><Icon name="chevron-back" size={26} /></Pressable>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Pop><IconBadge name={cat.icon} size={84} /></Pop>
            <Text style={[type.heading, { fontSize: 26, marginTop: 16, textAlign: 'center' }]}>{task.title}</Text>
            <Text style={[type.small, { marginTop: 4 }]}>{cat.label}</Text>
          </View>

          <Card style={{ marginTop: 22 }}>
            <Row icon="time-outline" label="Finish by" value={fmtTime(task.time)} />
            <Row icon="calendar-outline" label="Days" value={fmtDays(task.days)} />
            <Row icon={proof.icon} label="Proof" value={proofText(task)} last />
          </Card>


          <View style={styles.lock}>
            <Icon name="lock-closed-outline" size={18} color={colors.gold} />
            <Text style={[type.small, { flex: 1, marginLeft: 10, color: colors.text }]}>This task is locked. It can be finished, but never edited or deleted. To change anything, add a new task.</Text>
          </View>

          {canAct ? <Btn label={task.proof === 'timer' ? 'Start now' : 'Finish now'} icon={proof.icon} onPress={() => onStart(todayItem)} style={{ marginTop: 16 }} /> : null}
          {canAct ? (
            <Btn
              label={passesLeft > 0 ? `Skip today (${passesLeft} left this week)` : 'No skips left this week'}
              kind="quiet"
              disabled={passesLeft <= 0}
              onPress={() => setSkipOpen(true)}
              style={{ marginTop: 10 }}
            />
          ) : null}

          {undoMs > 0 ? (
            <Btn
              label={`Undo this task (${fmtCountdown(undoMs)} left)`}
              kind="danger"
              style={{ marginTop: 12 }}
              onPress={() => Alert.alert('Remove this task?', 'You can do this only in the first minutes after creating it. Add it again if you made a mistake.', [{ text: 'Keep it' }, { text: 'Remove', style: 'destructive', onPress: onUndo }])}
            />
          ) : null}

          <SectionHeader title="Recent days" />
          {rows.length === 0 ? <Text style={type.small}>It has not been scheduled yet.</Text> : null}
          <View style={rows.length ? styles.group : undefined}>
            {rows.map((r, i) => (
              <View key={r.dateKey} style={[styles.hrow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                <Text style={[type.body, { flex: 1 }]}>{fmtDayHeading(r.dateKey, now)}</Text>
                <Pill
                  label={r.status === 'done' ? 'Done' : r.status === 'skipped' ? 'Skipped' : r.status === 'missed' ? 'Missed' : r.status === 'overdue' ? 'Overdue' : 'Upcoming'}
                  tone={r.status === 'done' ? 'gold' : r.status === 'missed' || r.status === 'overdue' ? 'pink' : 'muted'}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </ScreenIn>
      <SkipModal visible={skipOpen} task={task} dateKey={today} passesLeft={passesLeft} onClose={() => setSkipOpen(false)} onSkip={() => { setSkipOpen(false); if (todayItem) onSkip(todayItem); }} />
    </View>
  );
}

function Row({ icon, label, value, last }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <Icon name={icon} size={20} color={colors.muted} />
      <Text style={[type.body, { flex: 1, marginLeft: 12, color: colors.muted }]}>{label}</Text>
      <Text style={type.title}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  lock: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: 14, marginTop: 16 },
  group: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  hrow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
});
