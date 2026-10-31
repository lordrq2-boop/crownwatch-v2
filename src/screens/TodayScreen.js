import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Card, Icon, IconBadge, ProgressRing, SectionHeader, useInsets } from '../ui';
import { CountUp, FadeUp, Pop, Tap, Wiggle } from '../anim';
import TaskCard from '../TaskCard';
import { colors, fonts, radius, type } from '../theme';
import { DAY_LETTERS, fmtLongDate, greeting } from '../dates';
import { fmtSteps } from '../categories';
import { healthMessage } from '../health';
import { elapsedSeconds } from '../focus';
import { weatherLabel, feelsLikeLabel, findNextWeatherChange, getUpcomingForecast, formatForecastTime } from '../weather';

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

export default function TodayScreen({ items, strip, streak, now, activity, stepGoal, health, walkSession, notif, needsPlan, activeTimerItem, onOpenTask, onAction, onAdd, onSettings, onPlan, onConnectHealth, onStartWalk, onResumeTimer, focus, onFocus, weather, refreshing, onRefresh, homeWidgets = {} }) {
  const insets = useInsets();
  const total = items.length;
  const done = items.filter((i) => i.status === 'done').length;
  const resolved = items.filter((i) => i.status === 'done' || i.status === 'skipped').length;
  const pct = total === 0 ? 0 : done / total;
  const steps = activity?.steps;
  const stepProgress = steps == null ? 0 : Math.min(1, steps / Math.max(1, stepGoal));
  const focusMinutes = Math.floor(((focus?.history || []).filter((s) => s.type === 'focus' && new Date(s.startedAt).toDateString() === now.toDateString()).reduce((n, s) => n + (s.actualFocusSeconds || 0), 0) + (focus?.active?.type === 'focus' ? elapsedSeconds(focus.active) : 0)) / 60);
  const focusGoal = focus?.settings?.dailyGoalMinutes || 120;
  const nextWeatherChange = findNextWeatherChange(weather?.data, now);
  const upcomingWeather = getUpcomingForecast(weather?.data, now, 4);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.panel} />}>
      <FadeUp>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={require('../../assets/icon.png')} style={{ width: 30, height: 30, borderRadius: 9, marginRight: 9 }} />
              <Text style={styles.brand}>CrownFlow</Text>
            </View>
            <Text style={type.small}>{greeting(now)}</Text>
          </View>
          {streak.current > 0 ? (
            <Pop><View style={styles.streak}><Wiggle><Icon name="flame" size={16} color={colors.gold} /></Wiggle><Text style={styles.streakText}>{streak.current}</Text></View></Pop>
          ) : null}
          <Tap onPress={onSettings} haptic style={styles.gear} accessibilityLabel="Settings"><Icon name="settings-outline" size={22} color={colors.text} /></Tap>
        </View>
        <Text style={[type.display, { marginTop: 14 }]}>{fmtLongDate(now)}</Text>
      </FadeUp>

      {homeWidgets.weather !== false ? <FadeUp delay={55}>
        <Card style={{ marginTop: 14, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={type.label}>WEATHER</Text>
              <Text style={[type.title, { marginTop: 4 }]}>{weather?.city?.name || 'Set your weather city'}</Text>
              <Text style={[type.small, { marginTop: 2 }]}>{weather?.data?.current ? `${weatherLabel(weather.data.current.weather_code)} · ${feelsLikeLabel(weather.data.current.apparent_temperature)}` : (weather?.error || 'Choose a city in Settings to see local weather.')}</Text>
              {weather?.data?.fetchedAt ? <Text style={[type.small, { marginTop: 3, fontSize: 10 }]}>Updated {new Date(weather.data.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text> : null}
              {weather?.error ? <Text style={{ color: colors.pink, fontSize: 11, marginTop: 3 }}>{weather.error}</Text> : null}
            </View>
            {weather?.data?.current ? <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800' }}>{Math.round(weather.data.current.temperature_2m)}°</Text>
              <Text style={type.small}>Feels {Math.round(weather.data.current.apparent_temperature)}°</Text>
              <Text style={type.small}>H {Math.round(weather.data.daily?.temperature_2m_max?.[0] ?? 0)}° · L {Math.round(weather.data.daily?.temperature_2m_min?.[0] ?? 0)}°</Text>
            </View> : <Icon name="cloud-outline" size={28} color={colors.gold} />}
          </View>
          {weather?.data?.current ? <View style={{ marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Text style={type.label}>WHAT'S NEXT</Text>
            {nextWeatherChange ? <View style={{ marginTop: 7, padding: 11, borderRadius: 12, backgroundColor: nextWeatherChange.severity >= 3 ? '#30221A' : colors.panel }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{nextWeatherChange.title} · {formatForecastTime(nextWeatherChange.at, weather.data, { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
              <Text style={[type.small, { marginTop: 3 }]}>{nextWeatherChange.detail}. {weatherLabel(nextWeatherChange.weatherCode)}{Number.isFinite(nextWeatherChange.temperature) ? `, ${Math.round(nextWeatherChange.temperature)}°` : ''}.</Text>
            </View> : null}
            {upcomingWeather.length ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 }}>
              {upcomingWeather.map((item, index) => <View key={`${item.time}-${index}`} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 10 }}>{formatForecastTime(item.time, weather.data, { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{weatherLabel(item.code)}</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 3 }}>{Number.isFinite(item.temperature) ? `${Math.round(item.temperature)}°` : '—'}</Text>
                {Number(item.rainProbability) >= 30 ? <Text style={{ color: colors.blue || colors.muted, fontSize: 9, marginTop: 2 }}>{Math.round(item.rainProbability)}% rain</Text> : null}
              </View>)}
            </View> : null}
          </View> : null}
        </Card>
      </FadeUp> : null}

      {homeWidgets.activity !== false ? <FadeUp delay={90}>
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
      </FadeUp> : null}

      {homeWidgets.focus !== false ? <FadeUp delay={130}>
        <Card style={{ marginTop: 14, borderColor: colors.goldLine }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={type.label}>FOCUS TODAY</Text>
              <Text style={[type.title, { marginTop: 4 }]}>{focusMinutes} / {focusGoal} focus minutes</Text>
              <Text style={[type.small, { marginTop: 3 }]}>Build momentum with a Pomodoro session.</Text>
            </View>
            <Btn label={focus?.active ? 'Resume Focus' : 'Start Focus'} small onPress={onFocus} />
          </View>
        </Card>
      </FadeUp> : null}

      {homeWidgets.walk !== false ? <FadeUp delay={150}>
        <Btn label={walkSession ? 'Resume walk session' : 'Start a 30-minute walk'} icon="walk-outline" kind={walkSession ? 'secondary' : 'primary'} onPress={onStartWalk} style={{ marginTop: 14 }} />
        {walkSession ? <Text style={[type.small, { marginTop: 6, textAlign: 'center' }]}>A walk session is active. It ends automatically after 30 minutes.</Text> : null}
      </FadeUp> : null}

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

      {homeWidgets.streak !== false ? <FadeUp delay={190}>
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
      </FadeUp> : null}

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
