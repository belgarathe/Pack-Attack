export type Role = 'USER' | 'ADMIN' | 'SHOP_OWNER';

export type CardGame = 'MAGIC_THE_GATHERING' | 'ONE_PIECE' | 'POKEMON' | 'LORCANA';

export type BattleStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

export type BattleMode = 'NORMAL' | 'UPSIDE_DOWN' | 'JACKPOT';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  coins: number;
}

