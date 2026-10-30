import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Icon } from './ui';
import { colors } from './theme';
import { success } from './anim';

const COUNT = 16;
const PALETTE = [colors.gold, colors.pink, '#FFFFFF', colors.gold];

// A short burst shown when a task is finished: ring, check mark and confetti.
export default function Celebration({ onDone }) {
  const t = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const parts = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      angle: (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      dist: 110 + Math.random() * 90,
      size: 7 + Math.random() * 6,
      color: PALETTE[i % PALETTE.length],
      spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    }))
  ).current;

  useEffect(() => {
    success();
    Animated.parallel([
      Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
        Animated.delay(450),
        Animated.timing(pop, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start(() => onDone && onDone());
  }, []);

  const ringScale = t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] });
  const ringOpacity = t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] });

  return (
    <View pointerEvents="none" collapsable={false} style={styles.wrap}>
      <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', width: p.size, height: p.size, borderRadius: p.size / 3, backgroundColor: p.color,
            opacity: t.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist] }) },
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.dist + 40 * 1] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
      <Animated.View style={[styles.badge, { transform: [{ scale: pop }], opacity: pop }]}>
        <Icon name="checkmark" size={54} color={colors.ink} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 50, elevation: 50 },
  ring: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 6, borderColor: colors.gold },
  badge: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', elevation: 8 },
});
