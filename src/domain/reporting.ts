import type { Currency, Movement } from './types';
import { formatAmount } from '../shared/money';

export type Period = 'day' | 'week' | 'month';

export function periodRange(period: Period, previous: boolean, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'day') start.setDate(start.getDate() - (previous ? 1 : 0));
  if (period === 'week') {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset - (previous ? 7 : 0));
  }
  if (period === 'month') start.setMonth(start.getMonth() - (previous ? 1 : 0), 1);
  const end = new Date(start);
  if (period === 'day') end.setDate(end.getDate() + 1);
  if (period === 'week') end.setDate(end.getDate() + 7);
  if (period === 'month') end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export function buildReport(movements: Movement[], initialBalance: number, start: Date, end: Date) {
  const before = movements.filter(x => new Date(x.createdAt) < start).reduce((sum, x) => sum + x.balanceAmount, initialBalance);
  const included = movements.filter(x => { const date = new Date(x.createdAt); return date >= start && date < end; });
  const deposits = included.filter(x => x.kind === 'deposit').reduce((sum, x) => sum + Math.abs(x.balanceAmount), 0);
  const withdrawals = included.filter(x => x.kind !== 'deposit').reduce((sum, x) => sum + Math.abs(x.balanceAmount), 0);
  const cupWithdrawn = included.filter(x => x.kind === 'withdrawal_cup').reduce((sum, x) => sum + x.inputAmount, 0);
  const directWithdrawn = included.filter(x => x.kind === 'withdrawal_direct').reduce((sum, x) => sum + Math.abs(x.balanceAmount), 0);
  const net = included.reduce((sum, x) => sum + x.balanceAmount, 0);
  return { included, opening: before, deposits, withdrawals, cupWithdrawn, directWithdrawn, closing: before + net };
}

const amount = (value: number, currency: Currency) => `${formatAmount(value, currency)} ${currency}`;
const detail = (value: string, movement: Movement) => movement.note.trim() ? `${value} (${movement.note.trim().replace(/\s+/g, ' ')})` : value;

export function formatReportText(profileName: string, currency: Currency, periodLabel: string, report: ReturnType<typeof buildReport>) {
  const openingLabel = periodLabel.startsWith('Día') ? 'Balance inicial del día' : periodLabel.startsWith('Semana') ? 'Balance inicial de la semana' : periodLabel.startsWith('Mes') ? 'Balance inicial del mes' : 'Balance inicial del corte';
  const sections: string[] = [];
  const chronological = report.included.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id);
  const deposits = chronological.filter(x => x.kind === 'deposit');
  if (deposits.length) {
    const values = deposits.map(x => detail(amount(x.balanceAmount, currency), x));
    sections.push(`Depósitos\n${values.join(' + ')} = +${amount(report.deposits, currency)}`);
  }
  const rates = new Map<number, Movement[]>();
  chronological.filter(x => x.kind === 'withdrawal_cup' && x.rate).forEach(x => rates.set(x.rate!, [...(rates.get(x.rate!) ?? []), x]));
  rates.forEach((items, rate) => {
    const cupTotal = items.reduce((sum, x) => sum + x.inputAmount, 0);
    const usdtTotal = items.reduce((sum, x) => sum + Math.abs(x.balanceAmount), 0);
    const conversions = items.map(x => detail(`${amount(x.inputAmount, 'CUP')} ÷ ${rate} = ${amount(x.balanceAmount, 'USDT')}`, x));
    sections.push(`Retiros CUP · tasa ${rate}\n${items.map(x => detail(amount(x.inputAmount, 'CUP'), x)).join(' + ')} = ${amount(cupTotal, 'CUP')}\n${conversions.join('\n')}\nTotal convertido: −${amount(usdtTotal, 'USDT')}`);
  });
  const direct = chronological.filter(x => x.kind === 'withdrawal_direct');
  if (direct.length) {
    const values = direct.map(x => detail(amount(Math.abs(x.balanceAmount), currency), x));
    sections.push(currency === 'USDT' ? `Directos · conversión 1×1\n${values.join(' + ')} = −${amount(report.directWithdrawn, 'USDT')}` : `Retiros CUP\n${values.join(' + ')} = −${amount(report.directWithdrawn, 'CUP')}`);
  }
  return `${profileName}\n${periodLabel}\n\n${openingLabel}: ${report.opening < 0 ? '−' : ''}${amount(report.opening, currency)}\n\n${sections.join('\n\n') || 'Sin movimientos'}\n\nTotal depósitos: +${amount(report.deposits, currency)}\nTotal retiros: −${amount(report.withdrawals, currency)}\nTotal en fondo: ${report.closing < 0 ? '−' : ''}${amount(report.closing, currency)}`;
}
