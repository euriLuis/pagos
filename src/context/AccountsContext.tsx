import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listMovements, listProfiles } from '../data/database';
import type { Movement, Profile } from '../domain/types';
type Value = { profiles: Profile[]; selected: Profile | null; movements: Movement[]; balance: number; select: (id: number) => void; refresh: () => Promise<void> };
const Context = createContext<Value | null>(null);
export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]); const [selectedId, setSelectedId] = useState<number | null>(null); const [movements, setMovements] = useState<Movement[]>([]);
  const refresh = useCallback(async () => { const next = await listProfiles(); setProfiles(next); const id = selectedId && next.some(x => x.id === selectedId) ? selectedId : next[0]?.id ?? null; if (id !== selectedId) setSelectedId(id); setMovements(id ? await listMovements(id) : []); }, [selectedId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const selected = profiles.find(x => x.id === selectedId) ?? null;
  const value = useMemo(() => ({ profiles, selected, movements, balance: selected?.currentBalance ?? 0, select: setSelectedId, refresh }), [profiles, selected, movements, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccounts() { const value = useContext(Context); if (!value) throw new Error('AccountsProvider requerido'); return value; }
