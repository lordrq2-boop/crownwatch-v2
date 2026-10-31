import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Linking, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Btn, Card, Icon, IconBadge, Pill, SectionHeader, useInsets } from '../ui';
import { ScreenIn } from '../anim';
import { colors, radius, type } from '../theme';
import { clearLastError, readLastError } from '../errors';
import { healthMessage } from '../health';

const SWITCH = { trackColor: { true: colors.goldDeep, false: colors.panelHi } };

function Segment({ options, value, onChange }) {
  return <View style={styles.segment}>{options.map(([k, label]) => <Pressable key={String(k)} onPress={() => onChange(k)} style={[styles.segBtn, value === k && styles.segOn]}><Text style={[styles.segText, value === k && { color: colors.ink }]}>{label}</Text></Pressable>)}</View>;
}

function MenuRow({ icon, title, subtitle, onPress, value }) {
  return <Pressable onPress={onPress} style={styles.menuRow} accessibilityRole="button"><IconBadge name={icon} size={42} tone="muted" /><View style={{ flex: 1, marginLeft: 12 }}><Text style={type.title}>{title}</Text>{subtitle ? <Text style={[type.small, { marginTop: 3 }]}>{subtitle}</Text> : null}</View>{value ? <Text style={styles.menuValue}>{value}</Text> : null}<Icon name="chevron-forward" size={19} color={colors.faint} /></Pressable>;
}

function Row({ icon, title, sub, right, last }) {
  return <View style={[styles.row, !last && styles.rowBorder]}><IconBadge name={icon} size={38} tone="muted" /><View style={{ flex: 1, marginLeft: 12 }}><Text style={type.title}>{title}</Text>{sub ? <Text style={type.small}>{sub}</Text> : null}</View>{right}</View>;
}

