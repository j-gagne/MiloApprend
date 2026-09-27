import type { CompletionActivity, LearningProgram } from '../content/model.ts';
import { missingIndexes } from '../content/model.ts';
export { blockText as segmentText } from '../content/construction.ts';

// Projection de compatibilité pour l'éditeur : aucun changement du seed.
export function parentActivities(program: LearningProgram): CompletionActivity[] {
  const activities = new Map<string, CompletionActivity>();
  for (const unit of program.units) {
    if (unit.type !== 'word') continue;
    for (const variant of unit.completeWord ?? []) {
      const segmentation = unit.segmentations.find((item) => item.id === variant.segmentationId);
      if (!segmentation) continue;
      activities.set(`${unit.id}:${variant.id}`, {
        id: `${unit.id}:${variant.id}`, type: 'complete-segments', targetId: unit.id, segmentationId: segmentation.id,
        missingSegmentIndexes: missingIndexes(variant), distractorUnitIds: variant.distractorUnitIds,
        enabled: variant.enabled, availableFromWeek: variant.availableFromWeek,
        answerPosition: variant.answerPosition, order: variant.order,
      });
    }
  }
  for (const activity of program.activities ?? []) activities.set(activity.id, activity);
  return [...activities.values()];
}

export function withActivity(program: LearningProgram, activity: CompletionActivity): LearningProgram {
  return { ...program, activities: [...(program.activities ?? []).filter((item) => item.id !== activity.id), activity] };
}
