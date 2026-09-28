import { buildSeedProgram, type SeedWeek } from './seed-bank.ts';

// BASE PROGRAM : unique banque seed, organisée par semaine. Guide : README-seed.md.
// Les constructions sont explicites ; un literal ne crée jamais de LearningUnit.
export const seedBank: readonly SeedWeek[] = [
  {
    number: 2,
    label: 'Semaine 2',
    letters: [ 'i', 'o', 'u', 'a' ],
    syllables: [],
    words: [],
    toolWords: [],
    sentences: []
  },
  {
    number: 3,
    label: 'Semaine 3',
    letters: [ 'm', 'l' ],
    syllables: [
      'ma', 'me', 'mi',
      'mo', 'mu', 'la',
      'le', 'li', 'lo',
      'lu'
    ],
    words: [
      {
        id: 'word-ami',
        readingMode: 'segmented',
        display: 'ami',
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'letter-a' }, { unitId: 'syllable-mi' } ] }
        ],
        imageAsset: { emoji: '🧒', label: 'Un ami' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'letter-o', 'letter-i' ],
            answerPosition: 2,
            order: 3
          }
        ]
      },
      {
        id: 'word-lama',
        readingMode: 'segmented',
        display: 'lama',
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-la' }, { unitId: 'syllable-ma' } ] }
        ],
        imageAsset: { emoji: '🦙', label: 'Un lama' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'syllable-li', 'syllable-lu' ],
            answerPosition: 0,
            order: 2
          },
          {
            id: 'deux-emplacements',
            segmentationId: 'initial',
            missingSegmentIndexes: [ 0, 1 ],
            distractorUnitIds: [ 'syllable-li', 'syllable-mu' ],
            answerPosition: 0,
            order: 22
          }
        ]
      }
    ],
    toolWords: [ 'à', 'il', 'Il' ],
    sentences: [ { id: 'sentence-il-a-lu', display: 'Il a lu.' } ]
  },
  {
    number: 4,
    label: 'Semaine 4',
    reviewedUnitIds: [ 'tool-word-à', 'tool-word-il' ],
    letters: [ 'e', 's', 'v' ],
    syllables: [
      'sa', 'se', 'si', 'so',
      'su', 'va', { id: 'syllable-ve', display: 've', audioText: 'vé' }, 'vi',
      'vo', 'vu', 'iv', 'os',
      'av', 'us', 'el', 'ol',
      'is', 'uv', 'as', 'ev'
    ],
    words: [
      {
        id: 'word-lime',
        display: 'lime',
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-li' }, { unitId: 'syllable-me' } ] }
        ],
        imageAsset: { emoji: '🍋‍🟩', label: 'Une lime' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-ma', 'syllable-mi' ],
            answerPosition: 2,
            order: 6
          }
        ]
      },
      {
        id: 'word-sale',
        display: 'sale',
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-sa' }, { unitId: 'syllable-le' } ] }
        ],
        imageAsset: { emoji: '🥾', label: 'Une botte sale' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-la', 'syllable-li' ],
            answerPosition: 0,
            order: 7
          }
        ]
      },
      {
        id: 'word-vis',
        readingMode: 'whole',
        display: 'vis',
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-vi' }, { unitId: 'letter-s' } ] }
        ],
        imageAsset: { emoji: '🔩', label: 'Une vis' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'syllable-va', 'syllable-vo' ],
            answerPosition: 1,
            order: 8
          }
        ]
      },
      {
        id: 'practice-mule',
        display: 'mule',
        tags: [ 'practice' ],
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-mu' }, { unitId: 'syllable-le' } ] }
        ],
        imageAsset: { emoji: '🫏', label: 'Une mule' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'syllable-ma', 'syllable-mi' ],
            answerPosition: 0,
            order: 13
          }
        ],
        legacyOrder: 75
      },
      {
        id: 'practice-mime',
        display: 'mime',
        tags: [ 'practice' ],
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-mi' }, { unitId: 'syllable-me' } ] }
        ],
        imageAsset: { emoji: '🎭', label: 'Un mime' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-ma', 'syllable-mo' ],
            answerPosition: 1,
            order: 14
          }
        ],
        legacyOrder: 76
      },
      {
        id: 'practice-olive',
        readingMode: 'whole',
        display: 'olive',
        tags: [ 'practice' ],
        segmentations: [
          {
            id: 'initial',
            segments: [ { unitId: 'letter-o' }, { unitId: 'syllable-li' }, { unitId: 'syllable-ve' } ]
          }
        ],
        imageAsset: { emoji: '🫒', label: 'Une olive' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-la', 'syllable-lu' ],
            answerPosition: 1,
            order: 17
          }
        ],
        legacyOrder: 79
      },
      {
        id: 'practice-salive',
        display: 'salive',
        tags: [ 'practice' ],
        segmentations: [
          {
            id: 'initial',
            segments: [ { unitId: 'syllable-sa' }, { unitId: 'syllable-li' }, { unitId: 'syllable-ve' } ]
          }
        ],
        imageAsset: { emoji: '👄', label: 'La salive dans la bouche' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 2,
            distractorUnitIds: [ 'syllable-va', 'syllable-vi' ],
            answerPosition: 2,
            order: 18
          }
        ],
        legacyOrder: 80
      },
      {
        id: 'practice-salami',
        display: 'salami',
        tags: [ 'practice' ],
        segmentations: [
          {
            id: 'initial',
            segments: [ { unitId: 'syllable-sa' }, { unitId: 'syllable-la' }, { unitId: 'syllable-mi' } ]
          }
        ],
        imageAsset: { emoji: '🌭', label: 'Du salami' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-li', 'syllable-lu' ],
            answerPosition: 2,
            order: 21
          }
        ],
        legacyOrder: 82
      }
    ],
    toolWords: [],
    sentences: [
      { id: 'sentence-il-a-mal', display: 'Il a mal.' },
      { id: 'sentence-il-a-vu-le-lila', display: 'Il a vu le lila.' }
    ]
  },
  {
    number: 5,
    label: 'Semaine 5',
    reviewedUnitIds: [
      'syllable-vo', 'syllable-va',
      'syllable-so', 'syllable-lu',
      'syllable-us', 'syllable-as',
      'syllable-av', 'syllable-os',
      'tool-word-à', 'tool-word-il',
      'word-ami'
    ],
    letters: [ 'é', 'n' ],
    syllables: [
      'na', 'ne', 'ni',
      'no', 'nu', 'né',
      'sé', 'mé', 'év',
      'um', 'él', 'im',
      'ul', 'ém'
    ],
    words: [
      {
        id: 'word-vélo',
        display: 'vélo',
        segmentations: [
          {
            id: 'initial',
            segments: [
              {
                literal: 'vé',
                note: 'Segment visible hérité du prototype ; syllabe non autorisée isolément.'
              },
              { unitId: 'syllable-lo' }
            ]
          }
        ],
        imageAsset: { emoji: '🚲', label: 'Un vélo' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-lu', 'syllable-la' ],
            answerPosition: 1,
            order: 4
          }
        ]
      },
      {
        id: 'word-os',
        display: 'os',
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-os' } ] }
        ],
        imageAsset: { emoji: '🦴', label: 'Un os' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'syllable-is', 'syllable-us' ],
            answerPosition: 2,
            order: 9
          }
        ]
      },
      {
        id: 'word-nid',
        display: 'nid',
        segmentations: [
          {
            id: 'initial',
            segments: [
              { unitId: 'syllable-ni' },
              {
                literal: 'd',
                note: 'Segment visible hérité du prototype ; lettre non autorisée isolément.'
              }
            ]
          }
        ],
        imageAsset: { emoji: '🪺', label: 'Un nid' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'syllable-na', 'syllable-ne' ],
            answerPosition: 0,
            order: 5
          }
        ]
      },
      {
        id: 'word-lune',
        display: 'lune',
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-lu' }, { unitId: 'syllable-ne' } ] }
        ],
        imageAsset: { emoji: '🌙', label: 'La lune' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-na', 'syllable-ni' ],
            answerPosition: 1,
            order: 1
          }
        ]
      },
      {
        id: 'word-lit',
        display: 'lit',
        segmentations: [
          {
            id: 'initial',
            segments: [
              { unitId: 'syllable-li' },
              {
                literal: 't',
                note: 'Lettre visible dans ce mot scolaire ; non autorisée comme réponse isolée.'
              }
            ]
          }
        ],
        imageAsset: { emoji: '🛏️', label: 'Un lit' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'syllable-la', 'syllable-lu' ],
            answerPosition: 0,
            order: 10
          }
        ]
      },
      {
        id: 'word-âne',
        readingMode: 'segmented',
        readingSequence: [{ text: 'â' }, { unitId: 'syllable-ne' }],
        display: 'âne',
        segmentations: [
          {
            id: 'initial',
            segments: [
              {
                literal: 'â',
                note: 'Graphie visible dans ce mot scolaire ; non autorisée comme réponse isolée.'
              },
              { unitId: 'syllable-ne' }
            ]
          }
        ],
        imageAsset: { emoji: '🫏', label: 'Un âne' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-na', 'syllable-ni' ],
            answerPosition: 1,
            order: 11
          }
        ]
      },
      { id: 'word-animal', display: 'animal' },
      {
        id: 'practice-menu',
        display: 'menu',
        tags: [ 'practice' ],
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-me' }, { unitId: 'syllable-nu' } ] }
        ],
        imageAsset: { emoji: '📋', label: 'Un menu' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-na', 'syllable-ni' ],
            answerPosition: 2,
            order: 12
          }
        ],
        legacyOrder: 74
      },
      {
        id: 'practice-mine',
        display: 'mine',
        tags: [ 'practice' ],
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-mi' }, { unitId: 'syllable-ne' } ] }
        ],
        imageAsset: { emoji: '⛏️', label: 'Une mine' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 0,
            distractorUnitIds: [ 'syllable-ma', 'syllable-mo' ],
            answerPosition: 2,
            order: 15
          }
        ],
        legacyOrder: 77
      },
      {
        id: 'practice-mémé',
        display: 'mémé',
        tags: [ 'practice' ],
        segmentations: [
          { id: 'initial', segments: [ { unitId: 'syllable-mé' }, { unitId: 'syllable-mé' } ] }
        ],
        imageAsset: { emoji: '👵', label: 'Mémé' },
        completeWord: [
          {
            id: 'initial',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-ma', 'syllable-mi' ],
            answerPosition: 0,
            order: 16
          }
        ],
        legacyOrder: 78
      },
      {
        id: 'practice-savane',
        display: 'savane',
        tags: [ 'practice' ],
        segmentations: [
          {
            id: 'initial',
            segments: [ { unitId: 'syllable-sa' }, { unitId: 'syllable-va' }, { unitId: 'syllable-ne' } ]
          }
        ],
        imageAsset: { emoji: '🦒', label: 'La savane' },
        completeWord: [
          {
            id: 'milieu',
            segmentationId: 'initial',
            missingSegmentIndex: 1,
            distractorUnitIds: [ 'syllable-vi', 'syllable-vo' ],
            answerPosition: 0,
            order: 19
          },
          {
            id: 'fin',
            segmentationId: 'initial',
            missingSegmentIndex: 2,
            distractorUnitIds: [ 'syllable-na', 'syllable-ni' ],
            answerPosition: 1,
            order: 20
          }
        ],
        legacyOrder: 81
      }
    ],
    toolWords: [],
    sentences: [ { id: 'sentence-il-a-volé-le-nid', display: 'Il a volé le nid.' } ]
  }
];

export const initialProgram = buildSeedProgram('milo-school-program', seedBank);
