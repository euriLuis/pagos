import { calculateMovement, cupToUsdt, rateForCup, roundUsdt } from '../src/domain/accounting';
import { buildReport, formatReportText, periodRange } from '../src/domain/reporting';
import type { Movement } from '../src/domain/types';
import { formatMoney, parseMoneyInput, parseNumberInput } from '../src/shared/money';

const rates = { under50: 1100, from50: 1050, from100: 1000, from500: 950 };
function equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Esperado ${expected}, recibido ${actual}`); }
function throws(action: () => unknown, expected: string) { try { action(); } catch (error) { if (error instanceof Error && error.message.includes(expected)) return; throw error; } throw new Error(`Se esperaba un error que incluyera: ${expected}`); }
const movement = (value: Partial<Movement> & Pick<Movement, 'id' | 'kind' | 'balanceAmount' | 'createdAt'>): Movement => ({ profileId: 1, inputAmount: Math.abs(value.balanceAmount), rate: null, note: '', ...value });

// Límites de tasas y precisión USDT.
equal(rateForCup(49999, rates), 1100);
equal(rateForCup(50000, rates), 1050);
equal(rateForCup(99999, rates), 1050);
equal(rateForCup(100000, rates), 1000);
equal(rateForCup(499999, rates), 1000);
equal(rateForCup(500000, rates), 950);
equal(cupToUsdt(500000, rates).usdt, 526.316);
equal(roundUsdt(1.23456), 1.235);
equal(roundUsdt(-1.2345), -1.235);
throws(() => cupToUsdt(1, { under50: 3000, from50: 3000, from100: 3000, from500: 3000 }), '0.001 USDT');

// La función central deriva signos, moneda, tasa y redondeo; la pantalla no puede alterarlos.
equal(calculateMovement('USDT', 'deposit', 100.1234, null).balanceAmount, 100.123);
equal(calculateMovement('USDT', 'withdrawal_direct', 100, null).balanceAmount, -100);
equal(calculateMovement('CUP', 'deposit', 100.6, null).balanceAmount, 101);
equal(calculateMovement('CUP', 'withdrawal_direct', 100.6, null).balanceAmount, -101);
const converted = calculateMovement('USDT', 'withdrawal_cup', 50000, 1000);
equal(converted.inputAmount, 50000); equal(converted.balanceAmount, -50); equal(converted.rate, 1000);
throws(() => calculateMovement('CUP', 'withdrawal_cup', 50000, 1000), 'perfil USDT');
throws(() => calculateMovement('USDT', 'deposit', 0, null), 'mayor que cero');
throws(() => calculateMovement('USDT', 'withdrawal_cup', 50000, 0), 'tasa válida');
throws(() => calculateMovement('USDT', 'withdrawal_cup', 1, 3000), '0.001 USDT');

// Entrada y salida monetaria: coma decimal móvil, formatos mixtos y rechazo de errores.
equal(formatMoney(100, 'USDT'), '100.000 USDT');
equal(formatMoney(1000.5, 'USDT'), '1,000.500 USDT');
equal(formatMoney(50000, 'CUP'), '50,000 CUP');
equal(parseMoneyInput('100.1234', 'USDT'), 100.123);
equal(parseMoneyInput('100,125', 'USDT'), 100.125);
equal(parseMoneyInput('1,000.500', 'USDT'), 1000.5);
equal(parseMoneyInput('1.000,500', 'USDT'), 1000.5);
equal(parseMoneyInput('50,000', 'CUP'), 50000);
equal(parseMoneyInput('50.000', 'CUP'), 50000);
equal(parseMoneyInput('50 000', 'CUP'), 50000);
equal(parseMoneyInput('1 000.500', 'USDT'), 1000.5);
equal(parseMoneyInput('100.6', 'CUP'), 101);
equal(parseMoneyInput('0,125', 'USDT'), 0.125);
equal(parseNumberInput('1010.5'), 1010.5);
equal(parseNumberInput('990,500'), 990.5);
equal(Number.isNaN(parseNumberInput('1e3')), true);
equal(Number.isNaN(parseNumberInput('0x10')), true);
equal(Number.isNaN(parseNumberInput('1,2.3')), true);
equal(Number.isNaN(parseNumberInput('12,34.56')), true);
equal(Number.isNaN(parseNumberInput('1 2')), true);

// Períodos actuales/anteriores, incluidos cambios de año.
const monday = periodRange('week', false, new Date(2026, 7, 7, 15));
equal(monday.start.getDay(), 1);
equal((monday.end.getTime() - monday.start.getTime()) / 86400000, 7);
const previousDay = periodRange('day', true, new Date(2026, 0, 1, 15));
equal(previousDay.start.getFullYear(), 2025); equal(previousDay.start.getMonth(), 11); equal(previousDay.start.getDate(), 31);
equal(previousDay.end.getFullYear(), 2026); equal(previousDay.end.getMonth(), 0); equal(previousDay.end.getDate(), 1);
const previousMonth = periodRange('month', true, new Date(2026, 0, 15));
equal(previousMonth.start.getFullYear(), 2025); equal(previousMonth.start.getMonth(), 11); equal(previousMonth.start.getDate(), 1);
equal(previousMonth.end.getFullYear(), 2026); equal(previousMonth.end.getMonth(), 0); equal(previousMonth.end.getDate(), 1);

// El corte usa [inicio, fin), calcula el balance inicial y excluye exactamente el fin.
const start = new Date(2026, 7, 5, 10);
const end = new Date(2026, 7, 5, 14);
const cut = buildReport([
  movement({ id: 1, kind: 'deposit', balanceAmount: 10, createdAt: new Date(start.getTime() - 1).toISOString() }),
  movement({ id: 2, kind: 'deposit', balanceAmount: 20, createdAt: start.toISOString() }),
  movement({ id: 3, kind: 'withdrawal_direct', balanceAmount: -5, createdAt: new Date(2026, 7, 5, 13).toISOString() }),
  movement({ id: 4, kind: 'deposit', balanceAmount: 999, createdAt: end.toISOString() }),
], 100, start, end);
equal(cut.opening, 110); equal(cut.included.length, 2); equal(cut.deposits, 20); equal(cut.withdrawals, 5); equal(cut.closing, 125);
const inheritedSign = buildReport([
  movement({ id: 5, kind: 'deposit', balanceAmount: -10, createdAt: new Date(2026, 7, 5, 12).toISOString() }),
], 100, start, end);
equal(inheritedSign.deposits, 10); equal(inheritedSign.closing, 90);

// Informe: tasas históricas, orden cronológico, notas y directos agrupados 1×1.
const grouped = buildReport([
  movement({ id: 6, kind: 'withdrawal_direct', inputAmount: 5, balanceAmount: -5, note: 'Clásica', createdAt: new Date(2026, 7, 5, 15).toISOString() }),
  movement({ id: 3, kind: 'withdrawal_cup', inputAmount: 50000, balanceAmount: -50, rate: 1000, note: '', createdAt: new Date(2026, 7, 5, 11).toISOString() }),
  movement({ id: 5, kind: 'withdrawal_direct', inputAmount: 10, balanceAmount: -10, note: 'Zelle', createdAt: new Date(2026, 7, 5, 13).toISOString() }),
  movement({ id: 4, kind: 'withdrawal_cup', inputAmount: 25000, balanceAmount: -25, rate: 1000, note: 'Entrega', createdAt: new Date(2026, 7, 5, 12).toISOString() }),
  movement({ id: 7, kind: 'withdrawal_cup', inputAmount: 52500, balanceAmount: -50, rate: 1050, note: '', createdAt: new Date(2026, 7, 5, 14).toISOString() }),
], 250, new Date(2026, 7, 5), new Date(2026, 7, 6));
const groupedText = formatReportText('Fondo', 'USDT', 'Corte: 05/08/2026, 10:00', grouped);
equal(groupedText.includes('50,000 CUP + 25,000 CUP (Entrega) = 75,000 CUP'), true);
equal(groupedText.includes('50,000 CUP ÷ 1000 = 50.000 USDT'), true);
equal(groupedText.includes('Total convertido: −75.000 USDT'), true);
equal(groupedText.includes('Retiros CUP · tasa 1050'), true);
equal(groupedText.includes('10.000 USDT (Zelle) + 5.000 USDT (Clásica) = −15.000 USDT'), true);
equal(groupedText.indexOf('Zelle') < groupedText.indexOf('Clásica'), true);
equal(groupedText.includes('Total retiros: −140.000 USDT'), true);
equal(groupedText.includes('Total en fondo: 110.000 USDT'), true);

const dailyText = formatReportText('Fondo', 'USDT', 'Día: 05 ago 2026', cut);
equal(dailyText.includes('Balance inicial del día: 110.000 USDT'), true);
equal(dailyText.includes('Total en fondo: 125.000 USDT'), true);
console.log('accounting.test: ok');
