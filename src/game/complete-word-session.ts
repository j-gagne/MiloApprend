import type { ContentIssue } from '../content/model.ts';
import type { ContentService } from '../content/service.ts';
import { contentService } from '../content/service.ts';
import { getCompleteWordChallenges } from './complete-word-content.ts';
import type { ContentChallenge } from './complete-word-content.ts';

export type RandomSource = () => number; // Valeur comprise dans [0, 1).
export interface SessionStrategy { readonly size: number; readonly recentCount: number }
export const COMPLETE_WORD_SESSION_STRATEGY: SessionStrategy = Object.freeze({ size: 5, recentCount: 3 });
export interface SessionOptions {
  readonly random?: RandomSource;
  readonly strategy?: SessionStrategy;
}

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Pur : les diagnostics sont retournés, la RNG et le service sont injectables.
export function generateCompleteWordSession(service: ContentService = contentService, options: SessionOptions = {}): {
  challenges: readonly ContentChallenge[]; issues: ContentIssue[];
} {
  const random = options.random ?? Math.random;
  const requested = options.strategy ?? COMPLETE_WORD_SESSION_STRATEGY;
  const eligible = getCompleteWordChallenges(service);
  const issues = [...eligible.issues];
  let strategy = requested;
  if (!Number.isInteger(requested.size) || requested.size < 1 || !Number.isInteger(requested.recentCount)
    || requested.recentCount < 0 || requested.recentCount > requested.size) {
    issues.push({ severity: 'warning', code: 'invalid-session-strategy', path: 'complete-word.session',
      message: 'Stratégie invalide ; utilisation de la stratégie standard.' });
    strategy = COMPLETE_WORD_SESSION_STRATEGY;
  }
  const { size, recentCount } = strategy;
  const candidates = eligible.challenges;
  // Grouper par texte évite également le même mot sous deux identifiants différents.
  const byWord = new Map<string, ContentChallenge[]>();
  for (const candidate of candidates) {
    const group = byWord.get(candidate.word) ?? [];
    group.push(candidate);
    byWord.set(candidate.word, group);
  }
  const groups = [...byWord.values()];
  if (groups.length < size) {
    issues.push({ severity: 'warning', code: 'insufficient-words', path: 'complete-word.session',
      message: `${groups.length} mot(s) distinct(s), ${candidates.length} variante(s) admissible(s) pour ${size} défis demandés en semaine ${service.activeWeek}. Session raccourcie, sans répétition de mot.` });
    return { challenges: shuffle(groups.map((group) => shuffle(group, random)[0]), random), issues };
  }
  // Une variante récente d'un ancien mot reste de la révision.
  const introduced = (group: ContentChallenge[]) => Math.min(...group.map((item) => item.introducedInWeek));
  const latestWeek = Math.max(...groups.map(introduced));
  const recent = shuffle(groups.filter((group) => introduced(group) === latestWeek), random);
  const review = shuffle(groups.filter((group) => introduced(group) < latestWeek), random);
  const picked = [...recent.slice(0, recentCount), ...review.slice(0, size - recentCount)];
  // Compléter avec d'autres mots distincts si l'un des groupes est insuffisant.
  const remaining = shuffle(groups.filter((group) => !picked.includes(group)), random);
  picked.push(...remaining.slice(0, size - picked.length));
  const selected = picked.map((group) => shuffle(group, random)[0]);
  const selectedIds = new Set(selected.map((item) => item.id));
  // Mélange final indépendant de la catégorie et de l'ordre de sélection.
  return { challenges: shuffle(candidates.filter((item) => selectedIds.has(item.id)), random), issues };
}

export function createCompleteWordSession(service: ContentService = contentService, options: SessionOptions = {}): readonly ContentChallenge[] {
  const result = generateCompleteWordSession(service, options);
  for (const issue of result.issues) {
    // Les avertissements de segmentation sont déjà rapportés par le service de contenu.
    if (issue.path === 'complete-word.session' || issue.severity === 'error') {
      console.warn(`[session:${issue.code}] ${issue.message}`);
    }
  }
  return result.challenges;
}
