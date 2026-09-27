import type { CompletionActivity, CompletionParameters, ContentIssue, Segmentation } from '../content/model.ts';
import { missingIndexes } from '../content/model.ts';
import { activitySegmentation } from '../content/activity-segmentation.ts';
import type { ContentService } from '../content/service.ts';
import { validateCompletionActivity } from '../content/validation.ts';
import type { Answer, CompletionBoard } from './complete-word.ts';
import type { CompletionTarget, ImageAsset } from '../content/model.ts';
import { constructionText, terminalSuffix } from '../content/construction.ts';

// Conversion commune, uniquement après validation des références et des emplacements.
export function toCompletionBoard(service: ContentService, segmentation: Segmentation, config: CompletionParameters): CompletionBoard {
  const units = service.getProgram().units;
  const segments = segmentation.segments.map((segment, index) => segmentation.surface?.[index] ?? ('unitId' in segment
    ? units.find((unit) => unit.id === segment.unitId)!.display
    : 'separator' in segment ? segment.separator : segment.literal));
  const indexes = missingIndexes(config);
  const expected = [...new Set(indexes.map((index) => segments[index]))];
  const choices: Answer[] = config.distractorUnitIds.map((id) => {
    const unit = units.find((item) => item.id === id)!;
    return { text: unit.display, kind: unit.type === 'letter' ? 'letter' : unit.type === 'syllable' ? 'syllable' : 'word' };
  });
  const answers: Answer[] = expected.map((text) => {
    const segment = segmentation.segments[indexes.find((index) => segments[index] === text)!];
    const unit = 'unitId' in segment ? units.find((item) => item.id === segment.unitId)! : undefined;
    return { text, kind: unit?.type === 'letter' ? 'letter' : unit?.type === 'syllable' ? 'syllable' : 'word' };
  });
  choices.splice(config.answerPosition ?? 0, 0, ...answers);
  return { segments, choices, ...(segmentation.gaps ? { gaps: segmentation.gaps } : {}), slots: indexes.map((segmentIndex) => ({ segmentIndex, expected: segments[segmentIndex] })) };
}

export interface CompletionExercise extends CompletionBoard {
  readonly id: string;
  readonly target: { readonly id: string; readonly type: CompletionTarget['type']; readonly text: string; readonly audioText: string; readonly imageAsset?: ImageAsset | null };
}

export function activityToExercise(service: ContentService, activity: CompletionActivity, week = service.activeWeek): {
  exercise?: CompletionExercise; issues: ContentIssue[];
} {
  const issues = validateCompletionActivity(service.getProgram(), activity, week);
  if (issues.some((issue) => issue.severity === 'error')) return { issues };
  const target = service.getProgram().units.find((unit) => unit.id === activity.targetId);
  if (!target || (target.type !== 'word' && target.type !== 'sentence' && target.type !== 'syllable')) return { issues };
  const segmentation = activitySegmentation(service.getProgram(), activity)!;
  const board = toCompletionBoard(service, segmentation, activity);
  const suffix = target.type === 'sentence' ? terminalSuffix(target.display, constructionText(service.getProgram(), segmentation)) : '';
  // Suffixe d'affichage ajouté après les blocs ; jamais un slot ni une réponse.
  const displayBoard = suffix ? { ...board, segments: [...board.segments, suffix],
    gaps: board.gaps ? [...board.gaps, ''] : undefined } : board;
  return { issues, exercise: { id: activity.id, target: {
    id: target.id, type: target.type, text: target.display, audioText: target.audioText,
    imageAsset: target.type === 'syllable' ? undefined : target.imageAsset,
  }, ...displayBoard } };
}
