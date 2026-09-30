import type { LearningProgram, LearningUnit, Segmentation } from '../content/model.ts';
import { isAvailable } from '../content/selectors.ts';
import { validateSegmentation } from '../content/validation.ts';

export function firstSegmentAudio(program: LearningProgram, target: LearningUnit, construction: Segmentation | undefined,
  missing: readonly number[], week: number): string | undefined {
  if (target.type !== 'word' || !construction || missing.length !== 1 || !isAvailable(program, target, week)
    || validateSegmentation(program, target, construction, week).some((issue) => issue.severity === 'error')) return undefined;
  const block = construction.segments[missing[0]];
  if (!block || !('unitId' in block)) return undefined; // A literal cannot be an exercise answer.
  const unit = program.units.find((item) => item.id === block.unitId);
  return unit && isAvailable(program, unit, week) && unit.audioText?.trim() ? unit.audioText : undefined;
}
