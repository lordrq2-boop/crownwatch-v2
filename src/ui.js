import React from 'react';
import { Animated, Easing, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Tap, useAnimOn } from './anim';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { colors, fonts, radius, type } from './theme';

export const Icon = ({ name, size = 22, color = colors.text, style }) => <Ionicons name={name} size={size} color={color} style={style} />;

export function Btn({ label, onPress, kind = 'primary', disabled, style, icon, small }) {
  const k = btnKinds[kind];
  return (
    <Tap onPress={onPress} disabled={disabled} haptic style={[styles.btn, small && styles.btnSmall, k.box, disabled && { opacity: 0.35 }, style]}>
      {icon ? <Icon name={icon} size={small ? 18 : 20} color={k.text.color} style={{ marginRight: 8 }} /> : null}
      <Text style={[styles.btnText, small && { fontSize: 14 }, k.text]}>{label}</Text>
    </Tap>
  );
}

export function Pill({ label, tone = 'muted', icon }) {
  const t = pillTones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={13} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

export function SectionHeader({ title, right, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={type.heading}>{title}</Text>
      {right ? <Text style={type.small}>{right}</Text> : null}
    </View>
  );
}

// Round icon badge used for task categories.
export function IconBadge({ name, size = 44, tone = 'gold' }) {
  const bg = tone === 'pink' ? colors.pinkSoft : tone === 'muted' ? colors.panelHi : colors.goldSoft;
  const fg = tone === 'pink' ? colors.pink : tone === 'muted' ? colors.muted : colors.gold;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.5} color={fg} />
    </View>
  );
}

const ACircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({ size = 100, stroke = 10, progress = 0, color = colors.gold, track = colors.panelHi, children }) {
  const on = useAnimOn();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const v = React.useRef(new Animated.Value(on ? 0 : p)).current;
  React.useEffect(() => {
    if (on) Animated.timing(v, { toValue: p, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    else v.setValue(p);
  }, [p, on]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [c, 0] })}
          rotation={-90} originX={size / 2} originY={size / 2}
        />
      </Svg>
      {children}
    </View>
  );
}

// Page shell that respects the phone's status bar and gesture bar.
export function useInsets() {
  return useSafeAreaInsets();
}

// Shows the camera only after permission is granted.
export function CameraGate({ children, onCancel }) {
  const [perm, request] = useCameraPermissions();
  if (!perm) return <View style={styles.gate} />;
  if (!perm.granted) {
    return (
      <View style={styles.gate}>
        <IconBadge name="camera-outline" size={64} />
        <Text style={styles.gateTitle}>Camera access needed</Text>
        <Text style={styles.gateBody}>Allow the camera so the app can scan codes and take proof photos.</Text>
        <Btn label="Allow camera" onPress={request} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        {onCancel ? <Btn label="Back" kind="quiet" onPress={onCancel} style={{ marginTop: 8, alignSelf: 'stretch' }} /> : null}
      </View>
    );
  }
  return children;
}

const btnKinds = {
  primary: { box: { backgroundColor: colors.gold }, text: { color: colors.ink } },
  secondary: { box: { backgroundColor: colors.panelHi }, text: { color: colors.text } },
  quiet: { box: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line }, text: { color: colors.text } },
  danger: { box: { backgroundColor: colors.pinkSoft, borderWidth: 1.5, borderColor: colors.pink }, text: { color: colors.pink } },
  dark: { box: { backgroundColor: colors.ink }, text: { color: colors.gold } },
  darkOutline: { box: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.ink }, text: { color: colors.ink } },
  ghost: { box: { backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' }, text: { color: '#fff' } },
};

const pillTones = {
  muted: { bg: colors.panelHi, fg: colors.muted },
  gold: { bg: colors.goldSoft, fg: colors.gold },
  pink: { bg: colors.pinkSoft, fg: colors.pink },
};

const styles = StyleSheet.create({
  btn: { minHeight: 54, borderRadius: radius.md, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnSmall: { minHeight: 42, paddingHorizontal: 14, borderRadius: 12 },
  btnText: { fontSize: 16, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.ground },
  gateTitle: { fontFamily: fonts.pixel, fontSize: 24, color: colors.text, marginTop: 18, marginBottom: 8 },
  gateBody: { fontSize: 15, color: colors.muted, textAlign: 'center' },
});
