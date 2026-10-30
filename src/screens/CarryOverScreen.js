import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Btn, Icon, IconBadge, useInsets } from '../ui';
import { proofText } from '../TaskCard';
import { colors, radius, type } from '../theme';
import { categoryOf } from '../categories';
import { fmtDays, fmtTime } from '../dates';

export default function CarryOverScreen({ tasks, target, onConfirm, onBack }) {
  const insets = useInsets();
  const [picked, setPicked] = useState(() => new Set(tasks.map((t) => t.id)));
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const chosen = tasks.filter((t) => picked.has(t.id));
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={{ width: 40 }}><Icon name="close" size={26} /></Pressable>
        <Text style={styles.headerTitle}>Carry over</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        <Text style={type.body}>Choose which tasks to repeat {target === 'next' ? 'next week' : 'this week'}. This is the only time a plan can change, because copies are new tasks.</Text>
        <View style={{ marginTop: 18 }}>
          {tasks.length === 0 ? <Text style={type.small}>There are no earlier tasks to carry over.</Text> : null}
          {tasks.map((t) => {
            const on = picked.has(t.id);
            return (
              <Pressable key={t.id} onPress={() => toggle(t.id)} style={[styles.row, on && { borderColor: colors.gold }]}>
                <IconBadge name={categoryOf(t.category).icon} size={42} tone={on ? 'gold' : 'muted'} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={type.title} numberOfLines={1}>{t.title}</Text>
                  <Text style={type.small}>{fmtTime(t.time)} / {fmtDays(t.days)} / {proofText(t)}</Text>
                </View>
                <Icon name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.gold : colors.faint} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Btn label={`Carry over ${chosen.length} task${chosen.length === 1 ? '' : 's'}`} disabled={chosen.length === 0} onPress={() => onConfirm(chosen)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.panel, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingTop: 12 },
});
