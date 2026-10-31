import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon, useInsets } from './ui';
import { Tap, select, tick, useAnimOn } from './anim';
import { colors } from './theme';

const LEFT_SLOTS = [
  { id: 'today', label: 'Today', icon: 'today-outline', iconOn: 'today' },
  { id: 'week', label: 'Plan', icon: 'list-outline', iconOn: 'list' },
];
const RIGHT_SLOTS = [
  { id: 'focus', label: 'Focus', icon: 'timer-outline', iconOn: 'timer' },
  { id: 'history', label: 'History', icon: 'time-outline', iconOn: 'time' },
  { id: 'insights', label: 'Insights', icon: 'stats-chart-outline', iconOn: 'stats-chart' },
];

function TabItem({ slot, active, onPress }) {
  const on = useAnimOn();
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active && on) {
      Animated.sequence([
        Animated.timing(s, { toValue: 1.3, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(s, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [active]);
  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <Animated.View style={{ transform: [{ scale: s }] }}>
        <Icon name={active ? slot.iconOn : slot.icon} size={24} color={active ? colors.gold : colors.faint} />
      </Animated.View>
      <Text style={[styles.label, active && { color: colors.gold }]}>{slot.label}</Text>
    </Pressable>
  );
}

function Fab({ onPress }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [on]);
  return (
    <View style={styles.fabWrap}>
      <Animated.View pointerEvents="none" style={[styles.fabRing, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />
      <Tap onPress={onPress} haptic scale={0.88} style={styles.fab} accessibilityLabel="Add a task">
        <Icon name="add" size={32} color={colors.ink} />
      </Tap>
    </View>
  );
}

export default function TabBar({ tab, onChange, onAdd }) {
  const insets = useInsets();
  const on = useAnimOn();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const leftWidth = Math.max(0, (width - 64) / 2);
  const leftTabWidth = leftWidth / 2;
  const rightTabWidth = leftWidth / 3;
  const centers = {
    today: leftTabWidth / 2,
    week: leftTabWidth * 1.5,
    focus: leftWidth + 64 + rightTabWidth / 2,
    history: leftWidth + 64 + rightTabWidth * 1.5,
    insights: leftWidth + 64 + rightTabWidth * 2.5,
  };
  const target = centers[tab] == null ? 0 : centers[tab] - 14;

  useEffect(() => {
    if (!width || centers[tab] == null) return;
    if (on) Animated.spring(x, { toValue: target, friction: 8, tension: 120, useNativeDriver: true }).start();
    else x.setValue(target);
  }, [tab, width, on]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? <Animated.View style={[styles.indicator, { transform: [{ translateX: x }] }]} /> : null}
      <View style={styles.group}>
        {LEFT_SLOTS.map((slot) => <TabItem key={slot.id} slot={slot} active={tab === slot.id} onPress={() => { select(); onChange(slot.id); }} />)}
      </View>
      <View style={styles.center}><Fab onPress={onAdd} /></View>
      <View style={styles.group}>
        {RIGHT_SLOTS.map((slot) => <TabItem key={slot.id} slot={slot} active={tab === slot.id} onPress={() => { select(); onChange(slot.id); }} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.panel, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, alignItems: 'center' },
  indicator: { position: 'absolute', top: 0, left: 0, width: 28, height: 3, borderRadius: 2, backgroundColor: colors.gold },
  group: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  center: { width: 64, alignItems: 'center', justifyContent: 'center' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: '700', color: colors.faint, marginTop: 2 },
  fabWrap: { alignItems: 'center', justifyContent: 'center', height: 40 },
  fabRing: { position: 'absolute', top: -34, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.gold },
  fab: {
    position: 'absolute', top: -34, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    borderWidth: 5, borderColor: colors.ground, elevation: 6,
  },
});
