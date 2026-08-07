import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAccounts } from '../context/AccountsContext';
import { addMovement, getRates } from '../data/database';
import { cupToUsdt, roundUsdt, signedAmount } from '../domain/accounting';
import type { MovementKind, Rates } from '../domain/types';
import { theme } from '../shared/theme';
import { Button, Card, Header, Input, money, Screen, Tabs } from '../ui/components';
type Mode = 'deposit' | 'withdrawal_cup' | 'withdrawal_direct';
const defaults: Rates = { under50: 0, from50: 0, from100: 0, from500: 0 };
export function MovementsScreen() {
  const { selected, balance, refresh } = useAccounts(); const [mode, setMode] = useState<Mode>('deposit'); const [amount, setAmount] = useState(''); const [note, setNote] = useState(''); const [rates, setRates] = useState(defaults); const [saving, setSaving] = useState(false);
  useFocusEffect(useCallback(() => { void getRates().then(setRates); }, []));
  useEffect(() => { setMode(selected?.currency === 'USDT' ? 'withdrawal_cup' : 'withdrawal_direct'); setAmount(''); setNote(''); }, [selected?.id, selected?.currency]);
  const value = Number(amount.replace(',', '.'));
  let preview = ''; let chosenRate = 0;
  if (selected?.currency === 'USDT' && mode === 'withdrawal_cup' && value > 0) { try { const calc = cupToUsdt(value, rates); chosenRate = calc.rate; preview = `${money(value, 'CUP')} ÷ ${chosenRate} = ${money(calc.usdt, 'USDT')}`; } catch {} }
  const save = async () => {
    if (!selected || !Number.isFinite(value) || value <= 0) return Alert.alert('Cuantía inválida', 'Escribe una cuantía mayor que cero.');
    try { setSaving(true); let balanceAmount: number; let rate: number | null = null; let kind: MovementKind = mode;
      if (selected.currency === 'CUP') { kind = mode === 'deposit' ? 'deposit' : 'withdrawal_direct'; balanceAmount = signedAmount(mode === 'deposit' ? 'deposit' : 'withdrawal', value); }
      else if (mode === 'withdrawal_cup') { const calc = cupToUsdt(value, rates); balanceAmount = -calc.usdt; rate = calc.rate; }
      else balanceAmount = signedAmount(mode === 'deposit' ? 'deposit' : 'withdrawal', roundUsdt(value));
      await addMovement(selected.id, kind, value, balanceAmount, rate, note); setAmount(''); setNote(''); await refresh();
    } catch (e) { Alert.alert('No se pudo registrar', e instanceof Error ? e.message : 'Inténtalo otra vez.'); } finally { setSaving(false); }
  };
  if (!selected) return <Screen><Header title="Pagos" /><Text>No hay perfiles.</Text></Screen>;
  const isUsdt = selected.currency === 'USDT';
  return <Screen><Header title="Pagos" /><Card style={styles.balanceCard}><Text style={styles.balanceLabel}>Saldo disponible</Text><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.balance, balance < 0 && styles.negative]}>{money(balance, selected.currency)}</Text><Text style={styles.balanceHint}>Saldo inicial {money(selected.initialBalance, selected.currency)}</Text></Card>
    <Tabs value={mode} onChange={setMode} options={isUsdt ? [{ value: 'withdrawal_cup', label: 'Retiro CUP' }, { value: 'deposit', label: 'Depósito USDT' }, { value: 'withdrawal_direct', label: 'Directo' }] : [{ value: 'withdrawal_direct', label: 'Retiro' }, { value: 'deposit', label: 'Depósito' }]} />
    <Card><Text style={styles.title}>{mode === 'deposit' ? 'Registrar depósito' : 'Registrar retiro'}</Text><View style={styles.form}><Input label={`Cuantía en ${isUsdt && mode === 'withdrawal_cup' ? 'CUP' : selected.currency}`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />{preview ? <View style={styles.preview}><Text style={styles.previewLabel}>Conversión aplicada</Text><Text style={styles.previewValue}>{preview}</Text></View> : null}<Input label={mode === 'withdrawal_direct' ? 'Nota (Zelle, Clásica, etc.)' : 'Nota (opcional)'} value={note} onChangeText={setNote} placeholder="Detalle del movimiento" multiline /><Button label={saving ? 'Guardando…' : 'Guardar movimiento'} icon="check" onPress={save} disabled={saving} tone={mode === 'deposit' ? 'success' : 'primary'} /></View></Card>
  </Screen>;
}
const styles = StyleSheet.create({ balanceCard: { backgroundColor: theme.colors.primary }, balanceLabel: { ...theme.type.caption, color: '#BFC8D7' }, balance: { fontSize: 34, lineHeight: 42, fontWeight: '800', color: theme.colors.gold, marginVertical: 5 }, negative: { color: '#FF8A8A' }, balanceHint: { ...theme.type.caption, color: '#BFC8D7' }, title: { ...theme.type.title, marginBottom: 15 }, form: { gap: 14 }, preview: { borderRadius: 16, padding: 13, backgroundColor: theme.colors.infoSoft }, previewLabel: { ...theme.type.caption, color: theme.colors.info }, previewValue: { ...theme.type.label, marginTop: 3 } });