export default function SettingsScreen({ paired, notif, testMsg, settings, health, stepGoal, onBack, onPair, onRecheck, onTest, onChange, onPickRingtone, onConnectHealth, onRefreshHealth, onOpenHealth, onResetTestData, focusSettings, onFocusChange, weather, onWeatherUseLocation, onWeatherSearch, onWeatherSelect, onExport }) {
  const insets = useInsets();
  const [page, setPage] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthMessageText, setHealthMessageText] = useState('');
  const [query, setQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [cityBusy, setCityBusy] = useState(false);
  const [cityError, setCityError] = useState('');
  useEffect(() => { readLastError().then(setLastError); }, []);

  const refreshHealth = async () => {
    if (healthBusy) return;
    setHealthBusy(true); setHealthMessageText('Refreshing Health Connect…');
    try { const result = await onRefreshHealth(); if (result?.state === 'ready') setHealthMessageText(`Health Connect refreshed at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`); else if (result?.state === 'busy') setHealthMessageText('A Health Connect refresh is already in progress.'); else setHealthMessageText(healthMessage(result || health) || 'Health Connect is not ready. Check access and try again.'); }
    catch (e) { setHealthMessageText(e?.message || 'Refresh failed. Check Health Connect permissions and try again.'); }
    finally { setHealthBusy(false); }
  };

  const search = async () => {
    if (query.trim().length < 2) { setCityError('Enter at least two letters.'); return; }
    setCityBusy(true); setCityError('');
    try { const results = await onWeatherSearch(query); setCityResults(results); if (!results.length) setCityError('No matching cities found.'); }
    catch (e) { setCityError(e.message || 'City search failed.'); }
    finally { setCityBusy(false); }
  };

  const headerTitle = page ? ({ activity: 'Health & Activity', focus: 'Focus', notifications: 'Notifications & Sounds', appearance: 'Appearance & Home', weather: 'Weather', data: 'App & Data' }[page] || 'Settings') : 'Settings';
  const Header = <View style={[styles.header, { paddingTop: insets.top + 8 }]}><Pressable onPress={() => page ? setPage(null) : onBack()} hitSlop={10} style={{ width: 42, height: 42, justifyContent: 'center' }}><Icon name="chevron-back" size={26} /></Pressable><Text style={styles.headerTitle}>{headerTitle}</Text><View style={{ width: 42 }} /></View>;

  return <View style={styles.root}>{Header}<ScreenIn><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 42 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    {!page ? <>
      <Text style={type.small}>Adjust each part of CrownFlow separately.</Text>
      <Card style={{ marginTop: 16, paddingVertical: 4 }}>
        <MenuRow icon="heart-outline" title="Health & Activity" subtitle="Health Connect, steps and activity data" onPress={() => setPage('activity')} />
        <MenuRow icon="timer-outline" title="Focus" subtitle="Pomodoro timing, goals and breaks" onPress={() => setPage('focus')} />
        <MenuRow icon="notifications-outline" title="Notifications & Sounds" subtitle="Reminders, ringing and notification timing" value={notif.ok ? 'On' : 'Off'} onPress={() => setPage('notifications')} />
        <MenuRow icon="color-palette-outline" title="Appearance & Home" subtitle="Home screen sections, motion and accessibility" onPress={() => setPage('appearance')} />
        <MenuRow icon="cloud-outline" title="Weather" subtitle={weather?.city ? `${weather.city.name}${weather.city.country ? `, ${weather.city.country}` : ''}` : 'Choose your weather location'} onPress={() => setPage('weather')} />
        <MenuRow icon="save-outline" title="App & Data" subtitle="Export a backup, pairing and app information" onPress={() => setPage('data')} />
      </Card>
      <SectionHeader title="PC key tool" />
      <Card style={{ paddingVertical: 4 }}><Row icon="shield-checkmark-outline" title="Pairing" sub={paired ? "Paired. Today's code from your PC is accepted." : 'Not paired yet. Scan the pairing code from your PC.'} right={<Pill label={paired ? 'Paired' : 'Not paired'} tone={paired ? 'gold' : 'pink'} />} last /></Card>
      <Btn label={paired ? 'Pair again' : 'Pair with PC key tool'} kind={paired ? 'quiet' : 'primary'} icon="scan-outline" onPress={onPair} style={{ marginTop: 12 }} small />
      <Text style={[type.small, { textAlign: 'center', marginTop: 26 }]}>CrownFlow 0.9</Text>
    </> : null}

    {page === 'activity' ? <>
      <Card style={{ paddingVertical: 4 }}><Row icon="heart-outline" title="Health Connect" sub={health.state === 'ready' ? 'Connected. CrownFlow reads only the measurements you allow.' : healthMessage(health) || 'Checking Health Connect…'} right={<Pill label={health.state === 'ready' ? 'Connected' : 'Not connected'} tone={health.state === 'ready' ? 'gold' : 'pink'} />} /></Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}><Btn label="Connect / update access" icon="link-outline" small onPress={onConnectHealth} /><Btn label={healthBusy ? 'Refreshing…' : 'Refresh data'} icon="refresh" kind="quiet" small disabled={healthBusy} onPress={refreshHealth} style={{ marginLeft: 8 }} /></View>
      {healthBusy ? <View style={styles.statusLine}><ActivityIndicator color={colors.gold} /><Text style={type.small}>Reading your latest activity…</Text></View> : null}
      {healthMessageText ? <Text style={[type.small, { marginTop: 9 }]}>{healthMessageText}</Text> : null}
      <Card style={{ marginTop: 14, paddingVertical: 4 }}>{[['Steps', health.permissions?.steps], ['Active calories', health.permissions?.calories], ['Distance', health.permissions?.distance], ['Body weight', health.permissions?.weight]].map(([label, allowed], i) => <Row key={label} icon="checkmark-circle-outline" title={label} right={<Pill label={allowed ? 'Allowed' : 'Not allowed'} tone={allowed ? 'gold' : 'muted'} />} last={i === 3} />)}</Card>
      <Btn label="Open Health Connect" icon="open-outline" kind="quiet" small onPress={onOpenHealth} style={{ marginTop: 12 }} />
      <SectionHeader title="Daily step goal" /><Card><Segment options={[[3000, '3,000'], [5000, '5,000'], [8000, '8,000'], [10000, '10,000']]} value={stepGoal} onChange={(v) => onChange({ stepGoal: v })} /></Card>
      <Text style={[type.small, { marginTop: 12 }]}>CrownFlow reads activity data from Health Connect. Refreshing is manual or happens when the app is opened; there is no continuous health polling.</Text>
    </> : null}

    {page === 'focus' ? <Card>
      <Text style={styles.label}>Daily focus goal</Text><Segment options={[[60, '1 hour'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours']]} value={focusSettings?.dailyGoalMinutes || 120} onChange={(v) => onFocusChange({ dailyGoalMinutes: v })} />
      <Text style={[styles.label, { marginTop: 18 }]}>Weekly focus goal</Text><Segment options={[[300, '5 hours'], [600, '10 hours'], [900, '15 hours'], [1200, '20 hours']]} value={focusSettings?.weeklyGoalMinutes || 600} onChange={(v) => onFocusChange({ weeklyGoalMinutes: v })} />
      <Text style={[styles.label, { marginTop: 18 }]}>Focus session</Text><Segment options={[[20, '20 min'], [25, '25 min'], [30, '30 min'], [45, '45 min']]} value={focusSettings?.focusMinutes || 25} onChange={(v) => onFocusChange({ focusMinutes: v })} />
      <Text style={[styles.label, { marginTop: 18 }]}>Short break</Text><Segment options={[[5, '5 min'], [10, '10 min']]} value={focusSettings?.shortBreakMinutes || 5} onChange={(v) => onFocusChange({ shortBreakMinutes: v })} />
      <Text style={[styles.label, { marginTop: 18 }]}>Long break</Text><Segment options={[[15, '15 min'], [20, '20 min'], [30, '30 min']]} value={focusSettings?.longBreakMinutes || 15} onChange={(v) => onFocusChange({ longBreakMinutes: v })} />
      <Text style={[type.small, { marginTop: 10 }]}>A long break follows every fourth completed focus session. Break time is not counted as focus time.</Text>
      <View style={styles.switchRow}><View style={{ flex: 1, paddingRight: 12 }}><Text style={type.title}>Ambient sound during breaks</Text><Text style={type.small}>Keep the selected background sound playing during breaks.</Text></View><Switch {...SWITCH} value={focusSettings?.ambientDuringBreaks !== false} onValueChange={(v) => onFocusChange({ ambientDuringBreaks: v })} thumbColor={focusSettings?.ambientDuringBreaks !== false ? colors.gold : colors.muted} /></View>
    </Card> : null}

    {page === 'notifications' ? <>
      <Card style={{ paddingVertical: 4 }}><Row icon="notifications-outline" title="Notifications" sub={notif.ok ? 'Task reminders are enabled.' : notif.reason} right={<Pill label={notif.ok ? 'On' : 'Off'} tone={notif.ok ? 'gold' : 'pink'} />} /><Row icon="alarm-outline" title="Exact timing" sub={notif.exact ? 'Reminders can arrive on the minute.' : 'Android may deliver reminders a few minutes late.'} right={<Pill label={notif.exact ? 'On' : 'Off'} tone={notif.exact ? 'gold' : 'pink'} />} last /></Card>
      <View style={{ flexDirection: 'row', marginTop: 12 }}><Btn label="Check again" kind="quiet" small onPress={onRecheck} /><Btn label="Send test reminder" kind="quiet" small onPress={onTest} style={{ marginLeft: 8 }} /></View>{testMsg ? <Text style={[type.small, { marginTop: 10 }]}>{testMsg}</Text> : null}
      <SectionHeader title="Ringing sound" /><Card><Segment options={[[ 'jingle', 'CrownFlow jingle' ], ['phone', 'Phone ringtone']]} value={settings.sound} onChange={(v) => onChange({ sound: v })} />{settings.sound === 'jingle' ? <><Text style={[styles.label, { marginTop: 18 }]}>How long it rings</Text><Segment options={[[10, '10 seconds'], [20, '20 seconds'], [30, '30 seconds']]} value={settings.ringSeconds} onChange={(v) => onChange({ ringSeconds: v })} /></> : <Btn label="Choose phone ringtone" icon="musical-notes-outline" kind="secondary" small onPress={onPickRingtone} style={{ marginTop: 14 }} />}
      <Text style={[type.small, { marginTop: 12 }]}>It rings at your phone's Alarm volume. Opening the app silences it.</Text><Text style={[styles.label, { marginTop: 18 }]}>Repeat reminders every</Text><Segment options={[[5, '5 min'], [10, '10 min'], [15, '15 min']]} value={settings.nagMinutes} onChange={(v) => onChange({ nagMinutes: v })} />
      <View style={styles.switchRow}><View style={{ flex: 1, paddingRight: 12 }}><Text style={type.title}>Extra reliable delivery</Text><Text style={type.small}>Use a small alarm icon in the status bar to improve reminder reliability.</Text></View><Switch {...SWITCH} value={!!settings.reliable} onValueChange={(v) => onChange({ reliable: v })} thumbColor={settings.reliable ? colors.gold : colors.muted} /></View>
      <View style={styles.switchRow}><View style={{ flex: 1, paddingRight: 12 }}><Text style={type.title}>Weekly review reminder</Text><Text style={type.small}>A Monday reminder. Off by default.</Text></View><Switch {...SWITCH} value={!!focusSettings?.weeklyReviewNotification} onValueChange={(v) => onFocusChange({ weeklyReviewNotification: v })} thumbColor={focusSettings?.weeklyReviewNotification ? colors.gold : colors.muted} /></View>
      {focusSettings?.weeklyReviewNotification ? <><Text style={[styles.label, { marginTop: 12 }]}>Reminder time</Text><Segment options={[[8, '8 AM'], [12, '12 PM'], [17, '5 PM'], [19, '7 PM'], [20, '8 PM']]} value={focusSettings?.weeklyReviewHour ?? 19} onChange={(v) => onFocusChange({ weeklyReviewHour: v })} /></> : null}</Card>
    </> : null}

    {page === 'appearance' ? <>
      <Card style={{ paddingVertical: 4 }}><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={type.title}>Animations</Text><Text style={type.small}>Motion effects and haptic taps.</Text></View><Switch {...SWITCH} value={settings.animations !== false} onValueChange={(v) => onChange({ animations: v })} thumbColor={settings.animations !== false ? colors.gold : colors.muted} /></View><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={type.title}>Reduce motion</Text><Text style={type.small}>Prefer calmer transitions and less decorative movement.</Text></View><Switch {...SWITCH} value={!!settings.reduceMotion} onValueChange={(v) => onChange({ reduceMotion: v, animations: v ? false : true })} thumbColor={settings.reduceMotion ? colors.gold : colors.muted} /></View></Card>
      <SectionHeader title="Home screen sections" /><Card>{[['weather', 'Weather'], ['activity', 'Health & Activity'], ['focus', 'Focus summary'], ['walk', 'Walk Session'], ['streak', 'Weekly progress']].map(([key, label], i) => <View key={key} style={[styles.switchRow, i !== 4 && styles.rowBorder]}><Text style={type.title}>{label}</Text><Switch {...SWITCH} value={settings.homeWidgets?.[key] !== false} onValueChange={(v) => onChange({ homeWidgets: { ...(settings.homeWidgets || {}), [key]: v } })} thumbColor={settings.homeWidgets?.[key] !== false ? colors.gold : colors.muted} /></View>)}</Card>
      <Text style={[type.small, { marginTop: 12 }]}>Text follows your Android display and font-size settings. Buttons use generous touch areas and the app respects reduced-motion preferences.</Text>
    </> : null}

    {page === 'weather' ? <>
      <Card style={{ padding: 16 }}><Text style={type.title}>Weather location</Text><Text style={[type.small, { marginTop: 5 }]}>Weather refreshes when you open CrownFlow after 7:00 a.m. or 2:00 p.m. has passed, or whenever you manually refresh. No background location or continuous tracking is used.</Text>
      {weather?.city ? <View style={{ marginTop: 14 }}><Text style={type.label}>CURRENT CITY</Text><Text style={[type.heading, { marginTop: 4 }]}>{weather.city.name}{weather.city.country ? `, ${weather.city.country}` : ''}</Text></View> : <Text style={[type.small, { marginTop: 14 }]}>No city selected yet.</Text>}
      <Btn label="Use current location once" icon="navigate-outline" onPress={onWeatherUseLocation} style={{ marginTop: 14 }} small /><Text style={[type.small, { marginTop: 7 }]}>Android asks for approximate location permission only when you tap this button. CrownFlow rounds that one reading to an approximate city area, then stores only the selected city coordinates for weather requests.</Text>
      <SectionHeader title="Or search manually" /><View style={{ flexDirection: 'row', alignItems: 'center' }}><TextInput value={query} onChangeText={setQuery} placeholder="Search city" placeholderTextColor={colors.faint} style={styles.searchInput} returnKeyType="search" onSubmitEditing={search} /><Btn label="Search" small kind="secondary" onPress={search} disabled={cityBusy} style={{ marginLeft: 8 }} /></View>
      {cityBusy ? <ActivityIndicator color={colors.gold} style={{ marginTop: 12 }} /> : null}{cityError ? <Text style={[type.small, { marginTop: 9, color: colors.pink }]}>{cityError}</Text> : null}
      {cityResults.map((city) => <Pressable key={city.id} onPress={() => { onWeatherSelect(city); setCityResults([]); setQuery(''); }} style={styles.cityResult}><View style={{ flex: 1 }}><Text style={type.title}>{city.name}</Text><Text style={type.small}>{[city.admin, city.country].filter(Boolean).join(', ')}</Text></View><Icon name="chevron-forward" color={colors.faint} /></Pressable>)}
      <Btn label="Refresh weather now" icon="refresh" kind="quiet" small onPress={() => weather?.city && onWeatherSelect(weather.city)} style={{ marginTop: 14 }} />
      <View style={styles.switchRow}><View style={{ flex: 1, paddingRight: 12 }}><Text style={type.title}>Weather change alerts</Text><Text style={type.small}>Optional notification up to 30 minutes before a meaningful forecast change. Small hourly variations are ignored.</Text></View><Switch {...SWITCH} value={!!settings.weatherChangeAlerts} onValueChange={(v) => onChange({ weatherChangeAlerts: v })} thumbColor={settings.weatherChangeAlerts ? colors.gold : colors.muted} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}><Text style={type.small}>Weather data by </Text><Text onPress={() => Linking.openURL('https://open-meteo.com/')} style={[type.small, { color: colors.gold }]}>Open-Meteo.com</Text><Text style={type.small}> · </Text><Text onPress={() => Linking.openURL('https://creativecommons.org/licenses/by/4.0/')} style={[type.small, { color: colors.gold }]}>CC BY 4.0</Text><Text style={[type.small, { width: '100%', marginTop: 4 }]}>City lookup uses Android’s built-in geocoder.</Text></View></Card>
    </> : null}

    {page === 'data' ? <>
      <Card><Text style={type.title}>Export a backup</Text><Text style={[type.small, { marginTop: 5 }]}>Share a JSON backup containing your tasks, task history, Focus history and settings. Store it somewhere private; it may contain personal routine information and your PC pairing secret.</Text><Btn label="Export CrownFlow data" icon="share-outline" small onPress={onExport} style={{ marginTop: 14 }} /></Card>
      <SectionHeader title="Xiaomi and Redmi battery settings" /><Card><Text style={[type.small, { color: colors.text, lineHeight: 21 }]}>For reliable reminders on some Xiaomi/Redmi phones, you may need to allow Autostart and set CrownFlow's battery mode to No restrictions. These controls are managed by Android/MIUI, not CrownFlow. Do not disable system battery optimization for ordinary use unless reminders are being delayed.</Text><Btn label="Open app settings" icon="open-outline" kind="secondary" small onPress={() => Linking.openSettings()} style={{ marginTop: 12 }} /></Card>
      <SectionHeader title="Developer testing" /><Card><Text style={[type.small, { color: colors.text, lineHeight: 20 }]}>Temporary testing control. This clears test tasks, task history, active timers and any active walk session. Your settings and PC pairing are preserved.</Text><Btn label="Reset test data" kind="danger" small onPress={() => Alert.alert('Reset CrownFlow test data?', 'This permanently clears all tasks and task history on this phone. Your settings and PC pairing will remain.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset data', style: 'destructive', onPress: onResetTestData }])} style={{ marginTop: 12 }} /></Card>
      <SectionHeader title="Troubleshooting" /><Card>{lastError ? <><Text style={type.small}>Last problem, {lastError.at}</Text><Text selectable style={[type.small, { color: colors.text, marginTop: 6 }]}>{lastError.message}{'\n'}{(lastError.stack || '').slice(0, 500)}</Text><Btn label="Clear" kind="quiet" small onPress={() => { clearLastError(); setLastError(null); }} style={{ marginTop: 12 }} /></> : <Text style={type.small}>No problems recorded.</Text>}</Card>
    </> : null}
  </ScrollView></ScreenIn></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  menuRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  menuValue: { color: colors.muted, fontSize: 12, marginRight: 7 },
  label: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.panel, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.line },
  segBtn: { flexGrow: 1, minWidth: 62, paddingVertical: 12, paddingHorizontal: 5, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: colors.gold },
  segText: { fontSize: 13, fontWeight: '800', color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  searchInput: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.panel },
  cityResult: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 9 },
});
