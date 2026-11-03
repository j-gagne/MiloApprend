import { buildSeedProgram, type SeedWeek } from '../../src/content/seed-bank.ts';

export const silentWeek: SeedWeek = {
  number: 1, label: 'Segments explicites', letters: ['e', 'a', 't', 'd'], toolWords: [], sentences: [],
  syllables: ['ru', 'ré', 'fé', 'fu', 'mé', 'cha', 'ni', 'li'],
  words: [
    { id: 'word-rue', display: 'rue', segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-ru' }, { unitId: 'letter-e', silent: true }] }] },
    { id: 'word-fee', display: 'fée', segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-fé' }, { unitId: 'letter-e', silent: true }] }] },
    { id: 'word-fumee', display: 'fumée', segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-fu' }, { unitId: 'syllable-mé' }, { unitId: 'letter-e', silent: true }] }] },
    { id: 'word-chat', display: 'chat', segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-cha' }, { literal: 't', note: 'Lettre finale.', silent: true }] }] },
    { id: 'word-nid', display: 'nid', segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-ni' }, { literal: 'd', note: 'Lettre finale.', silent: true }] }] },
    { id: 'word-lit', display: 'lit', segmentations: [{ id: 'main', segments: [{ unitId: 'syllable-li' }, { literal: 't', note: 'Lettre finale.', silent: true }] }] },
  ],
  readingExercises: [
    { id: 'reading:whole:word-rue', targetId: 'word-rue', displayedUnits: [{ unitId: 'word-rue', segmentUnitIds: ['syllable-ru', { unitId: 'letter-e', silent: true }] }] },
    { id: 'reading:whole:word-fee', targetId: 'word-fee', displayedUnits: [{ unitId: 'word-fee', segmentUnitIds: ['syllable-fé', { unitId: 'letter-e', silent: true }] }] },
    { id: 'reading:whole:word-fumee', targetId: 'word-fumee', displayedUnits: [{ unitId: 'word-fumee', segmentUnitIds: ['syllable-fu', 'syllable-mé', { unitId: 'letter-e', silent: true }] }] },
    { id: 'reading:whole:word-chat', targetId: 'word-chat', displayedUnits: [{ unitId: 'word-chat', segmentUnitIds: ['syllable-cha', { unitId: 'letter-t', silent: true }] }] },
  ],
};
export const silentProgram = buildSeedProgram('silent-test', [silentWeek]);
