import { cupToUsdt, rateForCup, roundUsdt, signedAmount } from '../src/domain/accounting';
import { buildReport, formatReportText, periodRange } from '../src/domain/reporting';
const rates = { under50: 1100, from50: 1050, from100: 1000, from500: 950 };
function equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Esperado ${expected}, recibido ${actual}`); }
equal(rateForCup(49999, rates), 1100);
equal(rateForCup(50000, rates), 1050);
equal(rateForCup(99999, rates), 1050);
equal(rateForCup(100000, rates), 1000);
equal(rateForCup(499999, rates), 1000);
equal(rateForCup(500000, rates), 950);
equal(cupToUsdt(500000, rates).usdt, 526.316);
equal(roundUsdt(1.23456), 1.235);
equal(signedAmount('deposit', 25), 25);
equal(signedAmount('withdrawal', 25), -25);
const monday = periodRange('week', false, new Date(2026, 7, 7, 15));
equal(monday.start.getDay(), 1);
equal((monday.end.getTime() - monday.start.getTime()) / 86400000, 7);
const report = buildReport([
  { id: 1, profileId: 1, kind: 'deposit', inputAmount: 20, balanceAmount: 20, rate: null, note: '', createdAt: new Date(2026, 7, 4, 10).toISOString() },
  { id: 2, profileId: 1, kind: 'withdrawal_direct', inputAmount: 5, balanceAmount: -5, rate: null, note: '', createdAt: new Date(2026, 7, 5, 10).toISOString() },
], 100, new Date(2026, 7, 4), new Date(2026, 7, 11));
equal(report.opening, 100); equal(report.deposits, 20); equal(report.withdrawals, 5); equal(report.closing, 115);
const text = formatReportText('Fondo', 'USDT', 'Día: 04 ago 2026', report);
equal(text.includes('Balance inicial del día: 100,000 USDT'), true);
equal(text.includes('Total en fondo: 115,000 USDT'), true);
const grouped = buildReport([
  { id: 3, profileId: 1, kind: 'withdrawal_cup', inputAmount: 50000, balanceAmount: -50, rate: 1000, note: '', createdAt: new Date(2026, 7, 5, 11).toISOString() },
  { id: 4, profileId: 1, kind: 'withdrawal_cup', inputAmount: 25000, balanceAmount: -25, rate: 1000, note: '', createdAt: new Date(2026, 7, 5, 12).toISOString() },
  { id: 5, profileId: 1, kind: 'withdrawal_direct', inputAmount: 10, balanceAmount: -10, rate: null, note: 'Zelle', createdAt: new Date(2026, 7, 5, 13).toISOString() },
], 200, new Date(2026, 7, 5), new Date(2026, 7, 6));
const groupedText = formatReportText('Fondo', 'USDT', 'Corte: 05/08/2026, 10:00', grouped);
equal(groupedText.includes('50.000 CUP + 25.000 CUP = 75.000 CUP'), true);
equal(groupedText.includes('Directos · conversión 1×1'), true);
equal(groupedText.includes('Total retiros: −85,000 USDT'), true);
console.log('accounting.test: ok');
