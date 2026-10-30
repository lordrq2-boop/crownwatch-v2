// Crown look: charcoal ground, gold as the main colour, pink only as a highlight.
export const colors = {
  ground: '#0E0E12',
  panel: '#17171D',
  panelHi: '#21212A',
  line: '#2A2A34',
  text: '#F4F1E8',
  muted: '#9C9AA6',
  faint: '#5E5C69',
  gold: '#F4B731',
  goldDeep: '#C48F0E',
  goldSoft: 'rgba(244,183,49,0.14)',
  goldLine: 'rgba(244,183,49,0.35)',
  pink: '#FF5CA8',
  pinkSoft: 'rgba(255,92,168,0.14)',
  ink: '#141418',
};

export const fonts = { pixel: 'PixelifySans_700Bold', pixelMed: 'PixelifySans_500Medium' };

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const type = {
  display: { fontFamily: fonts.pixel, fontSize: 32, color: colors.text, letterSpacing: 0.3 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  big: { fontSize: 30, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  time: { fontSize: 22, fontWeight: '800', color: colors.gold, fontVariant: ['tabular-nums'] },
};
