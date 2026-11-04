import React, { useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Btn, Card, Icon, IconBadge, useInsets } from '../ui';
import { ScreenIn, select } from '../anim';
import Wheel from '../Wheel';
import { CATEGORIES, PROOFS, TIMER_CHOICES, categoryOf } from '../categories';
import { colors, radius, type } from '../theme';
import { DAY_NAMES, pad, fmtTime } from '../dates';
import { UNDO_WINDOW_MINUTES } from '../planner';

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HALVES = ['am', 'pm'];

// The name box comes first, right under the activity chips, so the keyboard never covers it.
// The screen is not redrawn by anything outside it while it is open (no clock ticking), so typing stays smooth.
function TaskFormScreen({ initialWeek = 'this', paired, onSave, onBack, onPair, onVoice }) {
  const insets = useInsets();
  const [category, setCategory] = useState('work');
  const [title, setTitle] = useState('');
  const [hourIdx, setHourIdx] = useState(5); // 6
  const [minute, setMinute] = useState(0);
  const [half, setHalf] = useState(1); // pm
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [proof, setProof] = useState('qr');
  const [minutes, setMinutes] = useState(45);
  const [week, setWeek] = useState(initialWeek);
  const inputRef = useRef(null);

  const cat = categoryOf(category);
  const hour12 = HOURS[hourIdx];
  const hour24 = (hour12 % 12) + (half === 1 ? 12 : 0);
  const time = `${pad(hour24)}:${pad(minute)}`;
  const toggleDay = (i) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  const pickCategory = (c) => {
    select();
    setCategory(c.id);
    setProof(c.proof);
    setMinutes(c.minutes);
  };

  const save = () => {
    const name = title.trim();
    if (!name) return Alert.alert('Name your task', `What is this ${cat.label.toLowerCase()} task? Tap a suggestion or type your own.`);
    if (days.length === 0) return Alert.alert('Pick at least one day', 'Choose the days this should remind you.');
    onSave({ category, title: name, time, days: [...days].sort(), proof, minutes: proof === 'timer' ? minutes : 0 }, week);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.close}><Icon name="close" size={26} /></Pressable>
        <Text style={styles.headerTitle}>New task</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScreenIn>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 + Math.max(insets.bottom, 12) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={onVoice} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}><Icon name="mic-outline" size={17} color={colors.gold} /><Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>Create with voice</Text></Pressable>
          <Text style={styles.label0}>What is it?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {CATEGORIES.map((c) => {
              const on = category === c.id;
              return (
                <Pressable key={c.id} onPress={() => pickCategory(c)} style={[styles.cat, on && styles.catOn]}>
                  <Icon name={c.icon} size={20} color={on ? colors.ink : colors.gold} />
                  <Text style={[styles.catText, on && { color: colors.ink }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            ref={inputRef}
            value={title}
            onChangeText={setTitle}
            placeholder={`e.g. ${cat.examples[0]}`}
            placeholderTextColor={colors.faint}
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            importantForAutofill="no"
            maxLength={60}
          />
          <View style={styles.sugRow}>
            {cat.examples.map((ex) => (
              <Pressable key={ex} onPress={() => { select(); setTitle(ex); }} style={[styles.sug, title === ex && styles.sugOn]}>
                <Text style={[styles.sugText, title === ex && { color: colors.ink }]}>{ex}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Finish by</Text>
          <Card style={{ paddingVertical: 14, paddingHorizontal: 8 }}>
            <Text style={styles.timeReadout}>{fmtTime(time)}</Text>
            <View style={styles.wheels}>
              <Wheel data={HOURS} index={hourIdx} onChange={setHourIdx} width={84} />
              <Text style={styles.colon}>:</Text>
              <Wheel data={MINUTES} index={minute} onChange={setMinute} width={84} format={pad} />
              <Wheel data={HALVES} index={half} onChange={setHalf} width={84} />
            </View>
          </Card>

          <Text style={styles.label}>Days</Text>
          <View style={styles.dayRow}>
            {DAY_NAMES.map((n, i) => (
              <Pressable key={n} onPress={() => { select(); toggleDay(i); }} style={[styles.day, days.includes(i) && styles.dayOn]}>
                <Text style={[styles.dayText, days.includes(i) && { color: colors.ink }]}>{n.slice(0, 2)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Btn label="Every day" kind="quiet" small onPress={() => setDays([0, 1, 2, 3, 4, 5, 6])} />
            <Btn label="Weekdays" kind="quiet" small onPress={() => setDays([0, 1, 2, 3, 4])} style={{ marginLeft: 8 }} />
          </View>

          <Text style={styles.label}>For which week?</Text>
          <View style={styles.segment}>
            {[['this', 'This week'], ['next', 'Next week']].map(([k, l]) => (
              <Pressable key={k} onPress={() => setWeek(k)} style={[styles.segBtn, week === k && styles.segOn]}>
                <Text style={[styles.segText, week === k && { color: colors.ink }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>How do you prove it?</Text>
          {Object.entries(PROOFS).map(([id, p]) => {
            const on = proof === id;
            return (
              <Pressable key={id} onPress={() => { select(); setProof(id); }} style={[styles.proof, on && styles.proofOn]}>
                <IconBadge name={p.icon} size={40} tone={on ? 'gold' : 'muted'} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={type.title}>{p.label}</Text>
                  <Text style={type.small}>{p.blurb}</Text>
                </View>
                {on ? <Icon name="checkmark-circle" size={22} color={colors.gold} /> : null}
              </Pressable>
            );
          })}

          {proof === 'qr' && !paired ? (
            <Pressable onPress={onPair} style={styles.note}>
              <Icon name="link-outline" size={18} color={colors.gold} />
              <Text style={[type.small, { flex: 1, marginLeft: 10, color: colors.text }]}>Daily codes need your PC key tool. Tap to pair it now, or do it later in Settings.</Text>
            </Pressable>
          ) : null}

          {proof === 'timer' ? (
            <Card style={{ marginTop: 6 }}>
              <Text style={type.title}>Timer length</Text>
              <Text style={[type.small, { marginTop: 2 }]}>The task counts as done only after the full time has run.</Text>
              <View style={styles.chips}>
                {TIMER_CHOICES.map((m) => (
                  <Pressable key={m} onPress={() => { select(); setMinutes(m); }} style={[styles.chip, minutes === m && styles.chipOn]}>
                    <Text style={[styles.chipText, minutes === m && { color: colors.ink }]}>{m} min</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : null}


          <Text style={[type.small, { textAlign: 'center', marginTop: 24, marginBottom: 12 }]}>
            Once saved, this task is locked.{UNDO_WINDOW_MINUTES > 0 ? ` You can undo it for ${UNDO_WINDOW_MINUTES} minutes.` : ''}
          </Text>
          <Btn label="Lock it in" icon="lock-closed-outline" onPress={save} />
        </ScrollView>
      </ScreenIn>
    </View>
  );
}

export default React.memo(TaskFormScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label0: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 26, marginBottom: 10 },
  cat: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.pill, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, marginRight: 8 },
  catOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  catText: { fontSize: 14, fontWeight: '800', color: colors.text, marginLeft: 7 },
  input: { backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, fontSize: 17, color: colors.text, marginTop: 16 },
  sugRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  sug: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panelHi, marginRight: 8, marginBottom: 8 },
  sugOn: { backgroundColor: colors.gold },
  sugText: { fontSize: 13, fontWeight: '700', color: colors.text },
  timeReadout: { fontSize: 34, fontWeight: '800', color: colors.gold, textAlign: 'center', marginBottom: 6, fontVariant: ['tabular-nums'] },
  wheels: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  colon: { fontSize: 30, fontWeight: '800', color: colors.gold, marginHorizontal: 2 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  dayOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  dayText: { fontSize: 13, fontWeight: '800', color: colors.text },
  segment: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.line },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: colors.gold },
  segText: { fontSize: 14, fontWeight: '800', color: colors.text },
  proof: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 10 },
  proofOn: { borderColor: colors.gold },
  note: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.panelHi, marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.text },
});
