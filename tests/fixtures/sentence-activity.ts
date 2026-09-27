import type { CompletionActivity, LearningProgram } from '../../src/content/model.ts';
import { initialProgram } from '../../src/content/program.ts';

// Exemple vérifié par TypeScript, hors catalogue et sans cast de Sentence vers Word.
export const sentenceActivity: CompletionActivity = {
  id: 'test-il-a-lu', type: 'complete-segments', targetId: 'sentence-il-a-lu',
  segmentation: { id: 'tokens', segments: [
    { unitId: 'tool-word-Il' }, { separator: ' ' }, { unitId: 'letter-a' },
    { separator: ' ' }, { unitId: 'syllable-lu' }, { separator: '.' },
  ] },
  missingSegmentIndexes: [0, 4], distractorUnitIds: ['syllable-li', 'syllable-mu'],
};
export const sentenceProgram: LearningProgram = { ...initialProgram, activities: [sentenceActivity] };
