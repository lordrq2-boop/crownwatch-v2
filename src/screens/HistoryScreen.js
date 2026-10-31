import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { Card, Icon, IconBadge, Pill, useInsets } from '../ui';
import { FadeUp } from '../anim';
import { colors, radius, type } from '../theme';
import { categoryOf } from '../categories';
import { fmtDayHeading, fmtTime } from '../dates';
import { history } from '../stats';
import { proofText } from '../TaskCard';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days']];
const FILTERS = [['all', 'All'], ['done', 'Completed'], ['skipped', 'Skipped'], ['missed', 'Missed']];
function outcome(it) {
  if (it.status === 'done') {
    const at = it.record?.at ? new Date(it.record.at) : null;
    if (!at) return { text: 'Done', tone: 'gold' };
    const diff = Math.round((it.deadline - at) / 60000);
    const when = fmtTime(`${at.getHours()}:${at.getMinutes()}`);
    return { text: `Done ${when}, ${diff >= 1 ? `${diff} min early` : diff <= -1 ? `${-diff} min late` : 'on time'}`, tone: 'gold' };
  }
  if (it.status === 'skipped') return { text: 'Skipped', tone: 'muted' };
  return { text: 'Missed', tone: 'pink' };
}

export default function HistoryScreen({ state, now, focus, onBack }) {
  const insets = useInsets();
  const [days, setDays] = useState(30);
  const [view, setView] = useState('tasks');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const q = query.trim().toLowerCase();
  const list = history(state, now, days).map((day) => ({ ...day, items: day.items.filter((it) => {
    const matches = !q || it.task.title.toLowerCase().includes(q) || String(it.task.category || '').toLowerCase().includes(q);
    return matches && (filter === 'all' || it.status === filter);
  }) })).filter((day) => day.items.length > 0);
  const cutoff = now.getTime() - days * 86400000;
  const focusList = (focus?.history || []).slice().reverse().filter((session) => {
    const task = session.taskId && state.tasks.find((t) => t.id === session.taskId);
    const label = session.type === 'focus' ? 'focus session' : session.type === 'longBreak' ? 'long break' : 'short break';
    const matches = !q || label.includes(q) || (task?.title || '').toLowerCase().includes(q);
    return new Date(session.startedAt).getTime() >= cutoff && matches && (filter === 'all' || (filter === 'done' ? session.status === 'completed' : filter === 'missed' ? session.status !== 'completed' : false));
  });
  return <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <FadeUp><View style={{ flexDirection: 'row', alignItems: 'center' }}>{onBack ? <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to insights" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Icon name="chevron-back" size={24} /></Pressable> : null}<Text style={type.display}>Detailed History</Text></View></FadeUp>
    <View style={styles.chips}>{[['tasks', 'Tasks'], ['focus', 'Focus']].map(([key, label]) => <Pressable key={key} onPress={() => { setView(key); setFilter('all'); }} style={[styles.chip, view === key && styles.chipOn]}><Text style={[styles.chipText, view === key && { color: colors.ink }]}>{label}</Text></Pressable>)}</View>
    <TextInput value={query} onChangeText={setQuery} placeholder={view === 'tasks' ? 'Search task or category' : 'Search Focus session or task'} placeholderTextColor={colors.faint} style={styles.search} />
    <View style={[styles.chips, { marginTop: 10 }]}>{(view === 'tasks' ? FILTERS : [['all', 'All'], ['done', 'Completed'], ['missed', 'Ended early']]).map(([key, label]) => <Pressable key={key} onPress={() => setFilter(key)} style={[styles.chip, filter === key && styles.chipOn]}><Text style={[styles.chipText, filter === key && { color: colors.ink }]}>{label}</Text></Pressable>)}</View>
    {view === 'tasks' ? <>
      <View style={styles.lockRow}><Icon name="lock-closed-outline" size={14} color={colors.muted} /><Text style={[type.small, { marginLeft: 6 }]}>Read only. Past days can never be changed.</Text></View>
      <View style={styles.chips}>{RANGES.map(([n, label]) => <Pressable key={n} onPress={() => setDays(n)} style={[styles.chip, days === n && styles.chipOn]}><Text style={[styles.chipText, days === n && { color: colors.ink }]}>{label}</Text></Pressable>)}</View>
      {!list.length ? <Card style={styles.empty}><IconBadge name="time-outline" size={60} /><Text style={[type.title, { marginTop: 14 }]}>No matching task history</Text><Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>Try a different search, filter or date range.</Text></Card> : list.map((d, di) => <FadeUp key={d.key} delay={Math.min(di, 6) * 60} style={{ marginTop: 22 }}><View><View style={styles.dayHead}><Text style={type.heading}>{fmtDayHeading(d.key, now)}</Text><Pill label={`${d.score.done} of ${d.score.total}`} tone={d.score.complete ? 'gold' : d.score.missed ? 'pink' : 'muted'} /></View><View style={styles.group}>{d.items.map((it, i) => { const o = outcome(it); const pending = it.status === 'upcoming' || it.status === 'overdue'; return <View key={it.task.id} style={[styles.item, i > 0 && styles.itemBorder]}><IconBadge name={categoryOf(it.task.category).icon} size={38} tone={it.status === 'done' ? 'gold' : it.status === 'missed' ? 'pink' : 'muted'} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={type.title} numberOfLines={1}>{it.task.title}</Text><Text style={type.small}>{fmtTime(it.task.time)} / {proofText(it)}</Text></View>{pending ? <Pill label={it.status === 'overdue' ? 'Overdue' : 'Upcoming'} tone={it.status === 'overdue' ? 'pink' : 'muted'} /> : <Pill label={o.text} tone={o.tone} />}</View>; })}</View></View></FadeUp>)}
    </> : <>{RANGES.map(([n, label]) => <Pressable key={n} onPress={() => setDays(n)} style={[styles.chip, days === n && styles.chipOn]}><Text style={[styles.chipText, days === n && { color: colors.ink }]}>{label}</Text></Pressable>)}{!focusList.length ? <Card style={styles.empty}><IconBadge name="timer-outline" size={56} /><Text style={[type.title, { marginTop: 12 }]}>No matching Focus sessions</Text><Text style={[type.small, { marginTop: 4 }]}>Completed and ended Focus sessions will appear here.</Text></Card> : focusList.map((session) => <View key={session.id} style={[styles.group, { marginTop: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }]}><IconBadge name={session.type === 'focus' ? 'timer-outline' : 'cafe-outline'} size={38} tone={session.status === 'completed' ? 'gold' : 'muted'} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={type.title}>{session.type === 'focus' ? 'Focus session' : session.type === 'longBreak' ? 'Long break' : 'Short break'}</Text><Text style={type.small}>{new Date(session.startedAt).toLocaleString()} · {Math.round((session.actualFocusSeconds || 0) / 60)} min · {session.interruptionCount || 0} interruptions</Text>{session.taskId && state.tasks.find((t) => t.id === session.taskId) ? <Text style={[type.small, { marginTop: 2 }]}>Task: {state.tasks.find((t) => t.id === session.taskId).title}</Text> : null}</View><Pill label={session.status === 'completed' ? 'Completed' : 'Ended early'} tone={session.status === 'completed' ? 'gold' : 'muted'} /></View>)}</>}
  </ScrollView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.ground }, lockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }, chip: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, marginRight: 7, marginBottom: 6 }, chipOn: { backgroundColor: colors.gold, borderColor: colors.gold }, chipText: { fontSize: 13, fontWeight: '800', color: colors.text }, search: { marginTop: 14, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.panel }, empty: { alignItems: 'center', paddingVertical: 36, marginTop: 20 }, dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, group: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 }, item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }, itemBorder: { borderTopWidth: 1, borderTopColor: colors.line } });
