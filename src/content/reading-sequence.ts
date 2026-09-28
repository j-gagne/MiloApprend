import type { Word } from './model.ts';

export function isReadingSequence(value: unknown): value is NonNullable<Word['readingSequence']> {
  return Array.isArray(value) && value.length > 0 && value.every((step: unknown) => {
    if (!step || typeof step !== 'object') return false;
    if ('text' in step) return !('unitId' in step) && typeof step.text === 'string' && !!step.text.trim();
    return 'unitId' in step && typeof step.unitId === 'string' && !!step.unitId.trim();
  });
}
