import type { CompletionActivity, CompletionTarget, LearningProgram } from './model.ts';
import { missingIndexes } from './model.ts';
import { activitySegmentation } from './activity-segmentation.ts';
import { primaryConstruction } from './construction.ts';
import { comparableText } from './text.ts';
import { isAvailable } from './selectors.ts';
import { isAnswerUnit, validateCompletionActivity } from './validation.ts';

// Projection des variantes historiques ; les configurations explicites gardent leurs IDs.
export function explicitActivities(program: LearningProgram): CompletionActivity[] {
  const activities = new Map<string, CompletionActivity>();
  for (const unit of program.units) {
    if (unit.type !== 'word') continue;
    for (const variant of unit.completeWord ?? []) {
      activities.set(`${unit.id}:${variant.id}`, { ...variant, id: `${unit.id}:${variant.id}`,
        missingSegmentIndex: undefined, missingSegmentIndexes: missingIndexes(variant),
        type: 'complete-segments', targetId: unit.id });
    }
  }
  for (const activity of program.activities ?? []) activities.set(activity.id, activity);
  return [...activities.values()];
}
export function activitySignature(program: LearningProgram, activity: CompletionActivity): string {
  const construction = activitySegmentation(program, activity);
  return JSON.stringify([activity.targetId, construction?.segments, [...missingIndexes(activity)].sort((a, b) => a - b)]);
}
export const isAutomatic = (activity: CompletionActivity) => activity.id.startsWith('generated:');

export function automaticActivities(program: LearningProgram, week: number): CompletionActivity[] {
  const result: CompletionActivity[] = [];
  for (const target of program.units) {
    if (!['word', 'sentence', 'syllable'].includes(target.type)) continue;
    const construction = target.type === 'syllable' ? { id: 'self', segments: [{ unitId: target.id }] } : primaryConstruction(target);
    if (!construction) continue;
    const indexes = construction.segments.flatMap((block, i) => 'unitId' in block ? [i] : []);
    const variants = indexes.map((index) => [index]);
    if (indexes.length > 1) variants.push(indexes);
    for (const missing of variants) {
      const answers = missing.map((i) => construction.segments[i]).flatMap((block) => 'unitId' in block
        ? program.units.filter((unit) => unit.id === block.unitId) : []);
      const seen = new Set(answers.map((unit) => comparableText(unit.display)));
      const distractors = program.units.filter((unit) => isAnswerUnit(unit) && isAvailable(program, unit, week))
        .sort((a, b) => Number(answers.some((unit) => unit.type === b.type)) - Number(answers.some((unit) => unit.type === a.type)));
      const ids: string[] = [];
      for (const unit of distractors) {
        const text = comparableText(unit.display);
        if (seen.has(text)) continue;
        seen.add(text); ids.push(unit.id);
        if (ids.length === 2) break;
      }
      const activity: CompletionActivity = {
        id: `generated:${target.id}:${construction.id}:missing:${missing.join('-')}`,
        type: 'complete-segments', targetId: target.id,
        ...(target.type === 'syllable' ? { segmentation: construction } : { segmentationId: construction.id }),
        missingSegmentIndexes: missing, distractorUnitIds: ids, answerPosition: 1,
        label: missing.length > 1 ? (target.type === 'sentence' ? 'Construire la phrase' : 'Construire le mot')
          : `Trouver ${answers.map((unit) => unit.display).join(' + ')}`,
      };
      const snapshot = { ...program, activities: [activity] };
      if (!validateCompletionActivity(snapshot, activity, week).some((issue) => issue.severity === 'error')) {
        // Seule la cible syllabe de deux lettres est inactive par défaut, jamais ses usages comme bloc.
        const enabledByDefault = target.type !== 'syllable' || Array.from(target.display.normalize('NFC')).length !== 2;
        result.push({ ...activity, enabled: program.activityEnabled?.[activity.id] ?? enabledByDefault });
      }
    }
  }
  return result;
}

// Une configuration explicite (même désactivée) prend priorité sur l'automatique équivalente.
// Les configurations explicites distinctes restent conservées, y compris leurs distracteurs.
export function activityCatalog(program: LearningProgram, week: number, includeFuture = false): CompletionActivity[] {
  const explicit = explicitActivities(program);
  const signatures = new Set(explicit.map((activity) => activitySignature(program, activity)));
  const automatic = automaticActivities(program, week);
  if (includeFuture) {
    for (const at of program.weeks.map((item) => item.number).filter((at) => at > week)) {
      for (const activity of automaticActivities(program, at)) {
        if (!automatic.some((item) => item.id === activity.id)) automatic.push(activity);
      }
    }
  }
  return [...explicit, ...automatic.filter((activity) => !signatures.has(activitySignature(program, activity)))];
}
export function isCompletionTarget(unit: { type: string }): unit is CompletionTarget {
  return unit.type === 'word' || unit.type === 'sentence' || unit.type === 'syllable';
}
