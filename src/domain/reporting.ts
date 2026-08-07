import type { Movement } from './types';

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
  const deposits = included.filter(x => x.balanceAmount > 0).reduce((sum, x) => sum + x.balanceAmount, 0);
  const withdrawals = included.filter(x => x.balanceAmount < 0).reduce((sum, x) => sum + Math.abs(x.balanceAmount), 0);
  const cupWithdrawn = included.filter(x => x.kind === 'withdrawal_cup').reduce((sum, x) => sum + x.inputAmount, 0);
  const directWithdrawn = included.filter(x => x.kind === 'withdrawal_direct').reduce((sum, x) => sum + Math.abs(x.balanceAmount), 0);
  return { included, opening: before, deposits, withdrawals, cupWithdrawn, directWithdrawn, closing: before + deposits - withdrawals };
}

const amount = (value: number, currency: string) => `${Math.abs(value).toLocaleString('es-ES', { minimumFractionDigits: currency === 'USDT' ? 3 : 0, maximumFractionDigits: currency === 'USDT' ? 3 : 0 })} ${currency}`;

export function formatReportText(profileName: string, currency: string, periodLabel: string, report: ReturnType<typeof buildReport>) {
  const openingLabel = periodLabel.startsWith('Día') ? 'Balance inicial del día' : periodLabel.startsWith('Semana') ? 'Balance inicial de la semana' : periodLabel.startsWith('Mes') ? 'Balance inicial del mes' : 'Balance inicial del corte';
  const sections: string[] = [];
  const deposits = report.included.filter(x => x.kind === 'deposit');
  if (deposits.length) {
    const values = deposits.map(x => amount(x.balanceAmount, currency));
    sections.push(`Depósitos\n${values.join(' + ')} = +${amount(report.deposits, currency)}`);
  }
  const rates = new Map<number, Movement[]>();
  report.included.filter(x => x.kind === 'withdrawal_cup' && x.rate).forEach(x => rates.set(x.rate!, [...(rates.get(x.rate!) ?? []), x]));
  rates.forEach((items, rate) => {
    const cupTotal = items.reduce((sum, x) => sum + x.inputAmount, 0);
    const usdtTotal = items.reduce((sum, x) => sum + Math.abs(x.balanceAmount), 0);
    sections.push(`Retiros CUP · tasa ${rate}\n${items.map(x => amount(x.inputAmount, 'CUP')).join(' + ')} = ${amount(cupTotal, 'CUP')}\n${amount(cupTotal, 'CUP')} ÷ ${rate} = −${amount(usdtTotal, 'USDT')}`);
  });
  const direct = report.included.filter(x => x.kind === 'withdrawal_direct');
  if (direct.length) {
    const values = direct.map(x => amount(Math.abs(x.balanceAmount), currency));
    sections.push(currency === 'USDT' ? `Directos · conversión 1×1\n${values.join(' + ')} = −${amount(report.directWithdrawn, 'USDT')}` : `Retiros CUP\n${values.join(' + ')} = −${amount(report.directWithdrawn, 'CUP')}`);
  }
  return `${profileName}\n${periodLabel}\n\n${openingLabel}: ${report.opening < 0 ? '−' : ''}${amount(report.opening, currency)}\n\n${sections.join('\n\n') || 'Sin movimientos'}\n\nTotal depósitos: +${amount(report.deposits, currency)}\nTotal retiros: −${amount(report.withdrawals, currency)}\nTotal en fondo: ${report.closing < 0 ? '−' : ''}${amount(report.closing, currency)}`;
}
