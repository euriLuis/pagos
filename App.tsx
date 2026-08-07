import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { runMigrations } from './src/data/database';
import { AccountsProvider } from './src/context/AccountsContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/shared/theme';

function Bootstrap() {
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { runMigrations().then(() => setReady(true)).catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo preparar la app.')); }, []);
  if (!ready) return <View style={styles.center}><Image source={require('./assets/iconography/app-icon.png')} style={styles.mark} />{error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" color={theme.colors.primary} />}</View>;
  return <AccountsProvider><NavigationContainer><AppNavigator /></NavigationContainer></AccountsProvider>;
}

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><Bootstrap /></SafeAreaProvider>;
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: theme.colors.background }, mark: { width: 74, height: 74, borderRadius: 22 }, error: { color: theme.colors.danger, padding: 24, textAlign: 'center' } });
