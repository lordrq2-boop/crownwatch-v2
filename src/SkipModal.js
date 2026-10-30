import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import { Btn } from './ui';
import { colors, radius } from './theme';
import { skipPhrase, phraseMatches } from './skipPhrases';

// Skipping needs a long sentence, different every day, typed exactly (capitals and punctuation are forgiven).
export default function SkipModal({ visible, task, dateKey, passesLeft, onClose, onSkip }) {
  const [typed, setTyped] = useState('');
  if (!task) return null;
  const phrase = skipPhrase(dateKey, task);
  const close = () => { setTyped(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Really skip {task.title}?</Text>
          <Text style={styles.body}>{passesLeft} skip{passesLeft === 1 ? '' : 's'} left this week. If you mean it, type today's sentence exactly. It changes every day.</Text>
          <Text style={styles.phrase}>{phrase}</Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            contextMenuHidden
            placeholder="Type the sentence here"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
          <Btn label="Use a skip" disabled={!phraseMatches(typed, phrase)} onPress={() => { setTyped(''); onSkip(); }} />
          <Btn label="Keep going" kind="quiet" onPress={close} style={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Aligned to the top so the keyboard never covers the sentence or the box.
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-start', paddingTop: 60, paddingHorizontal: 20 },
  card: { backgroundColor: colors.panel, borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: colors.line },
  title: { fontSize: 21, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, color: colors.muted, marginTop: 8 },
  phrase: { fontSize: 16, fontWeight: '700', color: colors.pink, marginVertical: 14, lineHeight: 23 },
  input: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 12, fontSize: 16, color: colors.text, marginBottom: 14, backgroundColor: colors.ground, minHeight: 84, textAlignVertical: 'top' },
});
