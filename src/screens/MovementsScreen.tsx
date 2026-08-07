import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { useAccounts } from '../context/AccountsContext';
import { addMovement, getRates } from '../data/database';
import { cupToUsdt } from '../domain/accounting';
import type { MovementKind, Rates } from '../domain/types';
import { parseMoneyInput } from '../shared/money';
import { theme } from '../shared/theme';
import { Button, Card, Header, Input, money, Screen, Tabs } from '../ui/components';
type Mode = 'deposit' | 'withdrawal_cup' | 'withdrawal_direct';
const defaults: Rates = { under50: 0, from50: 0, from100: 0, from500: 0 };
export function MovementsScreen() {
  const { selected, movements, balance, loading, refresh } = useAccounts(); const [mode, setMode] = useState<Mode>('deposit'); const [amount, setAmount] = useState(''); const [note, setNote] = useState(''); const [rates, setRates] = useState(defaults); const [ratesReady, setRatesReady] = useState(false); const [saving, setSaving] = useState(false); const savingRef = useRef(false); const [keyboard, setKeyboard] = useState({ visible: false, height: 0 });
  useFocusEffect(useCallback(() => { let active = true; setRatesReady(false); void getRates().then(values => { if (active) { setRates(values); setRatesReady(true); } }).catch(error => { if (active) Alert.alert('No se pudieron cargar las tasas', error instanceof Error ? error.message : 'Inténtalo otra vez.'); }); return () => { active = false; setRatesReady(false); }; }, []));
  useEffect(() => { setMode(selected?.currency === 'USDT' ? 'withdrawal_cup' : 'withdrawal_direct'); setAmount(''); setNote(''); }, [selected?.id, selected?.currency]);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', event => setKeyboard({ visible: true, height: event.endCoordinates.height }));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard({ visible: false, height: 0 }));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const inputCurrency = selected?.currency === 'USDT' && mode === 'withdrawal_cup' ? 'CUP' : selected?.currency ?? 'CUP';
  const value = parseMoneyInput(amount, inputCurrency);
  let preview = ''; let chosenRate = 0;
  if (selected?.currency === 'USDT' && mode === 'withdrawal_cup' && value > 0) { try { const calc = cupToUsdt(value, rates); chosenRate = calc.rate; preview = `${money(value, 'CUP')} ÷ ${chosenRate} = ${money(calc.usdt, 'USDT')}`; } catch {} }
  const save = async () => {
    if (savingRef.current) return;
    if (!selected || !Number.isFinite(value) || value <= 0) return Alert.alert('Cuantía inválida', 'Escribe una cuantía mayor que cero.');
    if (selected.currency === 'USDT' && mode === 'withdrawal_cup' && !ratesReady) return Alert.alert('Tasas no disponibles', 'Espera a que se carguen las tasas antes de guardar el retiro.');
    savingRef.current = true; setSaving(true);
    try { let kind: MovementKind = mode;
      if (selected.currency === 'CUP') kind = mode === 'deposit' ? 'deposit' : 'withdrawal_direct';
      else if (mode === 'withdrawal_cup') cupToUsdt(value, rates);
      await addMovement(selected.id, kind, value, note);
    } catch (e) { Alert.alert('No se pudo registrar', e instanceof Error ? e.message : 'Inténtalo otra vez.'); savingRef.current = false; setSaving(false); return; }
    setAmount(''); setNote(''); Keyboard.dismiss();
    try { await refresh(); } catch (e) { Alert.alert('Movimiento guardado', `Quedó registrado, pero no se pudo actualizar la pantalla. ${e instanceof Error ? e.message : 'Vuelve a abrir la cuenta.'}`); }
    finally { savingRef.current = false; setSaving(false); }
  };
  if (!selected) return <Screen><Header title="Pagos" /><Text>No hay perfiles.</Text></Screen>;
  const isUsdt = selected.currency === 'USDT';
  const waitingForRates = isUsdt && mode === 'withdrawal_cup' && !ratesReady;
  return <View style={styles.root}><Screen><Header title="Pagos" /><Card style={styles.balanceCard}><Text style={styles.balanceLabel}>Saldo disponible</Text><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.balance, balance < 0 && styles.negative]}>{money(balance, selected.currency)}</Text><Text style={styles.balanceHint}>Saldo inicial {money(selected.initialBalance, selected.currency)}</Text></Card>
    <Tabs value={mode} disabled={loading || saving} onChange={(nextMode) => { if (nextMode === mode) return; setMode(nextMode); setAmount(''); setNote(''); }} options={isUsdt ? [{ value: 'withdrawal_cup', label: 'Retiro CUP' }, { value: 'deposit', label: 'Depósito USDT' }, { value: 'withdrawal_direct', label: 'Directo' }] : [{ value: 'withdrawal_direct', label: 'Retiro' }, { value: 'deposit', label: 'Depósito' }]} />
    <Card><Text style={styles.title}>{mode === 'deposit' ? 'Registrar depósito' : 'Registrar retiro'}</Text><View style={styles.form}><Input label={`Cuantía en ${isUsdt && mode === 'withdrawal_cup' ? 'CUP' : selected.currency}`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" editable={!loading && !saving} /><Text style={styles.numberHint}>{inputCurrency === 'USDT' ? 'Puedes usar punto o coma para los decimales; escribe los miles sin separador.' : 'Los CUP se registran sin decimales; puedes separar los miles con punto o coma.'}</Text>{preview ? <View style={styles.preview}><Text style={styles.previewLabel}>Conversión aplicada</Text><Text style={styles.previewValue}>{preview}</Text></View> : null}<View style={styles.recent}><Text style={styles.recentTitle}>Últimos movimientos</Text>{movements.length ? movements.slice(0, 6).map(movement => { const currency = movement.kind === 'withdrawal_cup' ? 'CUP' : selected.currency; const introduced = movement.inputAmount; const positive = movement.balanceAmount >= 0; const type = movement.kind === 'deposit' ? 'Depósito' : movement.kind === 'withdrawal_cup' ? 'Retiro CUP' : selected.currency === 'USDT' ? 'Directo' : 'Retiro'; return <View key={movement.id} style={styles.recentRow}><View style={styles.recentCopy}><Text style={styles.recentType}>{type}</Text><Text numberOfLines={1} style={styles.recentDetail}>{new Date(movement.createdAt).toLocaleString('es-ES')}{movement.note ? ` · ${movement.note}` : ''}</Text></View><Text style={[styles.recentAmount, positive ? styles.recentPositive : styles.recentNegative]}>{positive ? '+' : '−'}{money(introduced, currency)}</Text></View>; }) : <Text style={styles.recentEmpty}>Aún no hay movimientos.</Text>}</View><Input label={mode === 'withdrawal_direct' ? 'Nota (Zelle, Clásica, etc.)' : 'Nota (opcional)'} value={note} onChangeText={setNote} placeholder="Detalle del movimiento" multiline editable={!loading && !saving} />{!keyboard.visible ? <Button label={saving ? 'Guardando…' : waitingForRates ? 'Cargando tasas…' : loading ? 'Actualizando…' : 'Guardar movimiento'} icon="check" onPress={save} disabled={saving || waitingForRates || loading} tone={mode === 'deposit' ? 'success' : 'primary'} /> : null}</View></Card>
  </Screen>{keyboard.visible ? <View style={[styles.keyboardAction, Platform.OS === 'ios' && { bottom: keyboard.height + 10 }]}><Button label={saving ? 'Guardando…' : waitingForRates ? 'Cargando tasas…' : loading ? 'Actualizando…' : 'Confirmar movimiento'} icon="check" onPress={save} disabled={saving || waitingForRates || loading} tone={mode === 'deposit' ? 'success' : 'primary'} /></View> : null}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, balanceCard: { backgroundColor: theme.colors.primary }, balanceLabel: { ...theme.type.caption, color: '#BFC8D7' }, balance: { fontSize: 34, lineHeight: 42, fontWeight: '800', color: theme.colors.gold, marginVertical: 5 }, negative: { color: '#FF8A8A' }, balanceHint: { ...theme.type.caption, color: '#BFC8D7' }, title: { ...theme.type.title, marginBottom: 15 }, form: { gap: 14 }, numberHint: { ...theme.type.caption, color: theme.colors.muted, marginTop: -9, marginLeft: 3 }, preview: { borderRadius: 16, padding: 13, backgroundColor: theme.colors.infoSoft }, previewLabel: { ...theme.type.caption, color: theme.colors.info }, previewValue: { ...theme.type.label, marginTop: 3 }, recent: { borderRadius: 18, padding: 13, backgroundColor: theme.colors.surfaceAlt }, recentTitle: { ...theme.type.label, marginBottom: 5 }, recentRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, recentCopy: { flex: 1, minWidth: 0 }, recentType: { ...theme.type.caption, color: theme.colors.text, fontWeight: '700' }, recentDetail: { fontSize: 10, lineHeight: 14, color: theme.colors.muted, marginTop: 1 }, recentAmount: { ...theme.type.caption, fontWeight: '800' }, recentPositive: { color: theme.colors.success }, recentNegative: { color: theme.colors.danger }, recentEmpty: { ...theme.type.caption, color: theme.colors.muted, paddingVertical: 8 }, keyboardAction: { position: 'absolute', left: 12, right: 12, bottom: 10, zIndex: 20, padding: 8, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, elevation: 8, shadowColor: '#152033', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } } });
