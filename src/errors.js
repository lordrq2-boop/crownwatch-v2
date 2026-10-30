import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'crownwatch.lasterror';

// Saves the last crash message so it can be read in Settings and sent for fixing.
export function installErrorCapture() {
  try {
    const eu = globalThis.ErrorUtils;
    if (!eu || !eu.getGlobalHandler) return;
    const previous = eu.getGlobalHandler();
    eu.setGlobalHandler((error, isFatal) => {
      record(error, isFatal ? 'fatal' : 'error');
      if (previous) previous(error, isFatal);
    });
  } catch (e) {}
}

export function record(error, kind = 'error') {
  try {
    const info = { at: new Date().toISOString(), kind, message: String(error && error.message ? error.message : error), stack: String((error && error.stack) || '').slice(0, 1500) };
    AsyncStorage.setItem(KEY, JSON.stringify(info));
  } catch (e) {}
}

export async function readLastError() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearLastError() {
  try { await AsyncStorage.removeItem(KEY); } catch (e) {}
}

// If any screen fails while drawing, show the reason instead of closing the app.
export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    record(error, 'screen');
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#0E0E12', padding: 24, paddingTop: 70 }}>
        <Text style={{ color: '#F4B731', fontSize: 22, fontWeight: '800' }}>Something went wrong</Text>
        <Text style={{ color: '#9C9AA6', marginTop: 8 }}>Your tasks are safe. Screenshot this and send it so it can be fixed.</Text>
        <ScrollView style={{ marginTop: 16 }}>
          <Text selectable style={{ color: '#F4F1E8', fontSize: 13 }}>{String(this.state.error && this.state.error.message)}{'\n\n'}{String((this.state.error && this.state.error.stack) || '').slice(0, 900)}</Text>
        </ScrollView>
        <Pressable onPress={() => this.setState({ error: null })} style={{ backgroundColor: '#F4B731', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#141418', fontWeight: '800', fontSize: 16 }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
