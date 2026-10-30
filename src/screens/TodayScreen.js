import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Card, Icon, IconBadge, ProgressRing, SectionHeader, useInsets } from '../ui';
import { CountUp, FadeUp, Pop, Tap, Wiggle } from '../anim';
import TaskCard from '../TaskCard';
import { colors, fonts, radius, type } from '../theme';
import { DAY_LETTERS, fmtLongDate, greeting } from '../dates';
import { fmtSteps } from '../categories';
import { healthMessage } from '../health';

const fmtNumber = (n) => n == null ? '—' : Math.round(n).toLocaleString();
const fmtDistance = (m) => m == null ? '—' : `${(m / 1000).toFixed(2)} km`;

function ActivityMetric({ icon, label, value, hint }) {
  return (
    <View style={styles.metric}>
      <Icon name={icon} size={18} color={colors.gold} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
}

export default function TodayScreen({ items, strip, streak, now, activity, stepGoal, health, walkSession, notif, needsPlan, activeTimerItem, onOpenTask, onAction, onAdd, onSettings, onPlan, onConnectHealth, onStartWalk, onResumeTimer }) {
  const insets = useInsets();
  const total = items.length;
  const done = items.filter((i) => i.status === 'done').length;
  const resolved = items.filter((i) => i.status === 'done' || i.status === 'skipped').length;
  const pct = total === 0 ? 0 : done / total;
  const steps = activity?.steps;
  const stepProgress = steps == null ? 0 : Math.min(1, steps / Math.max(1, stepGoal));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <FadeUp>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>CrownWatch</Text>
            <Text style={type.small}>{greeting(now)}</Text>
          </View>
          {streak.current > 0 ? (
            <Pop><View style={styles.streak}><Wiggle><Icon name="flame" size={16} color={colors.gold} /></Wiggle><Text style={styles.streakText}>{streak.current}</Text></View></Pop>
          ) : null}
          <Tap onPress={onSettings} haptic style={styles.gear} accessibilityLabel="Settings"><Icon name="settings-outline" size={22} color={colors.text} /></Tap>
        </View>
        <Text style={[type.display, { marginTop: 14 }]}>{fmtLongDate(now)}</Text>
      </FadeUp>

      <FadeUp delay={90}>
        <LinearGradient colors={['#2A2210', '#17171D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activityCard}>
          <View style={styles.activityTop}>
            <View style={{ flex: 1 }}>
              <Text style={type.label}>TODAY'S ACTIVITY</Text>
              <Text style={styles.activityTitle}>Your movement</Text>
              <Text style={[type.small, { marginTop: 3 }]}>{health?.state === 'ready' ? 'Synced from Health Connect' : healthMessage(health || { state: 'unknown' }) || 'Connect Health Connect to see your activity.'}</Text>
            </View>
            <View style={styles.stepRing}>
              <ProgressRing size={94} stroke={9} progress={stepProgress}>
                <Icon name="footsteps-outline" size={28} color={colors.gold} />
              </ProgressRing>
            </View>
          </View>
          <View style={styles.stepsLine}>
            <Text style={styles.stepsNumber}>{steps == null ? '—' : fmtSteps(steps)}</Text>
            <Text style={styles.stepsGoal}> / {fmtSteps(stepGoal)} steps</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(stepProgress * 100)}%` }]} /></View>
          <View style={styles.metricRow}>
            <ActivityMetric icon="flame-outline" label="ACTIVE KCAL" value={activity?.activeCalories == null ? '—' : `${fmtNumber(activity.activeCalories)}`} />
            <ActivityMetric icon="navigate-outline" label="DISTANCE" value={fmtDistance(activity?.distanceMeters)} />
            <ActivityMetric icon="scale-outline" label="WEIGHT" value={activity?.weightKg == null ? '—' : `${activity.weightKg.toFixed(1)} kg`} hint="Latest" />
          </View>
          {health?.state !== 'ready' ? <Btn label="Connect Health Connect" icon="link-outline" kind="secondary" small onPress={onConnectHealth} style={{ marginTop: 14 }} /> : null}
        </LinearGradient>
      </FadeUp>

      <FadeUp delay={150}>
        <Btn label={walkSession ? 'Resume walk session' : 'Start a 30-minute walk'} icon="walk-outline" kind={walkSession ? 'secondary' : 'primary'} onPress={onStartWalk} style={{ marginTop: 14 }} />
        {walkSession ? <Text style={[type.small, { marginTop: 6, textAlign: 'center' }]}>A walk session is active. It ends automatically after 30 minutes.</Text> : null}
      </FadeUp>

      {activeTimerItem ? (
        <FadeUp delay={175}>
          <Card style={{ marginTop: 12, borderColor: colors.goldLine }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="timer-outline" size={22} color={colors.gold} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={type.title}>Timer in progress</Text>
                <Text style={type.small}>{activeTimerItem.task.title}</Text>
              </View>
              <Btn label="Resume" small onPress={onResumeTimer} />
            </View>
          </Card>
        </FadeUp>
      ) : null}

      <FadeUp delay={190}>
        <View style={styles.strip}>
          {strip.map((d) => {
            const s = d.score;
            const ratio = s.total ? s.done / s.total : 0;
            const missed = !d.isFuture && !d.isToday && s.missed + s.skipped > 0;
            return (
              <View key={d.key} style={styles.day}>
                <Text style={[styles.dayLetter, d.isToday && { color: colors.gold }]}>{DAY_LETTERS[d.index]}</Text>
                <ProgressRing size={36} stroke={4} progress={s.complete ? 1 : ratio} color={missed ? colors.pink : colors.gold} track={d.isToday ? colors.goldLine : colors.panelHi}>
                  {s.complete ? <Icon name="checkmark" size={18} color={colors.gold} /> : missed ? <Icon name="close" size={16} color={colors.pink} /> : <View style={[styles.dot, d.isToday && { backgroundColor: colors.gold }]} />}
                </ProgressRing>
              </View>
            );
          })}
        </View>
      </FadeUp>

      {!notif.ok ? (
        <FadeUp delay={220}>
          <Tap onPress={onSettings} scale={0.98} style={styles.banner}>
            <Icon name="notifications-off-outline" size={20} color={colors.pink} />
            <View style={{ flex: 1, marginLeft: 12 }}><Text style={type.title}>Reminders are off</Text><Text style={type.small} numberOfLines={2}>{notif.reason}</Text></View>
            <Icon name="chevron-forward" size={18} color={colors.muted} />
          </Tap>
        </FadeUp>
      ) : null}

      {needsPlan ? (
        <FadeUp delay={250}>
          <Card style={{ marginTop: 16, borderColor: colors.goldLine }}>
            <Text style={type.title}>Plan your week</Text>
            <Text style={[type.small, { marginTop: 4 }]}>Nothing is scheduled for this week yet. Carry over last week's tasks or add new ones.</Text>
            <Btn label="Plan this week" onPress={onPlan} style={{ marginTop: 12 }} small />
          </Card>
        </FadeUp>
      ) : null}

      <SectionHeader title="Today's plan" right={total ? `${resolved} of ${total}` : undefined} />
      {total === 0 ? (
        <FadeUp delay={290}>
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <IconBadge name="sparkles-outline" size={64} />
            <Text style={[type.title, { marginTop: 14 }]}>A clear day</Text>
            <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>Nothing is scheduled for today.</Text>
            <Btn label="Add a task" onPress={onAdd} small style={{ marginTop: 16 }} />
          </Card>
        </FadeUp>
      ) : items.map((it, i) => (
        <FadeUp key={it.task.id} delay={280 + Math.min(i, 8) * 60}>
          <TaskCard item={it} now={now} onPress={() => onOpenTask(it.task, it.dateKey)} onAction={() => onAction(it)} />
        </FadeUp>
      ))}
      {total > 0 ? <Card style={{ marginTop: 8, padding: 14 }}><Text style={type.small}>Today's task progress</Text><Text style={[type.title, { marginTop: 4 }]}>{done} of {total} completed · {Math.round(pct * 100)}%</Text></Card> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontFamily: fonts.pixel, fontSize: 18, color: colors.gold },
  streak: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, marginRight: 10 },
  streakText: { color: colors.gold, fontWeight: '800', fontSize: 15, marginLeft: 5 },
  gear: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  activityCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.goldLine, padding: 18, marginTop: 18 },
  activityTop: { flexDirection: 'row', alignItems: 'center' },
  activityTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  stepRing: { marginLeft: 10 },
  stepsLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  stepsNumber: { fontSize: 34, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  stepsGoal: { fontSize: 14, color: colors.muted, fontWeight: '700', marginLeft: 5 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.panelHi, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: 7, borderRadius: 4, backgroundColor: colors.gold },
  metricRow: { flexDirection: 'row', marginTop: 16, marginHorizontal: -4 },
  metric: { flex: 1, backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 12, padding: 10, marginHorizontal: 4, minHeight: 92 },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', marginTop: 3, letterSpacing: 0.5 },
  metricHint: { color: colors.faint, fontSize: 10, marginTop: 2 },
  strip: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, paddingHorizontal: 12, marginTop: 14 },
  day: { alignItems: 'center' },
  dayLetter: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.faint },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.pinkSoft, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.pink, padding: 14, marginTop: 14 },
});
