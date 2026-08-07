import type { Currency } from '../domain/types';

const roundMagnitude = (value: number, factor: number) => Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;

export const roundUsdt = (value: number) => roundMagnitude(value, 1000);

export const normalizeCurrencyAmount = (value: number, currency: Currency) => currency === 'USDT' ? roundUsdt(value) : roundMagnitude(value, 1);

export function parseNumberInput(text: string) {
  const spaced = text.trim().replace(/[\u00A0\u202F]/g, ' ');
  if (/^[+-]?\d{1,3}( \d{3})+([.,]\d+)?$/.test(spaced)) return parseNumberInput(spaced.replace(/ /g, ''));
  if (/\s/.test(spaced)) return Number.NaN;
  const compact = spaced;
  if (!compact) return Number.NaN;
  if (/^[+-]?\d+$/.test(compact)) return Number(compact);
  if (/^[+-]?\d{1,3}(,\d{3})+\.\d+$/.test(compact)) return Number(compact.replace(/,/g, ''));
  if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(compact)) return Number(compact.replace(/\./g, '').replace(',', '.'));
  if (/^[+-]?\d{1,3}(,\d{3}){2,}$/.test(compact)) return Number(compact.replace(/,/g, ''));
  if (/^[+-]?\d{1,3}(\.\d{3}){2,}$/.test(compact)) return Number(compact.replace(/\./g, ''));
  if (/^[+-]?\d+[.,]\d+$/.test(compact)) return Number(compact.replace(',', '.'));
  return Number.NaN;
}

export function parseMoneyInput(text: string, currency: Currency) {
  const compact = text.trim().replace(/[\u00A0\u202F]/g, ' ');
  const groupedCup = !/^[+-]?0[.,]/.test(compact) && /^[+-]?\d{1,3}([.,]\d{3})+$/.test(compact);
  const value = currency === 'CUP' && groupedCup ? Number(compact.replace(/[.,]/g, '')) : parseNumberInput(compact);
  return normalizeCurrencyAmount(value, currency);
}

export const formatAmount = (value: number, currency: Currency) => Math.abs(value).toLocaleString('en-US', {
  minimumFractionDigits: currency === 'USDT' ? 3 : 0,
  maximumFractionDigits: currency === 'USDT' ? 3 : 0,
});

export const formatMoney = (value: number, currency: Currency) => `${value < 0 ? '−' : ''}${formatAmount(value, currency)} ${currency}`;
