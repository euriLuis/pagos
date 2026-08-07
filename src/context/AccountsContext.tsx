import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { listMovements, listProfiles } from '../data/database';
import type { Movement, Profile } from '../domain/types';
type Value = { profiles: Profile[]; selected: Profile | null; movements: Movement[]; balance: number; loading: boolean; select: (id: number) => void; refresh: () => Promise<void> };
const Context = createContext<Value | null>(null);
export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]); const [selectedId, setSelectedId] = useState<number | null>(null); const [movements, setMovements] = useState<Movement[]>([]); const [loading, setLoading] = useState(true);
  const refreshSequence = useRef(0);
  const selectedIdRef = useRef<number | null>(null);
  const committedIdRef = useRef<number | null>(null);
  const refresh = useCallback(async () => { const sequence = ++refreshSequence.current; const requestedId = selectedIdRef.current; setLoading(true); try { const next = await listProfiles(); const id = requestedId && next.some(x => x.id === requestedId) ? requestedId : next[0]?.id ?? null; const nextMovements = id ? await listMovements(id) : []; if (sequence !== refreshSequence.current) return; selectedIdRef.current = id; committedIdRef.current = id; setProfiles(next); setSelectedId(id); setMovements(nextMovements); } finally { if (sequence === refreshSequence.current) setLoading(false); } }, []);
  useEffect(() => { void refresh().catch(error => Alert.alert('No se pudieron cargar las cuentas', error instanceof Error ? error.message : 'Inténtalo otra vez.')); }, [refresh]);
  const selected = profiles.find(x => x.id === selectedId) ?? null;
  const select = useCallback((id: number) => { if (id === selectedIdRef.current) return; selectedIdRef.current = id; refreshSequence.current += 1; void refresh().catch(error => { if (selectedIdRef.current === id) selectedIdRef.current = committedIdRef.current; Alert.alert('No se pudo cambiar de cuenta', error instanceof Error ? error.message : 'Inténtalo otra vez.'); }); }, [refresh]);
  const value = useMemo(() => ({ profiles, selected, movements, balance: selected?.currentBalance ?? 0, loading, select, refresh }), [profiles, selected, movements, loading, select, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccounts() { const value = useContext(Context); if (!value) throw new Error('AccountsProvider requerido'); return value; }
