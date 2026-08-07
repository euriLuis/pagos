export type Currency = 'USDT' | 'CUP';
export interface Profile { id: number; name: string; currency: Currency; initialBalance: number; currentBalance: number; createdAt: string }
export type MovementKind = 'deposit' | 'withdrawal_cup' | 'withdrawal_direct';
export interface Movement { id: number; profileId: number; kind: MovementKind; inputAmount: number; balanceAmount: number; rate: number | null; note: string; createdAt: string }
export interface Rates { under50: number; from50: number; from100: number; from500: number }
