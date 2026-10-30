import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon, IconBadge, Pill } from './ui';
import { Tap } from './anim';
import { colors, radius, type } from './theme';
import { categoryOf, PROOFS } from './categories';
import { fmtTime, fmtCountdown } from './dates';

export const proofText = (task) => (task.proof === 'timer' ? `Timer ${task.minutes} min` : (PROOFS[task.proof] || PROOFS.timer).short);

function Outcome({ item }) {
  const { status, record } = item;
  if (status === 'done') {
    const at = record && record.at ? new Date(record.at) : null;
    return <Pill label={at ? `Done ${fmtTime(`${at.getHours()}:${at.getMinutes()}`)}` : 'Done'} tone="gold" icon="checkmark" />;
  }
  if (status === 'skipped') return <Pill label="Skipped" tone="muted" />;
  return <Pill label="Missed" tone="pink" />;
}

// One task in a list. Tasks still to do show a Finish (or Start) button; finished ones show their outcome.
export default function TaskCard({ item, now, onPress, onAction }) {
  const cat = categoryOf(item.task.category);
  const proof = PROOFS[item.task.proof] || PROOFS.timer;
  const pending = item.status === 'upcoming' || item.status === 'overdue';
  const overdue = item.status === 'overdue' || item.status === 'missed';
  const done = item.status === 'done';
  const ms = item.deadline - now;
  const timing = item.status === 'overdue' ? 'Overdue' : item.status === 'upcoming' ? (ms > 0 ? `in ${fmtCountdown(ms)}` : 'Due') : null;
  return (
    <Tap onPress={onPress} scale={0.98} style={[styles.card, item.status === 'overdue' && { borderColor: colors.pink }]}>
      <IconBadge name={cat.icon} tone={overdue ? 'pink' : done ? 'gold' : 'muted'} />
      <View style={{ flex: 1, marginLeft: 14, marginRight: 8 }}>
        <Text style={[type.title, done && { color: colors.muted }]} numberOfLines={1}>{item.task.title}</Text>
        <View style={styles.meta}>
          <Text style={type.small}>{fmtTime(item.task.time)}</Text>
          <Text style={[type.small, { marginHorizontal: 6 }]}>/</Text>
          <Icon name={proof.icon} size={13} color={colors.muted} />
          <Text style={[type.small, { marginLeft: 4 }]} numberOfLines={1}>{proofText(item.task)}</Text>
        </View>
        {timing ? <Text style={[styles.timing, item.status === 'overdue' && { color: colors.pink }]}>{timing}</Text> : null}
      </View>
      {pending && onAction ? (
        <Tap onPress={onAction} haptic scale={0.92} style={styles.action}>
          <Text style={styles.actionText}>{item.task.proof === 'timer' ? 'Start' : 'Finish'}</Text>
        </Tap>
      ) : !pending ? <Outcome item={item} /> : null}
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  timing: { fontSize: 12, fontWeight: '800', color: colors.gold, marginTop: 4 },
  action: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
});
