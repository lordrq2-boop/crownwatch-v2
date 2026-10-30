import React, { useCallback, useEffect, useState } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { Btn, Icon, IconBadge, ProgressRing, useInsets } from '../ui';
import { colors, fonts, type } from '../theme';
import { fmtClockDuration } from '../dates';
import { fmtSteps } from '../categories';
import { stepsDuring } from '../health';

const SESSION_MS = 30 * 60 * 1000;

export default function WalkScreen({ session, onBack, onFinish }) {
  const insets = useInsets();
  const [now, setNow] = useState(Date.now());
  const [sessionSteps, setSessionSteps] = useState(null);
  const refreshSessionSteps = useCallback(async () => {
    const count = await stepsDuring(session.startedAt, new Date());
    setSessionSteps(count);
  }, [session.startedAt]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    refreshSessionSteps();
    const refreshId = setInterval(refreshSessionSteps, 10 * 60 * 1000);
    const appStateSub = AppState.addEventListener('change', (value) => { if (value === 'active') refreshSessionSteps(); });
    return () => { clearInterval(id); clearInterval(refreshId); appStateSub.remove(); };
  }, [refreshSessionSteps]);

  const remaining = Math.max(0, session.expiresAt - now);
  const elapsed = Math.max(0, SESSION_MS - remaining);
  const gained = sessionSteps;
  const complete = remaining <= 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
      <View style={{ alignItems: 'center' }}>
        <IconBadge name="walk-outline" size={64} />
        <Text style={[styles.title, { marginTop: 14 }]}>Walk session</Text>
        <Text style={type.small}>{complete ? 'Your 30-minute walk session has ended.' : 'A separate activity session. It does not complete a task.'}</Text>
      </View>

      <View style={styles.ringWrap}>
        <ProgressRing size={250} stroke={15} progress={Math.min(1, elapsed / SESSION_MS)}>
          <Text style={styles.time}>{fmtClockDuration(remaining)}</Text>
          <Text style={type.label}>{complete ? 'TIME UP' : 'REMAINING'}</Text>
        </ProgressRing>
      </View>

      <View style={styles.metric}>
        <Icon name="footsteps-outline" size={25} color={colors.gold} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.steps}>{gained == null ? '—' : fmtSteps(gained)}</Text>
          <Text style={type.small}>Additional steps during this session</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />
      {complete ? (
        <Btn label="End walk" icon="checkmark" onPress={onFinish} />
      ) : (
        <>
          <Text style={[type.small, { textAlign: 'center', marginBottom: 14 }]}>Health Connect provides steps recorded during this session. CrownWatch refreshes the count every 10 minutes while this screen is open. The session expires after 30 minutes.</Text>
          <Btn label="Finish walk now" onPress={onFinish} />
          <Btn label="Back to Home" kind="quiet" small onPress={onBack} style={{ marginTop: 10 }} />
        </>
      )}
    </View>
  );
}

export { SESSION_MS as WALK_SESSION_MS };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground, paddingHorizontal: 24 },
  title: { fontFamily: fonts.pixel, fontSize: 30, color: colors.text, textAlign: 'center' },
  ringWrap: { alignItems: 'center', marginTop: 42 },
  time: { fontSize: 38, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  metric: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 18, marginTop: 34 },
  steps: { fontSize: 30, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
});
