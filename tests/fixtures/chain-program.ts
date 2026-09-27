import { initialProgram } from '../../src/content/program.ts';
import { automaticActivities } from '../../src/content/activity-catalog.ts';
import { effectiveProgram, emptyParentData } from '../../src/parent/model.ts';
import type { ParentData } from '../../src/parent/model.ts';
import type { Word, Sentence, Syllable } from '../../src/content/model.ts';

const lama: Word = { id: 'parent-word-chain-lama', type: 'word', text: 'lama', display: 'lama', audioText: 'lama',
  introducedInWeek: 6, enabled: true, tags: ['practice'], imageAsset: { emoji: '🦙', label: 'Un lama' },
  segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-ma' }] }] };
const lavage: Word = { ...lama, id: 'parent-word-chain-lavage', text: 'lavage', display: 'lavage', audioText: 'lavage',
  segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-va' }, { literal: 'ge', note: 'visible' }] }] };
const sentence: Sentence = { id: 'parent-sentence-chain', type: 'sentence', display: 'Il a volé le nid.', audioText: 'Il a volé le nid.',
  introducedInWeek: 6, enabled: true, tags: ['practice'], imageAsset: { emoji: '🪺', label: 'Le nid' },
  segmentations: [{ id: 'main', segments: [{ literal: 'Il a ', note: 'visible' }, { unitId: 'syllable-vo' },
    { literal: 'lé le ', note: 'visible' }, { unitId: 'syllable-ni' }, { literal: 'd.', note: 'visible' }] }] };
const syllable: Syllable = { id: 'parent-syllable-chain', type: 'syllable', display: 'mé', audioText: 'mé',
  introducedInWeek: 6, enabled: true, tags: ['practice'] };

export function chainParentData(count = 3, withSyllable = false): ParentData {
  const customUnits = [lama, lavage, withSyllable ? syllable : sentence].slice(0, count);
  const data: ParentData = { ...emptyParentData(), gameMode: 'chain', chainLength: 3, activeWeek: 6,
    customWeeks: [{ id: 'parent-week-chain', number: 6, label: 'Chaîne test' }],
    exerciseScope: { mode: 'selected-weeks', selectedWeeks: [6] }, customUnits,
    activities: customUnits.filter((u): u is Word | Sentence => u.type !== 'syllable').map((u) => ({
      id: `parent-activity-${u.id}`, type: 'complete-segments', targetId: u.id, segmentationId: 'main',
      missingSegmentIndexes: u.type === 'sentence' ? [1, 3] : [0, 1], distractorUnitIds: ['syllable-li', 'syllable-so'],
    })),
  };
  const all = automaticActivities(effectiveProgram(initialProgram, data), 6);
  return { ...data, activityEnabled: Object.fromEntries(all.map((a) => [a.id, a.targetId === syllable.id])) };
}
