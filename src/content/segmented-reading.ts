import type { LearningProgram, LearningUnit, Segmentation } from './model.ts';
import { isAvailable } from './selectors.ts';
import { validateSegmentation } from './validation.ts';

export interface SegmentedReading { readonly segments: readonly string[]; readonly whole: string }
export type PedagogicalReading = { readonly mode: 'whole'; readonly whole: string }
  | ({ readonly mode: 'segmented' } & SegmentedReading);

// The word's explicit audio policy is independent of its exercise construction.
export function getPedagogicalReading(program: LearningProgram, target: LearningUnit,
  construction: Segmentation | undefined, week: number): PedagogicalReading | null {
  if (target.type !== 'word' || !isAvailable(program, target, week)) return null;
  if (target.readingMode === 'whole') {
    const whole = target.audioText?.trim() ? target.audioText : target.display;
    return whole?.trim() ? { mode: 'whole', whole } : null;
  }
  const reading = getSegmentedReading(program, target, construction, week);
  return reading ? { mode: 'segmented', ...reading } : null;
}

// Read the entire explicit construction, never just the missing slots or inferred syllables.
export function getSegmentedReading(program: LearningProgram, target: LearningUnit, construction: Segmentation | undefined,
  week: number): SegmentedReading | null {
  if (target.type !== 'word' || !construction || !isAvailable(program, target, week)
    || validateSegmentation(program, target, construction, week).some((issue) => issue.severity === 'error')) return null;
  const segments: string[] = [];
  for (const block of construction.segments) {
    if ('unitId' in block) {
      const unit = program.units.find((item) => item.id === block.unitId);
      if (!unit) return null;
      const text = unit.audioText?.trim() ? unit.audioText : unit.display;
      if (!text?.trim()) return null;
      segments.push(text);
    } else {
      const text = 'literal' in block ? block.literal : block.separator;
      if (!/^[\s\p{P}]*$/u.test(text)) return null;
    }
  }
  const whole = target.audioText?.trim() ? target.audioText : target.display;
  return segments.length && whole?.trim() ? { segments, whole } : null;
}
