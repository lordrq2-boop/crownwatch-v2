import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { Btn, CameraGate, Icon, IconBadge } from '../ui';
import { parsePairCode } from '../dailyCode';
import { colors, fonts, type } from '../theme';

export default function PairScreen({ alreadyPaired, onSave, onBack }) {
  const locked = useRef(false);
  const [secret, setSecret] = useState(null);
  const [msg, setMsg] = useState('');

  if (secret) {
    return (
      <View style={styles.center}>
        <IconBadge name="shield-checkmark-outline" size={72} />
        <Text style={[type.heading, { marginTop: 18, textAlign: 'center' }]}>Pair with this key?</Text>
        <Text style={[type.small, { textAlign: 'center', marginTop: 8 }]}>
          From now on, tasks with a daily code only finish when you scan today's code from this PC key tool.
          {alreadyPaired ? ' This replaces the key you paired before.' : ''}
        </Text>
        <Btn label="Pair" onPress={() => onSave(secret)} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        <Btn label="Scan again" kind="quiet" onPress={() => { locked.current = false; setSecret(null); }} style={{ marginTop: 10, alignSelf: 'stretch' }} />
      </View>
    );
  }

  const handle = ({ data }) => {
    if (locked.current) return;
    locked.current = true;
    const s = parsePairCode(data);
    if (s) {
      setSecret(s);
    } else {
      setMsg('That is not a pairing code. On your PC key tool, press "Show pairing code".');
      setTimeout(() => { locked.current = false; setMsg(''); }, 2500);
    }
  };

  return (
    <CameraGate onCancel={onBack}>
      <View style={styles.full}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handle} />
        <View style={styles.top}>
          <Text style={styles.title}>Pair with your PC</Text>
          <Text style={styles.sub}>Scan the pairing code shown by the CrownWatch key tool</Text>
        </View>
        <View style={styles.frame} />
        <View style={styles.bottom}>
          {msg ? <Text style={styles.error}>{msg}</Text> : null}
          <Btn label="Back" kind="ghost" onPress={onBack} />
        </View>
      </View>
    </CameraGate>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: colors.ground },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  title: { color: '#fff', fontSize: 24, fontFamily: fonts.pixel },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4 },
  frame: { position: 'absolute', top: '30%', alignSelf: 'center', width: 240, height: 240, borderWidth: 3, borderColor: colors.gold, borderRadius: 24 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 36 },
  error: { color: colors.ink, backgroundColor: colors.pink, padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 15, fontWeight: '600', overflow: 'hidden' },
});
