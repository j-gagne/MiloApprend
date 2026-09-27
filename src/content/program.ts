import type { LearningProgram, LearningUnit, Word } from './model.ts';

// Ces helpers mettent en forme des listes EXPLICITES ; ils ne créent aucune combinaison.
function letters(week: number, displays: readonly string[]): LearningUnit[] {
  return displays.map((display) => ({ id: `letter-${display}`, type: 'letter', display,
    grapheme: display, lowercase: display, audioText: display, introducedInWeek: week, enabled: true }));
}
function syllables(week: number, displays: readonly string[]): LearningUnit[] {
  return displays.map((display) => ({ id: `syllable-${display}`, type: 'syllable', display,
    audioText: display, introducedInWeek: week, enabled: true }));
}
function word(id: string, text: string, week: number, details: Partial<Pick<Word, 'segmentations' | 'imageAsset' | 'completeWord' | 'tags'>> = {}): Word {
  return { id, type: 'word', text, display: text, audioText: text, introducedInWeek: week,
    enabled: true, tags: ['school'], segmentations: [], imageAsset: null, audioAsset: null, ...details };
}
function sentence(id: string, display: string, week: number): LearningUnit {
  return { id, type: 'sentence', display, audioText: display, introducedInWeek: week, enabled: true };
}

export const initialProgram: LearningProgram = {
  id: 'milo-school-program',
  weeks: [
    { number: 2, label: 'Semaine 2' },
    { number: 3, label: 'Semaine 3' },
    { number: 4, label: 'Semaine 4', reviewedUnitIds: ['tool-word-à', 'tool-word-il'] },
    { number: 5, label: 'Semaine 5', reviewedUnitIds: [
      'syllable-vo', 'syllable-va', 'syllable-so', 'syllable-lu', 'syllable-us',
      'syllable-as', 'syllable-av', 'syllable-os', 'tool-word-à', 'tool-word-il', 'word-ami',
    ] },
  ],
  units: [
    ...letters(2, ['i', 'o', 'u', 'a']),
    ...letters(3, ['m', 'l']),
    ...syllables(3, [
  'ma', 'me', 'mi', 'mo', 'mu',
  'la', 'le', 'li', 'lo', 'lu',
]),
    { id: 'tool-word-à', type: 'tool-word', display: 'à', audioText: 'à', introducedInWeek: 3, enabled: true },
    { id: 'tool-word-il', type: 'tool-word', display: 'il', audioText: 'il', introducedInWeek: 3, enabled: true },
    { id: 'tool-word-Il', type: 'tool-word', display: 'Il', audioText: 'Il', introducedInWeek: 3, enabled: true },
    word('word-ami', 'ami', 3, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'letter-a' }, { unitId: 'syllable-mi' }] }],
      imageAsset: { emoji: '🧒', label: 'Un ami' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['letter-o', 'letter-i'], answerPosition: 2, order: 3 }],
    }),
    word('word-lama', 'lama', 3, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-la' }, { unitId: 'syllable-ma' }] }],
      imageAsset: { emoji: '🦙', label: 'Un lama' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['syllable-li', 'syllable-lu'], answerPosition: 0, order: 2 },
        { id: 'deux-emplacements', segmentationId: 'initial', missingSegmentIndexes: [0, 1],
          distractorUnitIds: ['syllable-li', 'syllable-mu'], answerPosition: 0, order: 22 }],
    }),
    sentence('sentence-il-a-lu', 'Il a lu.', 3),

    ...letters(4, ['e', 's', 'v']),
    ...syllables(4, [
  'sa', 'se', 'si', 'so', 'su',
  'va', 've', 'vi', 'vo', 'vu',

  'iv', 'os', 'av', 'us', 'el',
  'ol', 'is', 'uv', 'as', 'ev',
]),
    word('word-lime', 'lime', 4, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-li' }, { unitId: 'syllable-me' }] }],
      imageAsset: { emoji: '🍋‍🟩', label: 'Une lime' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-ma', 'syllable-mi'], answerPosition: 2, order: 6 }],
    }),
    word('word-sale', 'sale', 4, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-sa' }, { unitId: 'syllable-le' }] }],
      imageAsset: { emoji: '🥾', label: 'Une botte sale' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-la', 'syllable-li'], answerPosition: 0, order: 7 }],
    }),
    word('word-vis', 'vis', 4, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-vi' }, { unitId: 'letter-s' }] }],
      imageAsset: { emoji: '🔩', label: 'Une vis' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['syllable-va', 'syllable-vo'], answerPosition: 1, order: 8 }],
    }),
    sentence('sentence-il-a-mal', 'Il a mal.', 4),
    sentence('sentence-il-a-vu-le-lila', 'Il a vu le lila.', 4),

    ...letters(5, ['é', 'n']),
    ...syllables(5, [
  'na', 'ne', 'ni', 'no', 'nu',
  'né',

  'sé', 'mé',
  'év', 'um', 'él', 'im', 'ul', 'ém',
]),
    word('word-vélo', 'vélo', 5, {
      segmentations: [{ id: 'initial', segments: [
        { literal: 'vé', note: 'Segment visible hérité du prototype ; syllabe non autorisée isolément.' },
        { unitId: 'syllable-lo' },
      ] }],
      imageAsset: { emoji: '🚲', label: 'Un vélo' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-lu', 'syllable-la'], answerPosition: 1, order: 4 }],
    }),
    word('word-os', 'os', 5, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-os' }] }],
      imageAsset: { emoji: '🦴', label: 'Un os' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['syllable-is', 'syllable-us'], answerPosition: 2, order: 9 }],
    }),
    word('word-nid', 'nid', 5, {
      segmentations: [{ id: 'initial', segments: [
        { unitId: 'syllable-ni' },
        { literal: 'd', note: 'Segment visible hérité du prototype ; lettre non autorisée isolément.' },
      ] }],
      imageAsset: { emoji: '🪺', label: 'Un nid' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['syllable-na', 'syllable-ne'], answerPosition: 0, order: 5 }],
    }),
    word('word-lune', 'lune', 5, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-lu' }, { unitId: 'syllable-ne' }] }],
      imageAsset: { emoji: '🌙', label: 'La lune' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-na', 'syllable-ni'], answerPosition: 1, order: 1 }],
    }),
    word('word-lit', 'lit', 5, {
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-li' },
        { literal: 't', note: 'Lettre visible dans ce mot scolaire ; non autorisée comme réponse isolée.' }] }],
      imageAsset: { emoji: '🛏️', label: 'Un lit' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['syllable-la', 'syllable-lu'], answerPosition: 0, order: 10 }],
    }),
    word('word-âne', 'âne', 5, {
      segmentations: [{ id: 'initial', segments: [
        { literal: 'â', note: 'Graphie visible dans ce mot scolaire ; non autorisée comme réponse isolée.' }, { unitId: 'syllable-ne' }] }],
      imageAsset: { emoji: '🫏', label: 'Un âne' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-na', 'syllable-ni'], answerPosition: 1, order: 11 }],
    }),
    word('word-animal', 'animal', 5),
    sentence('sentence-il-a-volé-le-nid', 'Il a volé le nid.', 5),

    // Entraînement ajouté avec l'accord du parent, distinct du matériel scolaire.
    // Chaque semaine choisie dispose déjà de toutes les unités référencées.
    word('practice-menu', 'menu', 5, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-me' }, { unitId: 'syllable-nu' }] }],
      imageAsset: { emoji: '📋', label: 'Un menu' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-na', 'syllable-ni'], answerPosition: 2, order: 12 }],
    }),
    word('practice-mule', 'mule', 4, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-mu' }, { unitId: 'syllable-le' }] }],
      imageAsset: { emoji: '🫏', label: 'Une mule' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['syllable-ma', 'syllable-mi'], answerPosition: 0, order: 13 }],
    }),
    word('practice-mime', 'mime', 4, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-mi' }, { unitId: 'syllable-me' }] }],
      imageAsset: { emoji: '🎭', label: 'Un mime' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-ma', 'syllable-mo'], answerPosition: 1, order: 14 }],
    }),
    word('practice-mine', 'mine', 5, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-mi' }, { unitId: 'syllable-ne' }] }],
      imageAsset: { emoji: '⛏️', label: 'Une mine' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 0,
        distractorUnitIds: ['syllable-ma', 'syllable-mo'], answerPosition: 2, order: 15 }],
    }),
    word('practice-mémé', 'mémé', 5, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-mé' }, { unitId: 'syllable-mé' }] }],
      imageAsset: { emoji: '👵', label: 'Mémé' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-ma', 'syllable-mi'], answerPosition: 0, order: 16 }],
    }),
    word('practice-olive', 'olive', 4, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'letter-o' }, { unitId: 'syllable-li' }, { unitId: 'syllable-ve' }] }],
      imageAsset: { emoji: '🫒', label: 'Une olive' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-la', 'syllable-lu'], answerPosition: 1, order: 17 }],
    }),
    word('practice-salive', 'salive', 4, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-sa' }, { unitId: 'syllable-li' }, { unitId: 'syllable-ve' }] }],
      imageAsset: { emoji: '👄', label: 'La salive dans la bouche' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 2,
        distractorUnitIds: ['syllable-va', 'syllable-vi'], answerPosition: 2, order: 18 }],
    }),
    word('practice-savane', 'savane', 5, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-sa' }, { unitId: 'syllable-va' }, { unitId: 'syllable-ne' }] }],
      imageAsset: { emoji: '🦒', label: 'La savane' },
      completeWord: [
        { id: 'milieu', segmentationId: 'initial', missingSegmentIndex: 1,
          distractorUnitIds: ['syllable-vi', 'syllable-vo'], answerPosition: 0, order: 19 },
        { id: 'fin', segmentationId: 'initial', missingSegmentIndex: 2,
          distractorUnitIds: ['syllable-na', 'syllable-ni'], answerPosition: 1, order: 20 },
      ],
    }),
    word('practice-salami', 'salami', 4, {
      tags: ['practice'],
      segmentations: [{ id: 'initial', segments: [{ unitId: 'syllable-sa' }, { unitId: 'syllable-la' }, { unitId: 'syllable-mi' }] }],
      imageAsset: { emoji: '🌭', label: 'Du salami' },
      completeWord: [{ id: 'initial', segmentationId: 'initial', missingSegmentIndex: 1,
        distractorUnitIds: ['syllable-li', 'syllable-lu'], answerPosition: 2, order: 21 }],
    }),
  ],
};
