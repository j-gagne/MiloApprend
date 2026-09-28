import type { Activity, LearningProgram } from '../content/model.ts';
export { blockText as segmentText } from '../content/construction.ts';
export { explicitActivities as parentActivities } from '../content/activity-catalog.ts';
export function withActivity(program: LearningProgram, activity: Activity): LearningProgram {
  return { ...program, activities: [...(program.activities ?? []).filter((item) => item.id !== activity.id), activity] };
}
