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



,

  {

    number: 6,

    label: 'Semaine 6',

    letters: [ 'r', 'f' ],
    graphemes: [ 'ch' ],

    syllables: [

      { id: 'syllable-ra', display: 'ra', audioText: 'rat' }, { id: 'syllable-re', display: 're', audioText: 'reu' }, { id: 'syllable-ri', display: 'ri', audioText: 'riz' }, { id: 'syllable-ro', display: 'ro', audioText: 'rot' }, { id: 'syllable-ru', display: 'ru', audioText: 'rue' }, { id: 'syllable-ré', display: 'ré', audioText: 'rez' },

      'fa', 'fe', 'fi', 'fo', 'fu', 'fé',

      { id: 'syllable-cha', display: 'cha', audioText: 'chat' }, { id: 'syllable-che', display: 'che', audioText: 'cheu' }, 'chi', 'cho', 'chu', { id: 'syllable-ché', display: 'ché', audioText: 'chez' }

    ],

    words: [

      {

        id: 'practice-rire',

        display: 'rire',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-ri' }, { unitId: 'syllable-re' } ] }

        ],

        imageAsset: { emoji: '😂', label: 'Rire' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ra', 'syllable-ro' ],

            answerPosition: 0,

            order: 23

          }

        ]

      },

      {

        id: 'practice-rare',

        display: 'rare',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-ra' }, { unitId: 'syllable-re' } ] }

        ],

        imageAsset: { emoji: '💎', label: 'Quelque chose de rare' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ri', 'syllable-ro' ],

            answerPosition: 1,

            order: 24

          }

        ]

      },

      {

        id: 'practice-farine',

        display: 'farine',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-fa' }, { unitId: 'syllable-ri' }, { unitId: 'syllable-ne' } ] }

        ],

        imageAsset: { emoji: '🌾', label: 'De la farine' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-fi', 'syllable-fo' ],

            answerPosition: 0,

            order: 25

          }

        ]

      },

      {

        id: 'practice-fini',

        display: 'fini',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-fi' }, { unitId: 'syllable-ni' } ] }

        ],

        imageAsset: { emoji: '🏁', label: 'Fini' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-fa', 'syllable-fo' ],

            answerPosition: 2,

            order: 26

          }

        ]

      },

      {

        id: 'practice-chat',

        display: 'chat',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { unitId: 'syllable-cha' },

              { literal: 't', note: 'Lettre visible ; non ciblée par cet exercice de syllabe.' }

            ]

          }

        ],

        imageAsset: { emoji: '🐱', label: 'Un chat' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-chi', 'syllable-cho' ],

            answerPosition: 1,

            order: 27

          }

        ]

      },

      {

        id: 'practice-roche',

        display: 'roche',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-ro' }, { unitId: 'syllable-che' } ] }

        ],

        imageAsset: { emoji: '🪨', label: 'Une roche' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 1,

            distractorUnitIds: [ 'syllable-cha', 'syllable-chi' ],

            answerPosition: 2,

            order: 28

          }

        ]

      },

      {

        id: 'practice-fiche',

        display: 'fiche',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-fi' }, { unitId: 'syllable-che' } ] }

        ],

        imageAsset: { emoji: '📄', label: 'Une fiche' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 1,

            distractorUnitIds: [ 'syllable-cha', 'syllable-cho' ],

            answerPosition: 0,

            order: 29

          }

        ]

      }

    ],

    toolWords: [],

    sentences: []

  },

  {

    number: 7,

    label: 'Semaine 7',

    letters: [ 'è', 'ê' ],
    graphemes: [ 'ou' ],

    syllables: [

      'mè', 'lè', 'sè', 'vè', 'nè', 'rè', 'fè', 'chè',

      'mê', 'lê', 'sê', 'vê', 'nê', 'rê', 'fê', 'chê',

      'mou', 'lou', 'sou', 'vou', 'nou', 'rou', 'fou', 'chou'

    ],

    words: [

      {

        id: 'practice-pere',

        display: 'père',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { literal: 'pè', note: 'Le p n’est pas encore une unité pédagogique.' },

              { unitId: 'syllable-re' }

            ]

          }

        ],

        imageAsset: { emoji: '👨', label: 'Un père' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 1,

            distractorUnitIds: [ 'syllable-ra', 'syllable-ri' ],

            answerPosition: 1,

            order: 30

          }

        ]

      },

      {

        id: 'practice-mere',

        display: 'mère',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-mè' }, { unitId: 'syllable-re' } ] }

        ],

        imageAsset: { emoji: '👩', label: 'Une mère' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-lè', 'syllable-sè' ],

            answerPosition: 0,

            order: 31

          }

        ]

      },

      {

        id: 'practice-reve',

        display: 'rêve',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-rê' }, { unitId: 'syllable-ve' } ] }

        ],

        imageAsset: { emoji: '💭', label: 'Un rêve' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-rè', 'syllable-rou' ],

            answerPosition: 2,

            order: 32

          }

        ]

      },

      {

        id: 'practice-moule',

        display: 'moule',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-mou' }, { unitId: 'syllable-le' } ] }

        ],

        imageAsset: { emoji: '🐚', label: 'Une moule' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-lou', 'syllable-sou' ],

            answerPosition: 0,

            order: 33

          }

        ]

      },

      {

        id: 'practice-roule',

        display: 'roule',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-rou' }, { unitId: 'syllable-le' } ] }

        ],

        imageAsset: { emoji: '🛞', label: 'Ça roule' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-mou', 'syllable-fou' ],

            answerPosition: 1,

            order: 34

          }

        ]

      },

      {

        id: 'practice-foule',

        display: 'foule',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-fou' }, { unitId: 'syllable-le' } ] }

        ],

        imageAsset: { emoji: '👥', label: 'Une foule' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-mou', 'syllable-rou' ],

            answerPosition: 2,

            order: 35

          }

        ]

      },

      {

        id: 'practice-chou',

        display: 'chou',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-chou' } ] }

        ],

        imageAsset: { emoji: '🥬', label: 'Un chou' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-fou', 'syllable-sou' ],

            answerPosition: 0,

            order: 36

          }

        ]

      }

    ],

    toolWords: [],

    sentences: []

  },

  {

    number: 8,

    label: 'Semaine 8',

    letters: [ 'b', 'j' ],
    graphemes: [ 'on' ],

    syllables: [

      'ba', 'be', 'bi', 'bo', 'bu', 'bé', 'bè', 'bê', 'bou',

      'ja', 'je', 'ji', 'jo', 'ju', 'jé', 'jè', 'jê', 'jou'

    ],

    words: [

      {

        id: 'practice-bebe',

        display: 'bébé',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-bé' }, { unitId: 'syllable-bé' } ] }

        ],

        imageAsset: { emoji: '👶', label: 'Un bébé' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ba', 'syllable-bi' ],

            answerPosition: 0,

            order: 37

          }

        ]

      },

      {

        id: 'practice-boule',

        display: 'boule',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-bou' }, { unitId: 'syllable-le' } ] }

        ],

        imageAsset: { emoji: '🔵', label: 'Une boule' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ba', 'syllable-bo' ],

            answerPosition: 1,

            order: 38

          }

        ]

      },

      {

        id: 'practice-bonbon',

        display: 'bonbon',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { unitId: 'letter-b' }, { unitId: 'grapheme-on' },
              { unitId: 'letter-b' }, { unitId: 'grapheme-on' }

            ]

          }

        ],

        imageAsset: { emoji: '🍬', label: 'Un bonbon' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndexes: [ 1, 3 ],

            distractorUnitIds: [ 'grapheme-ou' ],

            answerPosition: 2,

            order: 39

          }

        ]

      },

      {

        id: 'practice-joli',

        display: 'joli',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-jo' }, { unitId: 'syllable-li' } ] }

        ],

        imageAsset: { emoji: '✨', label: 'Joli' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ja', 'syllable-ju' ],

            answerPosition: 0,

            order: 40

          }

        ]

      },

      {

        id: 'practice-joue',

        display: 'joue',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-jou' }, { unitId: 'letter-e' } ] }

        ],

        imageAsset: { emoji: '🧸', label: 'Il joue' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ja', 'syllable-jo' ],

            answerPosition: 1,

            order: 41

          }

        ]

      },

      {

        id: 'practice-bijou',

        display: 'bijou',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-bi' }, { unitId: 'syllable-jou' } ] }

        ],

        imageAsset: { emoji: '💍', label: 'Un bijou' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 1,

            distractorUnitIds: [ 'syllable-ja', 'syllable-jo' ],

            answerPosition: 2,

            order: 42

          }

        ]

      },

      {

        id: 'practice-bonjour',

        display: 'bonjour',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { literal: 'b', note: 'Lettre visible.' },

              { unitId: 'grapheme-on' },

              { unitId: 'syllable-jou' },

              { unitId: 'letter-r' }

            ]

          }

        ],

        imageAsset: { emoji: '👋', label: 'Bonjour' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 1,

            distractorUnitIds: [ 'grapheme-ou' ],

            answerPosition: 0,

            order: 43

          }

        ]

      }

    ],

    toolWords: [],

    sentences: []

  },

  {

    number: 9,

    label: 'Semaine 9',

    letters: [ 't' ],
    graphemes: [ 'in' ],

    syllables: [

      'ta', 'te', 'ti', 'to', 'tu', 'té', 'tè', 'tê', 'tou'

    ],

    words: [

      {

        id: 'practice-tapis',

        display: 'tapis',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { unitId: 'syllable-ta' },

              { literal: 'pis', note: 'Segment visible ; non ciblé par cet exercice.' }

            ]

          }

        ],

        imageAsset: { emoji: '🧶', label: 'Un tapis' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ti', 'syllable-to' ],

            answerPosition: 0,

            order: 44

          }

        ]

      },

      {

        id: 'practice-tomate',

        display: 'tomate',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-to' }, { unitId: 'syllable-ma' }, { unitId: 'syllable-te' } ] }

        ],

        imageAsset: { emoji: '🍅', label: 'Une tomate' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ta', 'syllable-ti' ],

            answerPosition: 1,

            order: 45

          }

        ]

      },

      {

        id: 'practice-tetine',

        display: 'tétine',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-té' }, { unitId: 'syllable-ti' }, { unitId: 'syllable-ne' } ] }

        ],

        imageAsset: { emoji: '👶', label: 'Une tétine' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ta', 'syllable-to' ],

            answerPosition: 2,

            order: 46

          }

        ]

      },

      {

        id: 'practice-toutou',

        display: 'toutou',

        tags: [ 'practice' ],

        segmentations: [

          { id: 'initial', segments: [ { unitId: 'syllable-tou' }, { unitId: 'syllable-tou' } ] }

        ],

        imageAsset: { emoji: '🐶', label: 'Un toutou' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 0,

            distractorUnitIds: [ 'syllable-ta', 'syllable-tu' ],

            answerPosition: 0,

            order: 47

          }

        ]

      },

      {

        id: 'practice-lutin',

        display: 'lutin',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { unitId: 'syllable-lu' },

              { unitId: 'letter-t' },

              { unitId: 'grapheme-in' }

            ]

          }

        ],

        imageAsset: { emoji: '🧝', label: 'Un lutin' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 2,

            distractorUnitIds: [ 'grapheme-on', 'grapheme-ou' ],

            answerPosition: 1,

            order: 48

          }

        ]

      },

      {

        id: 'practice-matin',

        display: 'matin',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { unitId: 'syllable-ma' },

              { unitId: 'letter-t' },

              { unitId: 'grapheme-in' }

            ]

          }

        ],

        imageAsset: { emoji: '🌅', label: 'Le matin' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 2,

            distractorUnitIds: [ 'grapheme-on', 'grapheme-ou' ],

            answerPosition: 2,

            order: 49

          }

        ]

      },

      {

        id: 'practice-sapin',

        display: 'sapin',

        tags: [ 'practice' ],

        segmentations: [

          {

            id: 'initial',

            segments: [

              { unitId: 'syllable-sa' },

              { literal: 'p', note: 'Lettre visible ; non ciblée par cet exercice.' },

              { unitId: 'grapheme-in' }

            ]

          }

        ],

        imageAsset: { emoji: '🌲', label: 'Un sapin' },

        completeWord: [

          {

            id: 'initial',

            segmentationId: 'initial',

            missingSegmentIndex: 2,

            distractorUnitIds: [ 'grapheme-on', 'grapheme-ou' ],

            answerPosition: 0,

            order: 50

          }

        ]

      }

    ],

    toolWords: [],

    sentences: []

  }



];



export const initialProgram = buildSeedProgram('milo-school-program', seedBank);