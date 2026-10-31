import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Linking, Alert } from 'react-native';
import { Btn, Card, Icon, IconBadge, Pill, SectionHeader, useInsets } from '../ui';
import { ScreenIn } from '../anim';
import { colors, radius, type } from '../theme';
import { clearLastError, readLastError } from '../errors';
import { healthMessage } from '../health';

function Row({ icon, title, sub, right, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <IconBadge name={icon} size={38} tone="muted" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={type.title}>{title}</Text>
        {sub ? <Text style={type.small}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Segment({ options, value, onChange }) {
  return (
    <View style={styles.segment}>
      {options.map(([k, label]) => (
        <Pressable key={String(k)} onPress={() => onChange(k)} style={[styles.segBtn, value === k && styles.segOn]}>
          <Text style={[styles.segText, value === k && { color: colors.ink }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const SWITCH = { trackColor: { true: colors.goldDeep, false: colors.panelHi } };

export default function SettingsScreen({ paired, notif, testMsg, settings, health, stepGoal, onBack, onPair, onRecheck, onTest, onChange, onPickRingtone, onConnectHealth, onRefreshHealth, onOpenHealth, onResetTestData, focusSettings, onFocusChange }) {
  const insets = useInsets();
  const [lastError, setLastError] = useState(null);
  useEffect(() => { readLastError().then(setLastError); }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={{ width: 40 }}><Icon name="chevron-back" size={26} /></Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScreenIn>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <SectionHeader title="Daily code" style={{ marginTop: 4 }} />
          <Card style={{ paddingVertical: 4 }}>
            <Row
              icon="shield-checkmark-outline"
              title="PC key tool"
              sub={paired ? 'Paired. Today\'s code from your PC is accepted.' : 'Not paired yet. Scan the pairing code from your PC.'}
              right={paired ? <Pill label="Paired" tone="gold" icon="checkmark" /> : <Pill label="Not paired" tone="pink" />}
              last
            />
          </Card>
          <Btn label={paired ? 'Pair again' : 'Pair with PC key tool'} kind={paired ? 'quiet' : 'primary'} icon="scan-outline" onPress={onPair} style={{ marginTop: 12 }} small />

          <SectionHeader title="Reminders" />
          <Card style={{ paddingVertical: 4 }}>
            <Row
              icon="notifications-outline"
              title="Notifications"
              sub={notif.ok ? 'On. You get one at the task time, then repeats until it is done.' : notif.reason}
              right={<Pill label={notif.ok ? 'On' : 'Off'} tone={notif.ok ? 'gold' : 'pink'} />}
            />
            <Row
              icon="alarm-outline"
              title="Exact timing"
              sub={notif.exact ? 'Reminders arrive on the minute.' : 'Not allowed. Reminders can arrive a few minutes late.'}
              right={<Pill label={notif.exact ? 'On' : 'Off'} tone={notif.exact ? 'gold' : 'pink'} />}
              last
            />
          </Card>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <Btn label="Check again" kind="quiet" small onPress={onRecheck} />
            <Btn label="Send a test reminder" kind="quiet" small onPress={onTest} style={{ marginLeft: 8 }} />
          </View>
          {testMsg ? <Text style={[type.small, { marginTop: 10 }]}>{testMsg}</Text> : null}

          <Text style={[styles.label, { marginTop: 22 }]}>Ringing sound</Text>
          <Segment options={[['jingle', 'CrownFlow jingle'], ['phone', 'Phone ringtone']]} value={settings.sound} onChange={(v) => onChange({ sound: v })} />
          {settings.sound === 'jingle' ? (
            <>
              <Text style={[styles.label, { marginTop: 18 }]}>How long it rings</Text>
              <Segment options={[[10, '10 seconds'], [20, '20 seconds'], [30, '30 seconds']]} value={settings.ringSeconds} onChange={(v) => onChange({ ringSeconds: v })} />
            </>
          ) : (
            <View style={{ marginTop: 14 }}>
              <Btn label="Choose your phone ringtone" icon="musical-notes-outline" kind="secondary" small onPress={onPickRingtone} />
              <Text style={[type.small, { marginTop: 8 }]}>Opens Android's sound list. Pick any ringtone or alarm tone, then come back. Until you pick one it plays the phone's default notification sound.</Text>
            </View>
          )}
          <Text style={[type.small, { marginTop: 10 }]}>It rings at your phone's Alarm volume. Opening the app silences it.</Text>

          <Text style={[styles.label, { marginTop: 18 }]}>Repeat every</Text>
          <Segment options={[[5, '5 min'], [10, '10 min'], [15, '15 min']]} value={settings.nagMinutes} onChange={(v) => onChange({ nagMinutes: v })} />

          <Card style={{ paddingVertical: 4, marginTop: 18 }}>
            <Row
              icon="flash-outline"
              title="Extra reliable delivery"
              sub="Use this if reminders arrive late on your phone. It shows a small alarm icon in the status bar."
              right={<Switch {...SWITCH} value={!!settings.reliable} onValueChange={(v) => onChange({ reliable: v })} thumbColor={settings.reliable ? colors.gold : colors.muted} />}
              last
            />
          </Card>

          <SectionHeader title="Focus and Pomodoro" />
          <Card>
            <Text style={styles.label}>Daily focus goal</Text>
            <Segment options={[[60, '1 hour'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours']]} value={focusSettings?.dailyGoalMinutes || 120} onChange={(v) => onFocusChange({ dailyGoalMinutes: v })} />
            <Text style={[styles.label, { marginTop: 18 }]}>Weekly focus goal</Text>
            <Segment options={[[300, '5 hours'], [600, '10 hours'], [900, '15 hours'], [1200, '20 hours']]} value={focusSettings?.weeklyGoalMinutes || 600} onChange={(v) => onFocusChange({ weeklyGoalMinutes: v })} />
            <Text style={[styles.label, { marginTop: 18 }]}>Focus session length</Text>
            <Segment options={[[20, '20 min'], [25, '25 min'], [30, '30 min'], [45, '45 min']]} value={focusSettings?.focusMinutes || 25} onChange={(v) => onFocusChange({ focusMinutes: v })} />
            <Text style={[styles.label, { marginTop: 18 }]}>Short break</Text>
            <Segment options={[[5, '5 min'], [10, '10 min']]} value={focusSettings?.shortBreakMinutes || 5} onChange={(v) => onFocusChange({ shortBreakMinutes: v })} />
            <Text style={[styles.label, { marginTop: 18 }]}>Long break</Text>
            <Segment options={[[15, '15 min'], [20, '20 min'], [30, '30 min']]} value={focusSettings?.longBreakMinutes || 15} onChange={(v) => onFocusChange({ longBreakMinutes: v })} />
            <Text style={[type.small, { marginTop: 10 }]}>A long break follows every fourth completed focus session. Break time is not counted as focus time.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ flex: 1, paddingRight: 12 }}><Text style={type.title}>Play ambient sound during breaks</Text><Text style={type.small}>Keep your selected background sound playing during short and long breaks.</Text></View>
              <Switch {...SWITCH} value={focusSettings?.ambientDuringBreaks !== false} onValueChange={(v) => onFocusChange({ ambientDuringBreaks: v })} thumbColor={focusSettings?.ambientDuringBreaks !== false ? colors.gold : colors.muted} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ flex: 1, paddingRight: 12 }}><Text style={type.title}>Weekly review reminder</Text><Text style={type.small}>A reminder every Monday. Off by default.</Text></View>
              <Switch {...SWITCH} value={!!focusSettings?.weeklyReviewNotification} onValueChange={(v) => onFocusChange({ weeklyReviewNotification: v })} thumbColor={focusSettings?.weeklyReviewNotification ? colors.gold : colors.muted} />
            </View>
            {focusSettings?.weeklyReviewNotification ? <>
              <Text style={[styles.label, { marginTop: 14 }]}>Reminder time</Text>
              <Segment options={[[8, '8 AM'], [12, '12 PM'], [17, '5 PM'], [19, '7 PM'], [20, '8 PM']]} value={focusSettings?.weeklyReviewHour ?? 19} onChange={(v) => onFocusChange({ weeklyReviewHour: v })} />
            </> : null}
          </Card>

          <SectionHeader title="Health Connect" />
          <Card style={{ paddingVertical: 4 }}>
            <Row
              icon="heart-outline"
              title="Activity data"
              sub={health.state === 'ready' ? 'Connected. CrownFlow reads the health measurements you allow.' : healthMessage(health) || 'Checking Health Connect...'}
              right={<Pill label={health.state === 'ready' ? 'Connected' : 'Not connected'} tone={health.state === 'ready' ? 'gold' : 'pink'} />}
            />
            <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
              {[
                ['Steps', health.permissions?.steps],
                ['Active calories', health.permissions?.calories],
                ['Distance', health.permissions?.distance],
                ['Body weight', health.permissions?.weight],
              ].map(([label, allowed]) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={type.small}>{label}</Text>
                  <Pill label={allowed ? 'Allowed' : 'Not allowed'} tone={allowed ? 'gold' : 'muted'} />
                </View>
              ))}
            </View>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
            <Btn label="Connect / update access" icon="link-outline" small onPress={onConnectHealth} />
            <Btn label="Refresh data" kind="quiet" small onPress={onRefreshHealth} style={{ marginLeft: 8 }} />
            <Btn label="Open Health Connect" kind="quiet" small onPress={onOpenHealth} style={{ marginTop: 8 }} />
          </View>
          <Text style={[type.small, { marginTop: 10 }]}>CrownFlow reads only the measurements listed above. The data comes from Health Connect and the apps or devices that share data with it.</Text>

          <Text style={[styles.label, { marginTop: 22 }]}>Daily step goal</Text>
          <Segment options={[[3000, '3,000'], [5000, '5,000'], [8000, '8,000'], [10000, '10,000']]} value={stepGoal} onChange={(v) => onChange({ stepGoal: v })} />

          <SectionHeader title="Xiaomi and Redmi phones" />
          <Card>
            <Text style={[type.small, { color: colors.text, lineHeight: 21 }]}>
              Xiaomi can silence apps that are not open. Do these three things once:{'\n'}
              1. Open the app settings below, tap Autostart, switch it on.{'\n'}
              2. Tap Battery saver there and choose No restrictions.{'\n'}
              3. Open the recent apps screen, press and hold the CrownFlow card, tap the lock icon.{'\n'}
              The app cannot see these switches, so there is no tick here. Use "Send a test reminder" to check.
            </Text>
            <Btn label="Open app settings" icon="open-outline" kind="secondary" small onPress={() => Linking.openSettings()} style={{ marginTop: 12 }} />
          </Card>

          <SectionHeader title="Preferences" />
          <Card style={{ paddingVertical: 4 }}>
            <Row
              icon="sparkles-outline"
              title="Animations"
              sub="Motion and haptic taps"
              right={<Switch {...SWITCH} value={settings.animations} onValueChange={(v) => onChange({ animations: v })} thumbColor={settings.animations ? colors.gold : colors.muted} />}
              last
            />
          </Card>

          <SectionHeader title="Developer testing" />
          <Card>
            <Text style={[type.small, { color: colors.text, lineHeight: 20 }]}>Temporary testing control. This clears test tasks, task history, active timers and any active walk session. Your ringtone, reminder preferences and PC pairing are preserved.</Text>
            <Btn label="Reset test data" kind="danger" small onPress={() => Alert.alert('Reset CrownFlow test data?', 'This permanently clears all tasks and task history on this phone. Your settings and PC pairing will remain.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset data', style: 'destructive', onPress: onResetTestData }])} style={{ marginTop: 12 }} />
          </Card>

          <SectionHeader title="Troubleshooting" />
          <Card>
            {lastError ? (
              <>
                <Text style={type.small}>Last problem, {lastError.at}</Text>
                <Text selectable style={[type.small, { color: colors.text, marginTop: 6 }]}>{lastError.message}{'\n'}{(lastError.stack || '').slice(0, 500)}</Text>
                <Btn label="Clear" kind="quiet" small onPress={() => { clearLastError(); setLastError(null); }} style={{ marginTop: 12 }} />
              </>
            ) : (
              <Text style={type.small}>No problems recorded. If the app ever closes by itself, open this screen and screenshot anything shown here.</Text>
            )}
          </Card>
          <Text style={[type.small, { textAlign: 'center', marginTop: 24 }]}>CrownFlow 0.8</Text>
        </ScrollView>
      </ScreenIn>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  label: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  segment: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.line },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: colors.gold },
  segText: { fontSize: 14, fontWeight: '800', color: colors.text },
});
