import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors } from './theme';

export const ITEM_H = 52;
const VISIBLE = 5;

// A scroll wheel: flick or drag to any value, it snaps to the centre row. Tap a row to jump to it.
export default function Wheel({ data, index, onChange, width = 84, format = (x) => String(x) }) {
  const ref = useRef(null);
  const last = useRef(index);

  useEffect(() => {
    const t = setTimeout(() => ref.current && ref.current.scrollTo({ y: index * ITEM_H, animated: false }), 60);
    return () => clearTimeout(t);
  }, []);

  const handleScroll = (e) => {
    const i = Math.max(0, Math.min(data.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    if (i !== last.current) {
      last.current = i;
      onChange(i);
    }
  };

  return (
    <View style={{ height: ITEM_H * VISIBLE, width }}>
      <View pointerEvents="none" style={styles.band} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {data.map((d, i) => (
          <Pressable
            key={i}
            style={styles.item}
            onPress={() => {
              last.current = i;
              onChange(i);
              ref.current && ref.current.scrollTo({ y: i * ITEM_H, animated: true });
            }}
          >
            <Text style={[styles.text, i === index && styles.textOn]}>{format(d)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={[styles.fade, { top: 0 }]} />
      <View pointerEvents="none" style={[styles.fade, { bottom: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H,
    backgroundColor: colors.goldSoft, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.gold, borderRadius: 10,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 26, fontWeight: '600', color: colors.muted, fontVariant: ['tabular-nums'] },
  textOn: { fontSize: 32, fontWeight: '800', color: colors.gold },
  fade: { position: 'absolute', left: 0, right: 0, height: ITEM_H * 1.5, backgroundColor: 'rgba(30,30,36,0.72)' },
});
