import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Linking } from 'react-native';
import { Btn, Card, Icon, IconBadge, Pill, SectionHeader, useInsets } from '../ui';
import { ScreenIn } from '../anim';
import { colors, radius, type } from '../theme';
import { MAX_PASSES, UNDO_WINDOW_MINUTES } from '../planner';
import { clearLastError, readLastError } from '../errors';
import { fmtSteps } from '../categories';
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

export default function SettingsScreen({ paired, notif, testMsg, settings, passesLeft, health, steps, onBack, onPair, onRecheck, onTest, onChange, onPickRingtone, onConnectHealth, onOpenHealth }) {
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
          <Segment options={[['jingle', 'CrownWatch jingle'], ['phone', 'Phone ringtone']]} value={settings.sound} onChange={(v) => onChange({ sound: v })} />
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

          <SectionHeader title="Steps (Health Connect)" />
          <Card style={{ paddingVertical: 4 }}>
            <Row
              icon="footsteps-outline"
              title="Health Connect"
              sub={health.state === 'ready' ? (steps === null || steps === undefined ? 'Connected. Steps could not be read just now.' : `Connected. ${fmtSteps(steps)} steps so far today.`) : healthMessage(health) || 'Checking...'}
              right={<Pill label={health.state === 'ready' ? 'Connected' : 'Not connected'} tone={health.state === 'ready' ? 'gold' : 'pink'} />}
              last
            />
          </Card>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            {health.state !== 'ready' ? <Btn label="Connect" icon="link-outline" small onPress={onConnectHealth} /> : null}
            <Btn label="Open Health Connect" kind="quiet" small onPress={onOpenHealth} style={health.state !== 'ready' ? { marginLeft: 8 } : null} />
          </View>
          <Text style={[type.small, { marginTop: 10 }]}>Health Connect only holds steps that another app records, such as Google Fit or Mi Fitness. If it shows 0, open that app once and allow it to share steps.</Text>

          <SectionHeader title="Xiaomi and Redmi phones" />
          <Card>
            <Text style={[type.small, { color: colors.text, lineHeight: 21 }]}>
              Xiaomi can silence apps that are not open. Do these three things once:{'\n'}
              1. Open the app settings below, tap Autostart, switch it on.{'\n'}
              2. Tap Battery saver there and choose No restrictions.{'\n'}
              3. Open the recent apps screen, press and hold the CrownWatch card, tap the lock icon.{'\n'}
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

          <SectionHeader title="House rules" />
          <Card>
            <Text style={[type.small, { color: colors.text, lineHeight: 20 }]}>
              Tasks are locked once saved. They can be finished, never edited or deleted{UNDO_WINDOW_MINUTES > 0 ? ` (except an undo in the first ${UNDO_WINDOW_MINUTES} minutes)` : ''}.{'\n'}
              Finished days can never be changed.{'\n'}
              You have {MAX_PASSES} skips a week, and {passesLeft} left. Each skip needs a long sentence, different every day.{'\n'}
              The daily code changes every day, so an old screenshot will not work.
            </Text>
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
          <Text style={[type.small, { textAlign: 'center', marginTop: 24 }]}>CrownWatch 0.6</Text>
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
