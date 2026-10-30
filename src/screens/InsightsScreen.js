import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, ScrollView, StyleSheet } from 'react-native';
import { Card, Icon, IconBadge, SectionHeader, useInsets } from '../ui';
import { CountUp, FadeUp, useAnimOn } from '../anim';
import { colors, radius, type } from '../theme';
import { categoryOf } from '../categories';
import { DAY_LETTERS, weekdayIndex } from '../dates';
import { categoryBreakdown, completionRate, lastDays, onTimeRate, streaks, totalDone, weekSummary } from '../stats';

function Stat({ icon, label, value, suffix = '', sub, delay }) {
  return (
    <FadeUp delay={delay} style={styles.stat}>
      <Icon name={icon} size={20} color={colors.gold} />
      {typeof value === 'number' ? <CountUp value={value} suffix={suffix} style={[type.big, { marginTop: 10 }]} /> : <Text style={[type.big, { marginTop: 10 }]}>{value}</Text>}
      <Text style={type.label}>{label}</Text>
      {sub ? <Text style={[type.small, { marginTop: 2 }]}>{sub}</Text> : null}
    </FadeUp>
  );
}

// Seven bars that grow up from the bottom.
function Bars({ days }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(on ? 0 : 1)).current;
  useEffect(() => {
    if (on) Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, []);
  const H = 110;
  return (
    <View>
      <View style={styles.barRow}>
        {days.map((d) => {
          const r = d.score.total ? d.score.done / d.score.total : 0;
          const target = Math.max(6, r * H);
          const none = d.score.total === 0;
          return (
            <View key={d.key} style={styles.barTrack}>
              <Animated.View style={{ height: v.interpolate({ inputRange: [0, 1], outputRange: [0, target] }), borderRadius: 8, backgroundColor: none ? colors.line : d.score.missed ? colors.pink : colors.gold, opacity: none ? 0.5 : 1 }} />
            </View>
          );
        })}
      </View>
      <View style={styles.barLabels}>
        {days.map((d) => <Text key={d.key} style={styles.barLabel}>{DAY_LETTERS[weekdayIndex(d.date)]}</Text>)}
      </View>
    </View>
  );
}

// Last 35 days as squares that fade in one after another.
function Heat({ days }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(on ? 0 : 1)).current;
  useEffect(() => {
    if (on) Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  return (
    <View style={styles.heat}>
      {days.map((d, i) => {
        const s = d.score;
        let bg = colors.panelHi, op = 1;
        if (s.total > 0) {
          const r = s.done / s.total;
          if (s.missed + s.skipped > 0 && r === 0) { bg = colors.pink; op = 0.7; }
          else { bg = colors.gold; op = 0.25 + 0.75 * r; }
        }
        const start = (i / days.length) * 0.7;
        const fade = v.interpolate({ inputRange: [start, start + 0.3], outputRange: [0, 1], extrapolate: 'clamp' });
        return <Animated.View key={d.key} style={[styles.cell, { backgroundColor: bg, opacity: Animated.multiply(fade, op) }]} />;
      })}
    </View>
  );
}

export default function InsightsScreen({ state, now }) {
  const insets = useInsets();
  const st = streaks(state, now);
  const ws = weekSummary(state, now);
  const rate = completionRate(state, now, 30);
  const onTime = onTimeRate(state, now, 30);
  const bars = lastDays(state, now, 7);
  const heat = lastDays(state, now, 35);
  const cats = categoryBreakdown(state, now, 30);
  const empty = state.tasks.length === 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <FadeUp>
        <Text style={type.display}>Insights</Text>
        <Text style={[type.small, { marginTop: 4 }]}>How consistent you have been.</Text>
      </FadeUp>

      {empty ? (
        <Card style={{ alignItems: 'center', paddingVertical: 36, marginTop: 20 }}>
          <IconBadge name="stats-chart-outline" size={60} />
          <Text style={[type.title, { marginTop: 14 }]}>No data yet</Text>
          <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>Add tasks and finish a few days to see your trends.</Text>
        </Card>
      ) : (
        <>
          <View style={styles.grid}>
            <Stat icon="flame" label="STREAK" value={st.current} sub={`Best ${st.best} days`} delay={80} />
            <Stat icon="calendar-outline" label="THIS WEEK" value={`${ws.completeDays} of ${ws.activeDays}`} sub="days fully done" delay={140} />
            <Stat icon="trending-up" label="COMPLETION" value={rate === null ? '-' : Math.round(rate * 100)} suffix="%" sub="last 30 days" delay={200} />
            <Stat icon="time-outline" label="ON TIME" value={onTime === null ? '-' : Math.round(onTime * 100)} suffix="%" sub="finished by deadline" delay={260} />
          </View>

          <FadeUp delay={320}>
            <SectionHeader title="Last 7 days" />
            <Card><Bars days={bars} /></Card>
          </FadeUp>

          <FadeUp delay={400}>
            <SectionHeader title="Last 5 weeks" right={`${totalDone(state)} tasks done in total`} />
            <Card><Heat days={heat} /></Card>
          </FadeUp>

          {cats.length > 0 ? (
            <FadeUp delay={480}>
              <SectionHeader title="By activity" right="last 30 days" />
              <Card>
                {cats.map((c, i) => {
                  const r = c.total ? c.done / c.total : 0;
                  return (
                    <View key={c.category} style={{ marginTop: i === 0 ? 0 : 16 }}>
                      <View style={styles.catHead}>
                        <Icon name={categoryOf(c.category).icon} size={18} color={colors.gold} />
                        <Text style={[type.body, { flex: 1, marginLeft: 10 }]}>{categoryOf(c.category).label}</Text>
                        <Text style={type.small}>{c.done} of {c.total}</Text>
                      </View>
                      <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(r * 100)}%` }]} /></View>
                    </View>
                  );
                })}
              </Card>
            </FadeUp>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
  stat: { width: '48%', backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 12 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', height: 110, alignItems: 'flex-end' },
  barTrack: { width: 30, height: 110, justifyContent: 'flex-end', backgroundColor: colors.panelHi, borderRadius: 8 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  barLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, width: 30, textAlign: 'center' },
  heat: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '12.4%', aspectRatio: 1, borderRadius: 6, marginBottom: 6 },
  catHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.panelHi, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
});
