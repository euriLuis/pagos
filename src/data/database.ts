import * as SQLite from 'expo-sqlite';
import type { Currency, Movement, MovementKind, Profile, Rates } from '../domain/types';
import { calculateMovement, rateForCup } from '../domain/accounting';
import { normalizeCurrencyAmount } from '../shared/money';

const db = SQLite.openDatabaseSync('cuentas.db');
export async function runMigrations() {
  await db.execAsync(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS profiles(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,currency TEXT NOT NULL CHECK(currency IN('USDT','CUP')),initial_balance REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY AUTOINCREMENT,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,kind TEXT NOT NULL,input_amount REAL NOT NULL,balance_amount REAL NOT NULL,rate REAL,note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value REAL NOT NULL);`);
  await db.execAsync(`UPDATE profiles SET initial_balance=CASE WHEN currency='USDT' THEN ROUND(initial_balance,3) ELSE ROUND(initial_balance,0) END;
    UPDATE movements SET input_amount=CASE WHEN kind='withdrawal_cup' THEN ROUND(input_amount,0) WHEN (SELECT currency FROM profiles WHERE id=movements.profile_id)='USDT' THEN ROUND(input_amount,3) ELSE ROUND(input_amount,0) END,
      balance_amount=CASE WHEN (SELECT currency FROM profiles WHERE id=movements.profile_id)='USDT' THEN ROUND(balance_amount,3) ELSE ROUND(balance_amount,0) END;`);
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) count FROM profiles');
  if (!row?.count) await db.withExclusiveTransactionAsync(async tx => {
    const now = new Date().toISOString();
    await tx.runAsync('INSERT INTO profiles(name,currency,initial_balance,created_at) VALUES(?,?,?,?)', 'Fondo USDT', 'USDT', 0, now);
    await tx.runAsync('INSERT INTO profiles(name,currency,initial_balance,created_at) VALUES(?,?,?,?)', 'Cuenta CUP 1', 'CUP', 0, now);
    await tx.runAsync('INSERT INTO profiles(name,currency,initial_balance,created_at) VALUES(?,?,?,?)', 'Cuenta CUP 2', 'CUP', 0, now);
  });
  for (const [key, value] of Object.entries({ under50: 1010, from50: 1000, from100: 990, from500: 980 })) await db.runAsync('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)', key, value);
}
export async function listProfiles() { return db.getAllAsync<Profile>(`SELECT p.id,p.name,p.currency,p.initial_balance initialBalance,p.initial_balance+COALESCE(SUM(m.balance_amount),0) currentBalance,p.created_at createdAt FROM profiles p LEFT JOIN movements m ON m.profile_id=p.id GROUP BY p.id ORDER BY p.id`); }
export async function saveProfile(id: number | null, name: string, initial: number) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Escribe el nombre de la cuenta.');
  const currency = id ? (await db.getFirstAsync<{ currency: Currency }>('SELECT currency FROM profiles WHERE id=?', id))?.currency : 'CUP';
  if (!currency) throw new Error('El perfil ya no está disponible.');
  const normalized = normalizeCurrencyAmount(initial, currency);
  if (!Number.isFinite(normalized)) throw new Error('Escribe un monto inicial válido.');
  if (id) return db.runAsync('UPDATE profiles SET name=?,initial_balance=? WHERE id=?', trimmedName, normalized, id);
  return db.runAsync('INSERT INTO profiles(name,currency,initial_balance,created_at) VALUES(?,?,?,?)', trimmedName, currency, normalized, new Date().toISOString());
}
export async function listMovements(profileId: number) { return db.getAllAsync<Movement>('SELECT id,profile_id profileId,kind,input_amount inputAmount,balance_amount balanceAmount,rate,note,created_at createdAt FROM movements WHERE profile_id=? ORDER BY created_at DESC,id DESC', profileId); }
export async function addMovement(profileId: number, kind: MovementKind, input: number, note: string) {
  const profile = await db.getFirstAsync<{ currency: Currency }>('SELECT currency FROM profiles WHERE id=?', profileId);
  if (!profile) throw new Error('El perfil ya no está disponible.');
  const rate = kind === 'withdrawal_cup' ? rateForCup(normalizeCurrencyAmount(input, 'CUP'), await getRates()) : null;
  const movement = calculateMovement(profile.currency, kind, input, rate);
  return db.runAsync('INSERT INTO movements(profile_id,kind,input_amount,balance_amount,rate,note,created_at) VALUES(?,?,?,?,?,?,?)', profileId, kind, movement.inputAmount, movement.balanceAmount, movement.rate, note.trim(), new Date().toISOString());
}
export async function removeMovement(id: number) { return db.runAsync('DELETE FROM movements WHERE id=?', id); }
export async function getRates(): Promise<Rates> { const rows = await db.getAllAsync<{ key: keyof Rates; value: number }>('SELECT key,value FROM settings'); return Object.fromEntries(rows.map(x => [x.key, x.value])) as unknown as Rates; }
export async function saveRates(rates: Rates) { const entries = Object.entries(rates) as [keyof Rates, number][]; if (entries.some(([, value]) => !Number.isFinite(value) || value <= 0)) throw new Error('Todas las tasas deben ser mayores que cero.'); await db.withExclusiveTransactionAsync(async tx => { for (const [key, value] of entries) await tx.runAsync('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', key, value); }); }
