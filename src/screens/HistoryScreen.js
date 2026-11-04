import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { Card, Icon, IconBadge, Pill, useInsets } from '../ui';
import { FadeUp } from '../anim';
import { colors, radius, type } from '../theme';
import { categoryOf } from '../categories';
import { addDays, dateKey, fmtDayHeading, fmtTime, parseKey, weekdayIndex } from '../dates';
import { dayItems, dayScore } from '../stats';
import { proofText } from '../TaskCard';

const QUICK = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['180', '180 days']];
const FILTERS = [['all', 'All'], ['done', 'Completed'], ['skipped', 'Skipped'], ['missed', 'Missed']];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['M','T','W','T','F','S','S'];
function outcome(it) {
  if (it.status === 'done') {
    const at = it.record?.at ? new Date(it.record.at) : null;
    if (!at) return { text: 'Done', tone: 'gold' };
    const diff = Math.round((it.deadline - at) / 60000);
    return { text: `Done ${fmtTime(`${at.getHours()}:${at.getMinutes()}`)}, ${diff >= 1 ? `${diff} min early` : diff <= -1 ? `${-diff} min late` : 'on time'}`, tone: 'gold' };
  }
  if (it.status === 'skipped') return { text: 'Skipped', tone: 'muted' };
  return { text: 'Missed', tone: 'pink' };
}
function keyDate(key) { return parseKey(key); }
function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function shiftMonth(d, amount) { return new Date(d.getFullYear(), d.getMonth() + amount, 1); }

