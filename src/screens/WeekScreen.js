import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Btn, Card, Icon, IconBadge, SectionHeader, useInsets } from '../ui';
import { FadeUp, Tap } from '../anim';
import { proofText } from '../TaskCard';
import { colors, radius, type } from '../theme';
import { categoryOf } from '../categories';
import { DAY_NAMES, fmtDays, fmtMonthDay, fmtTime, parseKey, addDays } from '../dates';

function TaskRow({ task, onPress, i = 0 }) {
  const cat = categoryOf(task.category);
  return (
    <FadeUp delay={Math.min(i, 8) * 55}>
    <Tap onPress={onPress} scale={0.98} style={styles.row}>
      <IconBadge name={cat.icon} tone="muted" size={42} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={type.title} numberOfLines={1}>{task.title}</Text>
        <Text style={type.small}>{fmtTime(task.time)} / {fmtDays(task.days)} / {proofText(task)}</Text>
      </View>
      <Icon name="lock-closed-outline" size={16} color={colors.faint} />
    </Tap>
    </FadeUp>
  );
}

export default function WeekScreen({ thisWeek, nextWeek, weekStart, nextStart, canCarry, onOpenTask, onAdd, onCarry }) {
  const insets = useInsets();
  const range = (ws) => `${fmtMonthDay(parseKey(ws))} to ${fmtMonthDay(addDays(parseKey(ws), 6))}`;
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <FadeUp>
        <Text style={type.display}>Plan</Text>
        <Text style={[type.small, { marginTop: 4 }]}>Tasks are locked once saved. To change something, add a new task.</Text>
      </FadeUp>

      <SectionHeader title="This week" right={range(weekStart)} />
      {thisWeek.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <IconBadge name="calendar-outline" size={56} />
          <Text style={[type.title, { marginTop: 12 }]}>No tasks this week</Text>
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <Btn label="Add a task" onPress={() => onAdd('this')} small />
            {canCarry ? <Btn label="Carry over" kind="secondary" onPress={() => onCarry('this')} small style={{ marginLeft: 10 }} /> : null}
          </View>
        </Card>
      ) : (
        thisWeek.map((t, i) => <TaskRow key={t.id} i={i} task={t} onPress={() => onOpenTask(t)} />)
      )}

      <SectionHeader title="Next week" right={range(nextStart)} />
      {nextWeek.map((t, i) => <TaskRow key={t.id} i={i} task={t} onPress={() => onOpenTask(t)} />)}
      <View style={{ flexDirection: 'row' }}>
        <Btn label="Add for next week" kind="secondary" onPress={() => onAdd('next')} small icon="add" />
        {canCarry || thisWeek.length > 0 ? <Btn label="Carry over" kind="quiet" onPress={() => onCarry('next')} small style={{ marginLeft: 10 }} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 },
});
