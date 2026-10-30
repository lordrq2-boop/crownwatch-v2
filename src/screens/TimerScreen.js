import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Btn, Icon, IconBadge, ProgressRing, useInsets } from '../ui';
import { Pop, success } from '../anim';
import { colors, fonts, type } from '../theme';
import { categoryOf } from '../categories';
import { fmtClockDuration } from '../dates';

// A timer session. It runs from a saved start time, so closing the app does not pause it.
export default function TimerScreen({ item, session, onFinish, onCancel, onBack }) {
  const insets = useInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const total = session.minutes * 60000;
  const remaining = Math.max(0, session.startedAt + total - now);
  const complete = remaining <= 0;
  const buzzed = useRef(false);
  useEffect(() => {
    if (complete && !buzzed.current) { buzzed.current = true; success(); }
  }, [complete]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ground} />
      <View style={{ alignItems: 'center' }}>
        <IconBadge name={categoryOf(item.task.category).icon} size={56} />
        <Text style={[styles.title, { marginTop: 14 }]} numberOfLines={2}>{item.task.title}</Text>
        <Text style={type.small}>{complete ? 'Time is up. Well done.' : `${session.minutes} minute session`}</Text>
      </View>

      <View style={styles.ringWrap}>
        <ProgressRing size={270} stroke={16} progress={1 - remaining / total}>
          {complete ? <Pop><Icon name="checkmark" size={96} color={colors.gold} /></Pop> : <Text style={styles.time}>{fmtClockDuration(remaining)}</Text>}
        </ProgressRing>
      </View>

      <View style={{ flex: 1 }} />
      {complete ? (
        <>
          <Btn label="Finish" icon="checkmark" onPress={onFinish} />
          <Btn label="Back (keep timer)" kind="quiet" small onPress={onBack} style={{ marginTop: 10 }} />
        </>
      ) : (
        <>
          <Text style={[type.small, { textAlign: 'center', marginBottom: 14 }]}>Keep going. You can leave the app, the timer keeps counting.</Text>
          <Btn label="Back (keep timer running)" kind="quiet" small onPress={onBack} />
          <Btn label="Cancel this session" kind="quiet" small onPress={onCancel} style={{ marginTop: 8 }} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground, paddingHorizontal: 24 },
  title: { fontFamily: fonts.pixel, fontSize: 30, color: colors.text, textAlign: 'center' },
  ringWrap: { alignItems: 'center', marginTop: 36 },
  time: { fontSize: 54, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
});
