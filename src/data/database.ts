import * as SQLite from 'expo-sqlite';
import type { Movement, MovementKind, Profile, Rates } from '../domain/types';

const db = SQLite.openDatabaseSync('cuentas.db');
export async function runMigrations() {
  await db.execAsync(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS profiles(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,currency TEXT NOT NULL CHECK(currency IN('USDT','CUP')),initial_balance REAL NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY AUTOINCREMENT,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,kind TEXT NOT NULL,input_amount REAL NOT NULL,balance_amount REAL NOT NULL,rate REAL,note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value REAL NOT NULL);`);
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
  if (id) return db.runAsync('UPDATE profiles SET name=?,initial_balance=? WHERE id=?', name.trim(), initial, id);
  return db.runAsync('INSERT INTO profiles(name,currency,initial_balance,created_at) VALUES(?,?,?,?)', name.trim(), 'CUP', initial, new Date().toISOString());
}
export async function listMovements(profileId: number) { return db.getAllAsync<Movement>('SELECT id,profile_id profileId,kind,input_amount inputAmount,balance_amount balanceAmount,rate,note,created_at createdAt FROM movements WHERE profile_id=? ORDER BY created_at DESC,id DESC', profileId); }
export async function addMovement(profileId: number, kind: MovementKind, input: number, balance: number, rate: number | null, note: string) { return db.runAsync('INSERT INTO movements(profile_id,kind,input_amount,balance_amount,rate,note,created_at) VALUES(?,?,?,?,?,?,?)', profileId, kind, input, balance, rate, note.trim(), new Date().toISOString()); }
export async function removeMovement(id: number) { return db.runAsync('DELETE FROM movements WHERE id=?', id); }
export async function getRates(): Promise<Rates> { const rows = await db.getAllAsync<{ key: keyof Rates; value: number }>('SELECT key,value FROM settings'); return Object.fromEntries(rows.map(x => [x.key, x.value])) as unknown as Rates; }
export async function saveRates(rates: Rates) { await db.withExclusiveTransactionAsync(async tx => { for (const [key, value] of Object.entries(rates)) await tx.runAsync('UPDATE settings SET value=? WHERE key=?', value, key); }); }
