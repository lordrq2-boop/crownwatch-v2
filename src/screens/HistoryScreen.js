import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Card, Icon, IconBadge, Pill, useInsets } from '../ui';
import { FadeUp } from '../anim';
import { colors, radius, type } from '../theme';
import { categoryOf } from '../categories';
import { fmtDayHeading, fmtTime } from '../dates';
import { history } from '../stats';
import { proofText } from '../TaskCard';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days']];

function outcome(it) {
  if (it.status === 'done') {
    const at = it.record && it.record.at ? new Date(it.record.at) : null;
    if (!at) return { text: 'Done', tone: 'gold' };
    const diff = Math.round((it.deadline - at) / 60000);
    const when = fmtTime(`${at.getHours()}:${at.getMinutes()}`);
    const rel = diff >= 1 ? `${diff} min early` : diff <= -1 ? `${-diff} min late` : 'on time';
    return { text: `Done ${when}, ${rel}`, tone: 'gold' };
  }
  if (it.status === 'skipped') return { text: 'Skipped', tone: 'muted' };
  return { text: 'Missed', tone: 'pink' };
}

export default function HistoryScreen({ state, now }) {
  const insets = useInsets();
  const [days, setDays] = useState(30);
  const list = history(state, now, days);
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <FadeUp><Text style={type.display}>History</Text></FadeUp>
      <View style={styles.lockRow}>
        <Icon name="lock-closed-outline" size={14} color={colors.muted} />
        <Text style={[type.small, { marginLeft: 6 }]}>Read only. Past days can never be changed.</Text>
      </View>

      <View style={styles.chips}>
        {RANGES.map(([n, label]) => (
          <Pressable key={n} onPress={() => setDays(n)} style={[styles.chip, days === n && styles.chipOn]}>
            <Text style={[styles.chipText, days === n && { color: colors.ink }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {list.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 36, marginTop: 20 }}>
          <IconBadge name="time-outline" size={60} />
          <Text style={[type.title, { marginTop: 14 }]}>Nothing here yet</Text>
          <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>Finished tasks and missed days will appear here.</Text>
        </Card>
      ) : (
        list.map((d, di) => (
          <FadeUp key={d.key} delay={Math.min(di, 6) * 70} style={{ marginTop: 22 }}>
          <View>
            <View style={styles.dayHead}>
              <Text style={type.heading}>{fmtDayHeading(d.key, now)}</Text>
              <Pill label={`${d.score.done} of ${d.score.total}`} tone={d.score.complete ? 'gold' : d.score.missed ? 'pink' : 'muted'} />
            </View>
            <View style={styles.group}>
              {d.items.map((it, i) => {
                const o = outcome(it);
                const pending = it.status === 'upcoming' || it.status === 'overdue';
                return (
                  <View key={it.task.id} style={[styles.item, i > 0 && styles.itemBorder]}>
                    <IconBadge name={categoryOf(it.task.category).icon} size={38} tone={it.status === 'done' ? 'gold' : it.status === 'missed' ? 'pink' : 'muted'} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={type.title} numberOfLines={1}>{it.task.title}</Text>
                      <Text style={type.small}>{fmtTime(it.task.time)} / {proofText(it.task)}</Text>
                    </View>
                    {pending ? <Pill label={it.status === 'overdue' ? 'Overdue' : 'Upcoming'} tone={it.status === 'overdue' ? 'pink' : 'muted'} /> : <Pill label={o.text} tone={o.tone} />}
                  </View>
                );
              })}
            </View>
          </View>
          </FadeUp>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  lockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  chips: { flexDirection: 'row', marginTop: 18 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, marginRight: 8 },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.text },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  group: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.line },
});
