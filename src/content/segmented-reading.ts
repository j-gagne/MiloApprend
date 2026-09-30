import type { LearningProgram, LearningUnit, Segmentation } from './model.ts';
import { isAvailable } from './selectors.ts';
import { validateSegmentation } from './validation.ts';

export interface SegmentedReading { readonly segments: readonly string[]; readonly whole: string }
export type PedagogicalReading = { readonly mode: 'whole'; readonly whole: string }
  | ({ readonly mode: 'segmented' } & SegmentedReading);

// Audio text is not a segment identity. Keep construction indexes, including gaps.
export function getReadingSegmentIndexes(target: LearningUnit, construction: Segmentation | undefined): readonly (number | undefined)[] | undefined {
  if (target.type !== 'word' || !construction) return undefined;
  const blocks = construction.segments.flatMap((block, index) => 'unitId' in block ? [{ unitId: block.unitId, index }] : []);
  if (!target.readingSequence) return blocks.map(block => block.index);
  const sequence = target.readingSequence;
  if (sequence.length === blocks.length && sequence.every((step, i) => 'unitId' in step && step.unitId === blocks[i].unitId)) {
    return blocks.map(block => block.index);
  }
  return sequence.map(step => {
    if (!('unitId' in step)) return undefined;
    const matches = blocks.filter(block => block.unitId === step.unitId);
    return matches.length === 1 && sequence.filter(other => 'unitId' in other && other.unitId === step.unitId).length === 1
      ? matches[0].index : undefined;
  });
}

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
  if (target.type !== 'word' || !isAvailable(program, target, week)) return null;
  if (target.readingSequence !== undefined) {
    const segments: string[] = [];
    for (const step of target.readingSequence) {
      let text: string;
      if ('unitId' in step) {
        const unit = program.units.find((item) => item.id === step.unitId);
        if (!unit || !isAvailable(program, unit, week)) return null;
        text = unit.audioText;
      } else text = step.text;
      if (!text?.trim()) return null;
      segments.push(text);
    }
    const whole = target.audioText?.trim() ? target.audioText : target.display;
    return segments.length && whole?.trim() ? { segments, whole } : null;
  }
  if (!construction || validateSegmentation(program, target, construction, week).some((issue) => issue.severity === 'error')) return null;
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
