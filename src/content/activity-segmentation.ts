import type { Activity, LearningProgram, Segmentation } from './model.ts';

export function activitySegmentation(program: LearningProgram, activity: Activity): Segmentation | undefined {
  if (activity.type === 'spell') return undefined;
  if (activity.segmentationId !== undefined) {
    if (activity.segmentation !== undefined) return undefined;
    const target = program.units.find((unit) => unit.id === activity.targetId);
    if (target?.type !== 'word' && target?.type !== 'sentence') return undefined;
    const matches = (target.segmentations ?? []).filter((item) => item.id === activity.segmentationId);
    return matches.length === 1 ? matches[0] : undefined;
  }
  return activity.segmentation;
}
