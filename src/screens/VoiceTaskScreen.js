import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Btn, Card, Icon, useInsets } from '../ui';
import { CATEGORIES, PROOFS, categoryOf } from '../categories';
import { DAY_NAMES, fmtTime } from '../dates';
import { colors, radius } from '../theme';
import { parseVoiceTask } from '../voiceTask';

export default function VoiceTaskScreen({ initialWeek = 'this', settings = {}, onSave, onBack }) {
  const insets = useInsets();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [voiceHour, setVoiceHour] = useState('6');
  const [voiceMinute, setVoiceMinute] = useState('00');
  const [voicePeriod, setVoicePeriod] = useState('pm');
  const mode = settings.voiceMode || 'mixed';
  const threshold = settings.voiceMixedThresholdMs || 400;
  const pressTimer = useRef(null);
  const holdStarted = useRef(false);
  const lastFinal = useRef('');
  const stopRequested = useRef(false);

  useSpeechRecognitionEvent('start', () => { setListening(true); setError(''); });
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript || '';
    if (event.isFinal) {
      lastFinal.current = [lastFinal.current, text].filter(Boolean).join(' ').trim();
      setFinalTranscript(lastFinal.current);
      setTranscript(lastFinal.current);
    } else setTranscript([lastFinal.current, text].filter(Boolean).join(' ').trim());
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    if (lastFinal.current.trim()) setFinalTranscript(lastFinal.current.trim());
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error !== 'aborted') setError(event.message || `Speech recognition error: ${event.error}`);
  });
  useEffect(() => () => { if (pressTimer.current) clearTimeout(pressTimer.current); try { ExpoSpeechRecognitionModule.abort(); } catch (e) {} }, []);

  const start = async () => {
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) throw new Error('Speech recognition is unavailable. Check that Google voice recognition is enabled on your phone.');
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) throw new Error('Microphone permission is required for voice task creation.');
      lastFinal.current = '';
      setTranscript(''); setFinalTranscript(''); setParsed(null); setError(''); stopRequested.current = false;
      ExpoSpeechRecognitionModule.start({ lang: 'en-NG', interimResults: true, continuous: false, maxAlternatives: 1, contextualStrings: ['CrownFlow', 'weekdays', 'tomorrow', 'Pomodoro'] });
    } catch (e) { setError(e.message || 'Could not start speech recognition.'); }
  };
  const stop = () => { stopRequested.current = true; try { ExpoSpeechRecognitionModule.stop(); } catch (e) { setListening(false); } };
  const cancel = () => { if (pressTimer.current) clearTimeout(pressTimer.current); holdStarted.current = false; try { ExpoSpeechRecognitionModule.abort(); } catch (e) {} setListening(false); setTranscript(''); setFinalTranscript(''); lastFinal.current = ''; setParsed(null); setError(''); };
  const pressIn = () => { holdStarted.current = false; if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = setTimeout(() => { holdStarted.current = true; if (!listening) start(); }, mode === 'mixed' ? threshold : Math.max(400, threshold)); };
  const pressOut = () => { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = null; if (holdStarted.current) { holdStarted.current = false; if (listening) stop(); } else if (mode === 'mixed') { if (listening) stop(); else start(); } };
  const tapToggle = () => { if (listening) stop(); else start(); };
  const review = () => {
    const result = parseVoiceTask(finalTranscript || transcript);
    if (!result.ok) { setError(result.reason); return; }
    const hh = Number(result.data.time.slice(0, 2));
    setVoiceHour(String((hh % 12) || 12)); setVoiceMinute(result.data.time.slice(3, 5)); setVoicePeriod(hh >= 12 ? 'pm' : 'am');
    setParsed({ ...result, data: { ...result.data }, week: result.week || initialWeek });
  };
  const toggleDay = (index) => setParsed((p) => ({ ...p, data: { ...p.data, days: p.data.days.includes(index) ? p.data.days.filter((d) => d !== index) : [...p.data.days, index].sort() } }));
  const save = () => {
    if (!parsed?.data.title.trim()) return Alert.alert('Task name needed', 'Enter a task name before saving.');
    if (!parsed.data.days.length) return Alert.alert('Choose a day', 'Select at least one day for this task.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.data.time) || parsed.ambiguousTime) return Alert.alert('Check the time', 'Choose a valid hour, minute and AM/PM before saving.');
    onSave(parsed.data, parsed.week);
  };
  const cat = parsed ? categoryOf(parsed.data.category) : null;
  const updateTime = (part, value) => {
    if (part === 'hour') setVoiceHour(value);
    if (part === 'minute') setVoiceMinute(value);
    if (part === 'period') setVoicePeriod(value);
    const h = Number(part === 'hour' ? value : voiceHour);
    const m = Number(part === 'minute' ? value : voiceMinute);
    const period = part === 'period' ? value : voicePeriod;
    if (!parsed || !/^\d{1,2}$/.test(String(part === 'hour' ? value : voiceHour)) || !/^\d{2}$/.test(String(part === 'minute' ? value : voiceMinute)) || h < 1 || h > 12 || m < 0 || m > 59) return;
    let hour24 = h % 12;
    if (period === 'pm') hour24 += 12;
    setParsed((p) => ({ ...p, ambiguousTime: false, missing: (p.missing || []).filter((x) => x !== 'AM or PM'), data: { ...p.data, time: `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}` } }));
  };

  return <View style={styles.root}>
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} style={styles.back}><Icon name="chevron-back" size={24} /></Pressable>
      <Text style={styles.heading}>Create with voice</Text><View style={{ width: 40 }} />
    </View>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Say what you want CrownFlow to add. For example:</Text>
      <Card style={styles.example}><Text style={styles.exampleText}>“Create a task to study for one hour tomorrow at 7 PM.”</Text></Card>
      <Text style={[styles.modeHint]}>Control: {mode === 'tap' ? 'Tap to speak' : mode === 'hold' ? 'Hold to speak' : `Mixed · short tap / hold ${threshold} ms`}</Text>
      <View style={styles.micRow}>
        <Pressable
          onPress={mode === 'tap' ? tapToggle : undefined}
          onPressIn={mode === 'hold' || mode === 'mixed' ? pressIn : undefined}
          onPressOut={mode === 'hold' || mode === 'mixed' ? pressOut : undefined}
          style={[styles.mic, listening && styles.micOn]}
          accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : mode === 'hold' ? 'Hold to speak' : 'Tap to speak'}
        >
          <Icon name={listening ? 'mic' : 'mic-outline'} size={34} color={listening ? '#FFFFFF' : colors.gold} />
          <Text style={[styles.micLabel, listening && { color: '#FFFFFF' }]}>{listening ? (mode === 'hold' || (mode === 'mixed' && holdStarted.current) ? 'Listening — release to finish' : 'Listening — tap to finish') : (mode === 'hold' ? 'Hold to speak' : mode === 'mixed' ? 'Tap or hold to speak' : 'Tap to speak')}</Text>
        </Pressable>
        {(listening || transcript.trim()) ? <Pressable onPress={cancel} style={styles.cancelButton} accessibilityRole="button" accessibilityLabel="Cancel voice recording"><Icon name="close-circle" size={30} color={colors.pink}/><Text style={styles.cancelText}>Cancel</Text></Pressable> : null}
      </View>
      <Text style={styles.status}>{listening ? 'MICROPHONE ACTIVE · SPEAK NOW' : 'MICROPHONE OFF'}</Text>
      <Text style={styles.label}>What CrownFlow heard</Text>
      <TextInput value={transcript} onChangeText={(v) => { setTranscript(v); setFinalTranscript(v); setParsed(null); }} multiline placeholder="Your recognised words will appear here. You can correct them." placeholderTextColor={colors.faint} style={styles.transcript} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Btn label="Clear" kind="quiet" onPress={cancel} />
        <Btn label="Review task" onPress={review} disabled={!transcript.trim() || listening} />
      </View>
      <Text style={styles.note}>Speech recognition is provided by your phone’s speech service. Depending on its settings and downloaded language packs, it may use the internet. CrownFlow does not keep a background microphone running.</Text>
      {parsed ? <View style={{ marginTop: 22 }}>
        <Text style={styles.section}>Review before saving</Text>
        <Text style={styles.hint}>Check every detail. Nothing is saved until you press Save task.</Text>
        <Card style={styles.review}>
          <Text style={styles.label}>Task name</Text>
          <TextInput value={parsed.data.title} onChangeText={(v) => setParsed((p) => ({ ...p, data: { ...p.data, title: v } }))} style={styles.field} />
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>{CATEGORIES.map((c) => <Pressable key={c.id} onPress={() => setParsed((p) => ({ ...p, data: { ...p.data, category: c.id, proof: c.proof, minutes: c.minutes } }))} style={[styles.chip, parsed.data.category === c.id && styles.chipOn]}><Text style={[styles.chipText, parsed.data.category === c.id && { color: colors.ink }]}>{c.label}</Text></Pressable>)}</View>
          <Text style={styles.label}>Finish time</Text>
          <View style={styles.timeInputRow}>
            <TextInput value={voiceHour} onChangeText={(v) => updateTime('hour', v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} placeholder="07" style={[styles.field, styles.timeDigit]} />
            <Text style={styles.timeColon}>:</Text>
            <TextInput value={voiceMinute} onChangeText={(v) => updateTime('minute', v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} placeholder="00" style={[styles.field, styles.timeDigit]} />
            <View style={styles.periodGroup}>
              {['am', 'pm'].map((period) => <Pressable key={period} onPress={() => updateTime('period', period)} style={[styles.periodChip, voicePeriod === period && styles.chipOn]}><Text style={[styles.chipText, voicePeriod === period && { color: colors.ink }]}>{period.toUpperCase()}</Text></Pressable>)}
            </View>
          </View>
          {parsed.ambiguousTime ? <Text style={styles.warning}>I heard “{voiceHour}” but couldn't tell whether you meant AM or PM. Select the correct one.</Text> : null}
          <Text style={styles.label}>Days</Text>
          <View style={styles.days}>{DAY_NAMES.map((d, i) => <Pressable key={d} onPress={() => toggleDay(i)} style={[styles.day, parsed.data.days.includes(i) && styles.dayOn]}><Text style={[styles.dayText, parsed.data.days.includes(i) && { color: colors.ink }]}>{d.slice(0, 2)}</Text></Pressable>)}</View>
          <Text style={styles.label}>Duration / proof</Text>
          <Text style={styles.value}>{parsed.data.proof === 'timer' ? `${parsed.data.minutes} minutes · Timer` : PROOFS[parsed.data.proof]?.label || parsed.data.proof}</Text>
          <Text style={styles.label}>Week</Text>
          <View style={styles.chips}><Pressable onPress={() => setParsed((p) => ({ ...p, week: 'this' }))} style={[styles.chip, parsed.week === 'this' && styles.chipOn]}><Text style={styles.chipText}>This week</Text></Pressable><Pressable onPress={() => setParsed((p) => ({ ...p, week: 'next' }))} style={[styles.chip, parsed.week === 'next' && styles.chipOn]}><Text style={styles.chipText}>Next week</Text></Pressable></View>
          {parsed.missing?.filter((x) => x !== 'AM or PM').length ? <Text style={styles.warning}>Not heard: {parsed.missing.filter((x) => x !== 'AM or PM').join(', ')}. A default value has been filled in; check it before saving.</Text> : null}
          {parsed.assumptions?.day ? <Text style={styles.warning}>No day was detected. CrownFlow selected today; change it above if needed.</Text> : null}
          <Btn label="Save task" onPress={save} style={{ marginTop: 18 }} />
        </Card>
      </View> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground }, header: { paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 40 }, heading: { color: colors.text, fontSize: 19, fontWeight: '700' }, intro: { color: colors.muted, fontSize: 14, lineHeight: 21 }, example: { marginTop: 10, padding: 14 }, exampleText: { color: colors.text, fontSize: 15, lineHeight: 22 }, modeHint:{color:colors.muted,fontSize:12,marginTop:16,textAlign:'center'},micRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:18},cancelButton:{alignItems:'center',justifyContent:'center',padding:8},cancelText:{color:colors.pink,fontSize:11,fontWeight:'700',marginTop:3}, mic: { alignSelf: 'center', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: 22, backgroundColor: colors.panel, gap: 8 }, micOn: { backgroundColor: colors.pink, borderColor: colors.pink }, micLabel: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' }, status: { color: colors.muted, textAlign: 'center', fontSize: 10, letterSpacing: 1.2, marginTop: 12 }, label: { color: colors.muted, fontSize: 12, marginTop: 18, marginBottom: 7 }, transcript: { minHeight: 92, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.text, padding: 12, textAlignVertical: 'top', fontSize: 15, backgroundColor: colors.panel }, actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, note: { color: colors.faint, fontSize: 11, lineHeight: 17, marginTop: 14 }, error: { color: '#FF7777', marginTop: 10, fontSize: 12 }, section: { color: colors.text, fontSize: 17, fontWeight: '700' }, hint: { color: colors.muted, fontSize: 12, marginTop: 5 }, review: { padding: 14, marginTop: 12 }, field: { color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 11, fontSize: 15, backgroundColor: colors.ground }, timeInputRow:{flexDirection:'row',alignItems:'center',gap:7},timeDigit:{width:64,textAlign:'center',fontSize:20,fontWeight:'800'},timeColon:{color:colors.text,fontSize:22,fontWeight:'800'},periodGroup:{flexDirection:'row',gap:6,marginLeft:4},periodChip:{borderWidth:1,borderColor:colors.line,borderRadius:10,paddingVertical:10,paddingHorizontal:12}, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 11 }, chipOn: { backgroundColor: colors.gold, borderColor: colors.gold }, chipText: { color: colors.text, fontSize: 12 }, days: { flexDirection: 'row', justifyContent: 'space-between' }, day: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, dayOn: { backgroundColor: colors.gold, borderColor: colors.gold }, dayText: { color: colors.text, fontSize: 12 }, value: { color: colors.text, fontSize: 14 }, warning: { color: '#E7B85B', fontSize: 12, lineHeight: 18, marginTop: 12 }
});
