// Crown look: charcoal ground, gold as the main colour, pink only as a highlight.
export const colors = {
  ground: '#0B0D10',
  panel: '#14171C',
  panelHi: '#1C2128',
  line: '#282E36',
  text: '#F4F3EF',
  muted: '#A0A7B1',
  faint: '#68717D',
  gold: '#E5B45B',
  goldDeep: '#A9792C',
  goldSoft: 'rgba(229,180,91,0.13)',
  goldLine: 'rgba(229,180,91,0.30)',
  pink: '#EF718D',
  pinkSoft: 'rgba(239,113,141,0.13)',
  ink: '#111318',
};

export const fonts = { pixel: 'PixelifySans_700Bold', pixelMed: 'PixelifySans_500Medium' };

export const radius = { sm: 10, md: 15, lg: 21, xl: 26, pill: 999 };

export const type = {
  display: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.7 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  big: { fontSize: 30, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  time: { fontSize: 22, fontWeight: '800', color: colors.gold, fontVariant: ['tabular-nums'] },
};
