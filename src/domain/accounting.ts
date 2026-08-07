import type { Rates } from './types';

export function rateForCup(amount: number, rates: Rates) {
  if (amount < 50000) return rates.under50;
  if (amount < 100000) return rates.from50;
  if (amount < 500000) return rates.from100;
  return rates.from500;
}

export const roundUsdt = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

export function cupToUsdt(amount: number, rates: Rates) {
  const rate = rateForCup(amount, rates);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Escribe una cuantía mayor que cero.');
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Configura una tasa válida para esta cuantía.');
  return { rate, usdt: roundUsdt(amount / rate) };
}

export const signedAmount = (kind: 'deposit' | 'withdrawal', amount: number) => kind === 'deposit' ? amount : -amount;
