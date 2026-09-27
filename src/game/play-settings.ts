export type GameMode = 'individual' | 'chain';
export type ChainLength = 2 | 3;
export interface PlaySettings { readonly gameMode?: GameMode; readonly chainLength?: ChainLength }
export const DEFAULT_GAME_MODE: GameMode = 'individual';
export const DEFAULT_CHAIN_LENGTH: ChainLength = 3;