export default function HistoryScreen({ state, now, focus, onBack }) {
  const insets = useInsets();
  const todayKey = dateKey(now);
  const oldest = dateKey(addDays(now, -179));
  const [view, setView] = useState('tasks');
  const [range, setRange] = useState('7');
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [month, setMonth] = useState(monthStart(now));
  const [showCalendar, setShowCalendar] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const q = query.trim().toLowerCase();
  const selectedItems = useMemo(() => (state.historyClearedBefore && selectedKey < state.historyClearedBefore ? [] : dayItems(state, selectedKey, now)).filter((it) => {
    const matches = !q || it.task.title.toLowerCase().includes(q) || String(it.task.category || '').toLowerCase().includes(q);
    return matches && (filter === 'all' || it.status === filter);
  }), [state, selectedKey, now, q, filter]);
  const score = dayScore(state.historyClearedBefore && selectedKey < state.historyClearedBefore ? [] : dayItems(state, selectedKey, now));
  const rangeDays = range === 'today' || range === 'yesterday' || range === 'selected' ? 1 : Number(range);
  const rangeEnd = range === 'yesterday' ? dateKey(addDays(now, -1)) : range === 'selected' ? selectedKey : todayKey;
  const rangeStart = dateKey(addDays(parseKey(rangeEnd), -(rangeDays - 1)));
  const comparison = useMemo(() => {
    let done = 0, skipped = 0, missed = 0, total = 0, steps = 0, calories = 0, distance = 0, healthDays = 0;
    for (let i = 0; i < rangeDays; i++) {
      const key = dateKey(addDays(parseKey(rangeStart), i));
      const s = dayScore(state.historyClearedBefore && key < state.historyClearedBefore ? [] : dayItems(state, key, now));
      done += s.done; skipped += s.skipped; missed += s.missed; total += s.total;
      const h = state.healthHistory?.[key];
      if (h) { healthDays++; if (Number.isFinite(h.steps)) steps += h.steps; if (Number.isFinite(h.activeCalories)) calories += h.activeCalories; if (Number.isFinite(h.distanceMeters)) distance += h.distanceMeters; }
    }
    return { done, skipped, missed, total, steps, calories, distance, healthDays };
  }, [state, rangeStart, rangeDays, now]);
  const firstWeekday = weekdayIndex(monthStart(month));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const selectedHealth = state.healthHistory?.[selectedKey];
  const focusItems = (focus?.history || []).filter((session) => {
    const key = dateKey(new Date(session.startedAt));
    const label = session.type === 'focus' ? 'focus session' : session.type === 'longBreak' ? 'long break' : 'short break';
    return key === selectedKey && (!q || label.includes(q) || (state.tasks.find((t) => t.id === session.taskId)?.title || '').toLowerCase().includes(q));
  }).reverse();
  const selectQuick = (value) => {
    setRange(value);
    const key = value === 'yesterday' ? dateKey(addDays(now, -1)) : todayKey;
    setSelectedKey(key);
    setMonth(monthStart(parseKey(key)));
    setFilter('all');
  };
  const pickDate = (day) => {
    const d = new Date(month.getFullYear(), month.getMonth(), day);
    const key = dateKey(d);
    if (key < oldest || key > todayKey) return;
    setSelectedKey(key); setRange('selected'); setShowCalendar(false); setFilter('all');
  };
  return <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <FadeUp><View style={{ flexDirection: 'row', alignItems: 'center' }}><Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to insights" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Icon name="chevron-back" size={24} /></Pressable><Text style={type.display}>Detailed History</Text></View></FadeUp>
    <View style={styles.chips}>{[['tasks','Tasks'],['focus','Focus'],['activity','Activity']].map(([key,label]) => <Pressable key={key} onPress={() => { setView(key); setFilter('all'); }} style={[styles.chip, view === key && styles.chipOn]}><Text style={[styles.chipText, view === key && { color: colors.ink }]}>{label}</Text></Pressable>)}</View>
    <Text style={styles.label}>QUICK DATE RANGE</Text>
    <View style={styles.chips}>{QUICK.map(([value,label]) => <Pressable key={value} onPress={() => selectQuick(value)} style={[styles.chip, range === value && styles.chipOn]}><Text style={[styles.chipText, range === value && { color: colors.ink }]}>{label}</Text></Pressable>)}</View>
    <Pressable onPress={() => setShowCalendar((v) => !v)} style={styles.calendarToggle}><Icon name="calendar-outline" color={colors.gold} size={19}/><Text style={styles.calendarToggleText}>{range === 'selected' ? `Selected: ${selectedKey}` : 'Choose a specific date'}</Text><Icon name={showCalendar ? 'chevron-up' : 'chevron-down'} color={colors.muted}/></Pressable>
    {showCalendar ? <Card style={{ marginTop: 10, padding: 14 }}>
      <View style={styles.monthHead}><Pressable onPress={() => setMonth((m) => shiftMonth(m,-1))} style={styles.monthArrow}><Icon name="chevron-back"/></Pressable><Text style={type.title}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text><Pressable disabled={month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()} onPress={() => setMonth((m) => shiftMonth(m,1))} style={styles.monthArrow}><Icon name="chevron-forward" color={month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth() ? colors.faint : colors.text}/></Pressable></View>
      <View style={styles.calendarGrid}>{DAY_HEADERS.map((d,i)=><Text key={`h${i}`} style={styles.calendarDayHead}>{d}</Text>)}{calendarCells.map((day,i)=>{if(!day)return <View key={`blank${i}`} style={styles.calendarCell}/>;const key=dateKey(new Date(month.getFullYear(),month.getMonth(),day));const disabled=key<oldest||key>todayKey;const selected=key===selectedKey;return <Pressable key={key} disabled={disabled} onPress={()=>pickDate(day)} style={[styles.calendarCell,selected&&styles.calendarSelected,disabled&&styles.calendarDisabled]}><Text style={[styles.calendarDayText,selected&&{color:colors.ink},disabled&&{color:colors.faint}]}>{day}</Text></Pressable>;})}</View>
      <Text style={[type.small,{marginTop:10}]}>Available history: {oldest} to {todayKey}. Older records are automatically removed after 180 days.</Text>
    </Card> : null}
    {range !== 'selected' ? <Card style={{ marginTop: 12 }}><Text style={type.label}>PERIOD SUMMARY · {rangeStart} TO {rangeEnd}</Text><View style={styles.summaryGrid}><Summary value={`${comparison.done}`} label="Completed"/><Summary value={`${comparison.skipped}`} label="Skipped"/><Summary value={`${comparison.missed}`} label="Missed"/><Summary value={`${comparison.total}`} label="Scheduled"/></View><View style={styles.summaryGrid}><Summary value={comparison.steps ? comparison.steps.toLocaleString() : '—'} label="Steps"/><Summary value={comparison.calories ? `${Math.round(comparison.calories)}` : '—'} label="Active kcal"/><Summary value={comparison.distance ? `${(comparison.distance/1000).toFixed(1)} km` : '—'} label="Distance"/><Summary value={`${comparison.healthDays}/${rangeDays}`} label="Imported days"/></View></Card> : null}
    <View style={styles.selectedHead}><Text style={type.heading}>{fmtDayHeading(selectedKey, now)}</Text><Text style={type.small}>{selectedKey}</Text></View>
    {view !== 'activity' ? <>
      <TextInput value={query} onChangeText={setQuery} placeholder={view === 'tasks' ? 'Search task or category' : 'Search Focus session or task'} placeholderTextColor={colors.faint} style={styles.search}/>
      {view === 'tasks' ? <View style={styles.chips}>{FILTERS.map(([key,label])=><Pressable key={key} onPress={()=>setFilter(key)} style={[styles.chip,filter===key&&styles.chipOn]}><Text style={[styles.chipText,filter===key&&{color:colors.ink}]}>{label}</Text></Pressable>)}</View> : null}
      {view === 'tasks' ? <><View style={styles.scoreRow}><Pill label={`${score.done} completed`} tone="gold"/><Pill label={`${score.skipped} skipped`} tone="muted"/><Pill label={`${score.missed} missed`} tone="pink"/></View>{selectedItems.length ? <View style={styles.group}>{selectedItems.map((it,i)=>{const o=outcome(it);const pending=it.status==='upcoming'||it.status==='overdue';return <View key={it.task.id} style={[styles.item,i>0&&styles.itemBorder]}><IconBadge name={categoryOf(it.task.category).icon} size={38} tone={it.status==='done'?'gold':it.status==='missed'?'pink':'muted'}/><View style={{flex:1,marginLeft:12}}><Text style={type.title} numberOfLines={1}>{it.task.title}</Text><Text style={type.small}>{fmtTime(it.task.time)} / {proofText(it)}</Text></View>{pending?<Pill label={it.status==='overdue'?'Overdue':'Upcoming'} tone={it.status==='overdue'?'pink':'muted'}/>:<Pill label={o.text} tone={o.tone}/>}</View>;})}</View>:<Card style={styles.empty}><IconBadge name="time-outline" size={52}/><Text style={[type.title,{marginTop:12}]}>No task history for this day</Text><Text style={[type.small,{textAlign:'center',marginTop:4}]}>There are no matching scheduled tasks.</Text></Card>}</> : focusItems.length ? focusItems.map((session)=><View key={session.id} style={[styles.group,{marginTop:10,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center'}]}><IconBadge name={session.type==='focus'?'timer-outline':'cafe-outline'} size={38} tone={session.status==='completed'?'gold':'muted'}/><View style={{flex:1,marginLeft:12}}><Text style={type.title}>{session.type==='focus'?'Focus session':session.type==='longBreak'?'Long break':'Short break'}</Text><Text style={type.small}>{new Date(session.startedAt).toLocaleTimeString()} · {Math.round((session.actualFocusSeconds||0)/60)} min · {session.interruptionCount||0} interruptions</Text></View><Pill label={session.status==='completed'?'Completed':'Ended early'} tone={session.status==='completed'?'gold':'muted'}/></View>):<Card style={styles.empty}><IconBadge name="timer-outline" size={52}/><Text style={[type.title,{marginTop:12}]}>No Focus sessions</Text></Card>}
    </> : <Card style={{marginTop:12}}><Text style={type.title}>Health Connect activity</Text>{selectedHealth ? <><View style={styles.summaryGrid}><Summary value={selectedHealth.steps == null ? '—' : selectedHealth.steps.toLocaleString()} label="Steps"/><Summary value={selectedHealth.activeCalories == null ? '—' : Math.round(selectedHealth.activeCalories)} label="Active kcal"/><Summary value={selectedHealth.distanceMeters == null ? '—' : `${(selectedHealth.distanceMeters/1000).toFixed(2)} km`} label="Distance"/></View><Text style={[type.small,{marginTop:12}]}>Imported {new Date(selectedHealth.importedAt).toLocaleString()}</Text></> : <Text style={[type.small,{marginTop:8}]}>No imported Health Connect data for this day. Open Settings → Health & Activity and select Import last 180 days.</Text>}</Card>}
  </ScrollView>;
}
function Summary({value,label}) { return <View style={styles.summaryItem}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({root:{flex:1,backgroundColor:colors.ground},chips:{flexDirection:'row',flexWrap:'wrap',marginTop:12},chip:{paddingHorizontal:13,paddingVertical:9,minHeight:38,justifyContent:'center',borderRadius:radius.pill,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,marginRight:7,marginBottom:6},chipOn:{backgroundColor:colors.gold,borderColor:colors.gold},chipText:{fontSize:12,fontWeight:'800',color:colors.text},label:{fontSize:10,fontWeight:'800',letterSpacing:1,color:colors.muted,marginTop:14},calendarToggle:{marginTop:8,minHeight:48,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:colors.line,borderRadius:12,paddingHorizontal:12,backgroundColor:colors.panel},calendarToggleText:{flex:1,color:colors.text,fontSize:13,fontWeight:'700'},monthHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},monthArrow:{width:40,height:38,alignItems:'center',justifyContent:'center'},calendarGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:8},calendarDayHead:{width:'14.285%',textAlign:'center',color:colors.muted,fontSize:12,paddingVertical:8},calendarCell:{width:'14.285%',aspectRatio:1,alignItems:'center',justifyContent:'center',borderRadius:20},calendarSelected:{backgroundColor:colors.gold},calendarDisabled:{opacity:0.35},calendarDayText:{color:colors.text,fontSize:13,fontWeight:'700'},selectedHead:{marginTop:20,marginBottom:4},search:{marginTop:10,minHeight:46,borderRadius:12,borderWidth:1,borderColor:colors.line,paddingHorizontal:12,color:colors.text,backgroundColor:colors.panel},scoreRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginVertical:12},group:{backgroundColor:colors.panel,borderRadius:radius.lg,borderWidth:1,borderColor:colors.line,paddingHorizontal:14},item:{flexDirection:'row',alignItems:'center',paddingVertical:12},itemBorder:{borderTopWidth:1,borderTopColor:colors.line},empty:{alignItems:'center',paddingVertical:30,marginTop:12},summaryGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:12},summaryItem:{width:'25%',paddingVertical:8},summaryValue:{color:colors.gold,fontSize:16,fontWeight:'800'},summaryLabel:{color:colors.muted,fontSize:10,marginTop:3},selectedHead:{marginTop:20,marginBottom:4}});
