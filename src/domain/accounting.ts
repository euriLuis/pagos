import type { Currency, MovementKind, Rates } from './types';
import { normalizeCurrencyAmount, roundUsdt } from '../shared/money';

export function rateForCup(amount: number, rates: Rates) {
  if (amount < 50000) return rates.under50;
  if (amount < 100000) return rates.from50;
  if (amount < 500000) return rates.from100;
  return rates.from500;
}

export { roundUsdt } from '../shared/money';

export function cupToUsdt(amount: number, rates: Rates) {
  const rate = rateForCup(amount, rates);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Escribe una cuantía mayor que cero.');
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Configura una tasa válida para esta cuantía.');
  const usdt = roundUsdt(amount / rate);
  if (!Number.isFinite(usdt) || usdt <= 0) throw new Error('La cuantía es demasiado pequeña: debe convertir al menos a 0.001 USDT.');
  return { rate, usdt };
}

export function calculateMovement(currency: Currency, kind: MovementKind, input: number, rate: number | null) {
  if (!['deposit', 'withdrawal_cup', 'withdrawal_direct'].includes(kind)) throw new Error('Tipo de movimiento inválido.');
  if (kind === 'withdrawal_cup' && currency !== 'USDT') throw new Error('La conversión desde CUP solo está disponible en el perfil USDT.');
  const inputCurrency: Currency = kind === 'withdrawal_cup' ? 'CUP' : currency;
  const inputAmount = normalizeCurrencyAmount(input, inputCurrency);
  if (!Number.isFinite(inputAmount) || inputAmount <= 0) throw new Error('Escribe una cuantía válida mayor que cero.');
  if (kind !== 'withdrawal_cup') return { inputAmount, balanceAmount: kind === 'deposit' ? inputAmount : -inputAmount, rate: null };
  if (rate === null || !Number.isFinite(rate) || rate <= 0) throw new Error('Configura una tasa válida para esta cuantía.');
  const balanceAmount = -roundUsdt(inputAmount / rate);
  if (!Number.isFinite(balanceAmount) || balanceAmount === 0) throw new Error('La cuantía es demasiado pequeña: debe descontar al menos 0.001 USDT.');
  return { inputAmount, balanceAmount, rate };
}
