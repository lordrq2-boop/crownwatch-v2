import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

// Every animation checks this switch, so Settings > Animations turns them all off.
export const AnimContext = createContext(true);
export const useAnimOn = () => useContext(AnimContext);

export const tick = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) {} };
export const select = () => { try { Haptics.selectionAsync().catch(() => {}); } catch (e) {} };
export const success = () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) {} };

// Slides up and fades in when it appears. Use `delay` to stagger a list.
export function FadeUp({ delay = 0, y = 18, duration = 460, style, children }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(on ? 0 : 1)).current;
  useEffect(() => {
    if (!on) return;
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Whole-screen entrance for pages that open on top (slide up and fade).
export function ScreenIn({ children }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(on ? 0 : 1)).current;
  useEffect(() => {
    if (!on) return;
    Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

const APressable = Animated.createAnimatedComponent(Pressable);

// A pressable that springs down when touched.
export function Tap({ onPress, style, children, disabled, haptic = false, scale = 0.96, ...rest }) {
  const on = useAnimOn();
  const s = useRef(new Animated.Value(1)).current;
  const to = (value) => Animated.spring(s, { toValue: value, useNativeDriver: true, speed: 50, bounciness: 7 }).start();
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={() => on && to(scale)}
      onPressOut={() => on && to(1)}
      onPress={(e) => { if (haptic) tick(); if (onPress) onPress(e); }}
      style={[style, { transform: [{ scale: s }] }]}
    >
      {children}
    </APressable>
  );
}

// A number that counts up to its value.
export function CountUp({ value, style, suffix = '', duration = 800 }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(on ? 0 : value)).current;
  const [txt, setTxt] = useState(on ? 0 : value);
  useEffect(() => {
    const id = v.addListener(({ value: n }) => setTxt(Math.round(n)));
    if (on) Animated.timing(v, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    else v.setValue(value);
    return () => v.removeListener(id);
  }, [value, on]);
  return <Text style={style}>{txt}{suffix}</Text>;
}

// Slow breathing glow, used behind the progress ring.
export function Pulse({ style, color, size }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.2] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.12] }) }] }, style]}
    />
  );
}

// Small wiggle, used on the streak flame.
export function Wiggle({ children }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(1400),
      Animated.timing(v, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(v, { toValue: -1, duration: 220, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on]);
  return <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) }] }}>{children}</Animated.View>;
}

// Springs from nothing to full size.
export function Pop({ delay = 0, children, style }) {
  const on = useAnimOn();
  const v = useRef(new Animated.Value(on ? 0 : 1)).current;
  useEffect(() => {
    if (!on) return;
    Animated.spring(v, { toValue: 1, delay, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[style, { transform: [{ scale: v }], opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }) }]}>{children}</Animated.View>;
}
