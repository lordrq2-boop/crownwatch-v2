import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { verifyDailyCode } from '../dailyCode';
import { CameraView } from 'expo-camera';
import { Btn, CameraGate } from '../ui';
import { colors, fonts } from '../theme';

export default function ProofScreen({ task, dateKey, secret, onDone, onBack, onPair }) {
  if (task.proof === 'qr') return <QrProof task={task} dateKey={dateKey} secret={secret} onDone={onDone} onBack={onBack} onPair={onPair} />;
  return <PhotoProof task={task} onDone={onDone} onBack={onBack} />;
}

function QrProof({ task, dateKey, secret, onDone, onBack, onPair }) {
  const locked = useRef(false);
  const [msg, setMsg] = useState('');

  if (!secret) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Pair your PC first</Text>
        <Text style={styles.body}>Daily codes come from the CrownFlow key tool on your PC. Pair it once, then try again.</Text>
        <Btn label="Pair now" onPress={onPair} style={{ marginTop: 18, alignSelf: 'stretch' }} />
        <Btn label="Back" kind="quiet" onPress={onBack} style={{ marginTop: 8, alignSelf: 'stretch' }} />
      </View>
    );
  }

  const handleScan = ({ data }) => {
    if (locked.current) return;
    locked.current = true;
    const r = verifyDailyCode(data, secret, dateKey);
    if (r.ok) {
      onDone({ proof: 'qr' });
      return;
    }
    const text = {
      notcode: 'That is not a CrownFlow code.',
      invalid: 'That code is not valid for your key. Open your PC key tool and show today\'s code.',
      wrongday: `That code is for ${r.day}. You need today's code.`,
    }[r.reason] || 'That code was not accepted.';
    setMsg(text);
    setTimeout(() => { locked.current = false; setMsg(''); }, 2500);
  };

  return (
    <CameraGate onCancel={onBack}>
      <View style={styles.full}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handleScan} />
        <View style={styles.top}>
          <Text style={styles.camTitle}>{task.title}</Text>
          <Text style={styles.camSub}>Scan today's code from your PC key tool</Text>
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

function PhotoProof({ task, onDone, onBack }) {
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  const snap = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const p = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setPhoto(p.uri);
    } catch (e) {}
    setBusy(false);
  };

  if (photo) {
    return (
      <View style={styles.full}>
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={styles.bottom}>
          <Btn label="Use this photo" onPress={() => onDone({ proof: 'photo', uri: photo })} />
          <Btn label="Retake" kind="ghost" onPress={() => setPhoto(null)} style={{ marginTop: 10 }} />
        </View>
      </View>
    );
  }

  return (
    <CameraGate onCancel={onBack}>
      <View style={styles.full}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.top}>
          <Text style={styles.camTitle}>{task.title}</Text>
          <Text style={styles.camSub}>Take a clear photo as proof</Text>
        </View>
        <View style={styles.bottom}>
          <Btn label={busy ? 'Saving...' : 'Take photo'} onPress={snap} disabled={busy} />
          <Btn label="Back" kind="ghost" onPress={onBack} style={{ marginTop: 10 }} />
        </View>
      </View>
    </CameraGate>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.ground },
  title: { fontFamily: fonts.pixel, fontSize: 26, color: colors.text, marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  camTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  camSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4 },
  frame: { position: 'absolute', top: '30%', alignSelf: 'center', width: 240, height: 240, borderWidth: 3, borderColor: colors.gold, borderRadius: 24 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 36 },
  verdict: { color: colors.ink, padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 15, fontWeight: '800', overflow: 'hidden' },
  error: { color: colors.ink, backgroundColor: colors.pink, padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 15, fontWeight: '600' },
});
