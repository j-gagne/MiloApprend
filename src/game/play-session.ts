import type { ContentService } from '../content/service.ts';
import { createCompleteWordSession } from './complete-word-session.ts';
import type { RandomSource } from './complete-word-session.ts';
import { createChain } from './chain.ts';
import type { ChainState } from './chain.ts';
import type { ContentChallenge } from './complete-word-content.ts';
import { DEFAULT_CHAIN_LENGTH, DEFAULT_GAME_MODE } from './play-settings.ts';
import type { GameMode, PlaySettings } from './play-settings.ts';

export interface PlaySession {
  readonly mode: GameMode;
  readonly challenges: readonly ContentChallenge[];
  readonly chain?: ChainState;
}

// A session currently contains either the usual individual targets or one chain.
// Target selection, availability, overrides and week filters remain in the existing generator.
export function createPlaySession(service: ContentService, settings: PlaySettings = {}, random?: RandomSource): PlaySession {
  const mode = settings.gameMode ?? DEFAULT_GAME_MODE;
  const size = settings.chainLength ?? DEFAULT_CHAIN_LENGTH;
  const challenges = createCompleteWordSession(service, { random,
    ...(mode === 'chain' ? { strategy: { size, recentCount: Math.ceil(size * 3 / 5) } } : {}) });
  if (mode === 'individual' || challenges.length < 2) return { mode: 'individual', challenges };
  return { mode, challenges, chain: createChain(challenges) };
}
