import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Card, Icon, IconBadge, ProgressRing, SectionHeader, useInsets } from '../ui';
import { CountUp, FadeUp, Pop, Pulse, Tap, Wiggle } from '../anim';
import TaskCard from '../TaskCard';
import { colors, fonts, radius, type } from '../theme';
import { DAY_LETTERS, fmtLongDate, fmtCountdown, greeting } from '../dates';

export default function TodayScreen({ items, strip, streak, now, steps, notif, needsPlan, onOpenTask, onAction, onAdd, onSettings, onPlan }) {
  const insets = useInsets();
  const total = items.length;
  const done = items.filter((i) => i.status === 'done').length;
  const resolved = items.filter((i) => i.status === 'done' || i.status === 'skipped').length;
  const pct = total === 0 ? 0 : done / total;
  const next = items.find((i) => i.status === 'upcoming');
  const overdue = items.find((i) => i.status === 'overdue');

  let headline = 'Nothing planned today';
  let sub = 'Add a task to get started.';
  if (total > 0) {
    if (overdue) { headline = overdue.task.title; sub = 'Overdue. Tap Finish when it is done.'; }
    else if (next) { headline = next.task.title; sub = `Next, in ${fmtCountdown(next.deadline - now)}`; }
    else { headline = resolved === total ? 'All done for today' : 'Day complete'; sub = `${done} of ${total} finished`; }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <FadeUp>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>CrownWatch</Text>
            <Text style={type.small}>{greeting(now)}</Text>
          </View>
          {streak.current > 0 ? (
            <Pop>
              <View style={styles.streak}>
                <Wiggle><Icon name="flame" size={16} color={colors.gold} /></Wiggle>
                <Text style={styles.streakText}>{streak.current}</Text>
              </View>
            </Pop>
          ) : null}
          <Tap onPress={onSettings} haptic style={styles.gear} accessibilityLabel="Settings">
            <Icon name="settings-outline" size={22} color={colors.text} />
          </Tap>
        </View>
        <Text style={[type.display, { marginTop: 14 }]}>{fmtLongDate(now)}</Text>
      </FadeUp>

      <FadeUp delay={90}>
        <LinearGradient colors={['#2A2210', '#17171D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.ringBox}>
            <Pulse color={colors.gold} size={124} />
            <ProgressRing size={104} stroke={11} progress={pct}>
              {total === 0 ? <Text style={styles.ringText}>-</Text> : <CountUp value={Math.round(pct * 100)} suffix="%" style={styles.ringText} />}
            </ProgressRing>
          </View>
          <View style={{ flex: 1, marginLeft: 18 }}>
            <Text style={type.label}>TODAY</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{headline}</Text>
            <Text style={[type.small, { marginTop: 4 }]}>{sub}</Text>
          </View>
        </LinearGradient>
      </FadeUp>

      <FadeUp delay={170}>
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
        <FadeUp delay={230}>
          <Tap onPress={onSettings} scale={0.98} style={styles.banner}>
            <Icon name="notifications-off-outline" size={20} color={colors.pink} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={type.title}>Reminders are off</Text>
              <Text style={type.small} numberOfLines={2}>{notif.reason}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.muted} />
          </Tap>
        </FadeUp>
      ) : null}

      {needsPlan ? (
        <FadeUp delay={260}>
          <Card style={{ marginTop: 16, borderColor: colors.goldLine }}>
            <Text style={type.title}>Plan your week</Text>
            <Text style={[type.small, { marginTop: 4 }]}>Nothing is scheduled for this week yet. Carry over last week's tasks or add new ones.</Text>
            <Btn label="Plan this week" onPress={onPlan} style={{ marginTop: 12 }} small />
          </Card>
        </FadeUp>
      ) : null}

      <SectionHeader title="Today's plan" right={total ? `${resolved} of ${total}` : undefined} />
      {total === 0 ? (
        <FadeUp delay={300}>
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <IconBadge name="sparkles-outline" size={64} />
            <Text style={[type.title, { marginTop: 14 }]}>A clear day</Text>
            <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>Nothing is scheduled for today.</Text>
            <Btn label="Add a task" onPress={onAdd} small style={{ marginTop: 16 }} />
          </Card>
        </FadeUp>
      ) : (
        items.map((it, i) => (
          <FadeUp key={it.task.id} delay={280 + Math.min(i, 8) * 60}>
            <TaskCard item={it} now={now} steps={steps} onPress={() => onOpenTask(it.task, it.dateKey)} onAction={() => onAction(it)} />
          </FadeUp>
        ))
      )}
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
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.goldLine, padding: 20, marginTop: 18 },
  ringBox: { width: 124, height: 124, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  strip: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, paddingHorizontal: 12, marginTop: 14 },
  day: { alignItems: 'center' },
  dayLetter: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.faint },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.pinkSoft, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.pink, padding: 14, marginTop: 14 },
});
