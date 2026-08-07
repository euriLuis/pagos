import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HistoryScreen } from '../screens/HistoryScreen';
import { MovementsScreen } from '../screens/MovementsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { shadow, theme } from '../shared/theme';
const Tab = createBottomTabNavigator();
const icons: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = { Movimientos: 'swap-horizontal-bold', Resumen: 'chart-box-outline', Historial: 'history', Ajustes: 'tune-variant' };
export function AppNavigator() { const insets = useSafeAreaInsets(); return <Tab.Navigator initialRouteName="Movimientos" screenOptions={({ route }) => ({ headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: theme.colors.text, tabBarInactiveTintColor: theme.colors.muted, tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 5 }, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={icons[route.name] ?? 'circle'} color={color} size={size} />, tabBarStyle: [styles.bar, { height: 70 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) }] })}><Tab.Screen name="Movimientos" component={MovementsScreen} /><Tab.Screen name="Resumen" component={SummaryScreen} /><Tab.Screen name="Historial" component={HistoryScreen} /><Tab.Screen name="Ajustes" component={SettingsScreen} /></Tab.Navigator>; }
const styles = StyleSheet.create({ bar: { position: 'absolute', left: 12, right: 12, bottom: 0, paddingTop: 6, backgroundColor: theme.colors.surface, borderTopWidth: 0, borderRadius: 22, ...shadow.card } });
