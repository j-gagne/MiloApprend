import type { CompleteWordVariant, ContentIssue, Word } from '../content/model.ts';
import type { ContentService } from '../content/service.ts';
import { contentService } from '../content/service.ts';
import { validateCompleteWordVariant } from '../content/validation.ts';
import { activityCatalog, isCompletionTarget } from '../content/activity-catalog.ts';
import { createContentRepository } from '../content/repository.ts';
import { createContentService } from '../content/service.ts';
import { isValidWeek } from '../content/selectors.ts';
import type { Challenge, CompletionSlot } from './complete-word.ts';
import { activityToExercise, toCompletionBoard } from './completion-content.ts';
import { activitySegmentation } from '../content/activity-segmentation.ts';
import { getPedagogicalReading, type PedagogicalReading } from '../content/segmented-reading.ts';

export interface ContentChallenge extends Challenge {
  readonly pedagogicalReading?: PedagogicalReading | null;
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
    pedagogicalReading: getPedagogicalReading(program, word, segmentation, week),
  } };
}

export function getCompleteWordChallenges(service: ContentService = contentService, week = service.activeWeek) {
  const issues: ContentIssue[] = [];
  if (!isValidWeek(service.getProgram(), week)) {
    issues.push({ severity: 'error', code: 'invalid-week', path: 'activeWeek', message: `Semaine active ${week} inconnue.` });
    return { challenges: [] as ContentChallenge[], issues };
  }
  const program = service.getProgram();
  const activities = activityCatalog(program, week);
  const snapshot = createContentService(createContentRepository({ ...program, activities }), week);
  const challenges: ContentChallenge[] = [];
  for (const activity of activities) {
    const target = program.units.find((unit) => unit.id === activity.targetId);
    if (!target || !isCompletionTarget(target)) continue;
    const legacy = target.type === 'word' && !(program.activities ?? []).some((item) => item.id === activity.id)
      ? target.completeWord?.find((item) => `${target.id}:${item.id}` === activity.id) : undefined;
    if (legacy && target.type === 'word') {
      const legacyIssues = validateCompleteWordVariant(program, target, legacy, week);
      if (legacyIssues.some((item) => item.severity === 'error')) { issues.push(...legacyIssues); continue; }
    }
    const result = activityToExercise(snapshot, activity, week);
    issues.push(...result.issues);
    if (!result.exercise) continue;
    const board = result.exercise;
    const asset = target.type === 'syllable' ? undefined : target.imageAsset;
    challenges.push({ ...board, id: activity.id, word: target.display, audioText: target.audioText, targetType: target.type,
      wordId: target.id, variantId: activity.id.startsWith(`${target.id}:`) ? activity.id.slice(target.id.length + 1) : activity.id,
      introducedInWeek: target.introducedInWeek,
      source: target.tags?.includes('practice') ? 'practice' : target.tags?.includes('school') ? 'school' : 'unspecified',
      missingIndex: board.slots[0].segmentIndex,
      image: asset && 'emoji' in asset ? asset
        : { emoji: target.type === 'sentence' ? '📖' : target.type === 'syllable' ? '' : '🖼️',
          label: asset?.label ?? (target.type === 'sentence' ? 'Une phrase à compléter' : 'Illustration indisponible'),
          src: asset && 'src' in asset ? asset.src : undefined },
      audioSrc: target.audioAsset ?? undefined,
      pedagogicalReading: getPedagogicalReading(program, target, activitySegmentation(program, activity), week),
    });
  }
  const order = new Map(activities.map((activity) => [activity.id, activity.order ?? Infinity]));
  challenges.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
  return { challenges, issues };
}
