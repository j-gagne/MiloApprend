import type { CompleteWordVariant, ContentIssue, Word, Sentence } from '../content/model.ts';
import type { ContentService } from '../content/service.ts';
import { contentService } from '../content/service.ts';
import { validateCompleteWordVariant } from '../content/validation.ts';
import { isValidWeek } from '../content/selectors.ts';
import type { Challenge, CompletionSlot } from './complete-word.ts';
import { activityToExercise, toCompletionBoard } from './completion-content.ts';

export interface ContentChallenge extends Challenge {
  readonly slots: readonly CompletionSlot[];
  readonly wordId: string;
  readonly variantId: string;
  readonly introducedInWeek: number;
  readonly source: 'school' | 'practice' | 'unspecified';
}

export function wordToChallenge(service: ContentService, word: Word, variant: CompleteWordVariant, week = service.activeWeek): {
  challenge?: ContentChallenge; issues: ContentIssue[];
} {
  const program = service.getProgram();
  const issues = validateCompleteWordVariant(program, word, variant, week);
  if (issues.some((item) => item.severity === 'error')) return { issues };
  const segmentation = word.segmentations.find((item) => item.id === variant.segmentationId)!;
  const board = toCompletionBoard(service, segmentation, variant);
  return { issues, challenge: {
    id: `${word.id}:${variant.id}`, word: word.text, audioText: word.audioText, targetType: 'word',
    wordId: word.id, variantId: variant.id, introducedInWeek: word.introducedInWeek,
    source: word.tags?.includes('practice') ? 'practice' : word.tags?.includes('school') ? 'school' : 'unspecified',
    ...board, missingIndex: board.slots[0].segmentIndex,
    image: word.imageAsset && 'emoji' in word.imageAsset ? word.imageAsset
      : { emoji: '🖼️', label: word.imageAsset?.label ?? 'Illustration indisponible', src: word.imageAsset && 'src' in word.imageAsset ? word.imageAsset.src : undefined },
    audioSrc: word.audioAsset ?? undefined,
  } };
}

export function getCompleteWordChallenges(service: ContentService = contentService, week = service.activeWeek) {
  const issues: ContentIssue[] = [];
  if (!isValidWeek(service.getProgram(), week)) {
    issues.push({ severity: 'error', code: 'invalid-week', path: 'activeWeek', message: `Semaine active ${week} inconnue.` });
    return { challenges: [] as ContentChallenge[], issues };
  }
  const candidates = service.getAvailableWords(week).flatMap((word) =>
    (word.completeWord ?? []).filter((variant) => !(service.getProgram().activities ?? [])
      .some((activity) => activity.id === `${word.id}:${variant.id}`)).map((variant) => ({ word, variant })));
  candidates.sort((a, b) => (a.variant.order ?? Infinity) - (b.variant.order ?? Infinity));
  const challenges: ContentChallenge[] = [];
  for (const { word, variant } of candidates) {
    const result = wordToChallenge(service, word, variant, week);
    issues.push(...result.issues);
    if (result.challenge && !challenges.some((item) => item.id === result.challenge!.id)) challenges.push(result.challenge);
  }
  for (const activity of service.getProgram().activities ?? []) {
    const word = service.getProgram().units.find((unit): unit is Word | Sentence => unit.id === activity.targetId && (unit.type === 'word' || unit.type === 'sentence'));
    if (!word) continue;
    const result = activityToExercise(service, activity, week);
    issues.push(...result.issues);
    if (!result.exercise) continue;
    const board = result.exercise;
    const asset = word.type === 'word' ? word.imageAsset : undefined;
    challenges.push({ ...board, id: activity.id, word: word.display, audioText: word.audioText, targetType: word.type,
      wordId: word.id, variantId: activity.id, introducedInWeek: word.introducedInWeek,
      source: word.tags?.includes('practice') ? 'practice' : word.tags?.includes('school') ? 'school' : 'unspecified',
      missingIndex: board.slots[0].segmentIndex,
      image: asset && 'emoji' in asset ? asset
        : { emoji: word.type === 'sentence' ? '📖' : '🖼️', label: asset?.label ?? (word.type === 'sentence' ? 'Une phrase à compléter' : 'Illustration indisponible'), src: asset && 'src' in asset ? asset.src : undefined },
      audioSrc: word.audioAsset ?? undefined,
    });
  }
  const order = new Map(candidates.map(({ word, variant }) => [`${word.id}:${variant.id}`, variant.order ?? Infinity]));
  for (const activity of service.getProgram().activities ?? []) order.set(activity.id, activity.order ?? Infinity);
  challenges.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
  return { challenges, issues };
}
