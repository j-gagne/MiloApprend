import type { LearningProgram, LearningUnit, Letter, Syllable, ToolWord, Word, Sentence, SchoolWeek } from './model.ts';

type Entry<T extends LearningUnit> = Pick<T, 'id' | 'display'>
  & Partial<Omit<T, 'id' | 'display' | 'type' | 'introducedInWeek'>>
  & { readonly legacyOrder?: number };

export interface SeedWeek extends SchoolWeek {
  readonly letters: readonly (string | Entry<Letter>)[];
  readonly syllables: readonly (string | Entry<Syllable>)[];
  readonly toolWords: readonly (string | Entry<ToolWord>)[];
  readonly words: readonly Entry<Word>[];
  readonly sentences: readonly Entry<Sentence>[];
}

function entry<T extends Letter | Syllable | ToolWord>(value: string | Entry<T>, prefix: T['type']) {
  return typeof value === 'string' ? { id: `${prefix}-${value}`, display: value, legacyOrder: undefined } : value;
}

function base<T extends LearningUnit>(value: Entry<T>, week: number) {
  const { legacyOrder: _order, ...details } = value;
  return { audioText: value.display, enabled: true, ...details, introducedInWeek: week };
}

// Projection pure de la banque de BASE, sans inférence de blocs ni accès au stockage Parent.
export function buildSeedProgram(id: string, bank: readonly SeedWeek[]): LearningProgram {
  const ordered: { unit: LearningUnit; order: number }[] = [];
  for (const week of bank) {
    for (const value of week.letters) {
      const item = entry<Letter>(value, 'letter');
      ordered.push({ order: item.legacyOrder ?? -1, unit: { grapheme: item.display, lowercase: item.display,
        ...base(item, week.number), type: 'letter' } });
    }
    for (const value of week.syllables) {
      const item = entry<Syllable>(value, 'syllable');
      ordered.push({ order: item.legacyOrder ?? -1, unit: { ...base(item, week.number), type: 'syllable' } });
    }
    for (const value of week.toolWords) {
      const item = entry<ToolWord>(value, 'tool-word');
      ordered.push({ order: item.legacyOrder ?? -1, unit: { ...base(item, week.number), type: 'tool-word' } });
    }
    for (const item of week.words) {
      ordered.push({ order: item.legacyOrder ?? -1, unit: { text: item.display, tags: ['school'],
        segmentations: [], imageAsset: null, audioAsset: null, ...base(item, week.number), type: 'word' } });
    }
    for (const item of week.sentences) {
      ordered.push({ order: item.legacyOrder ?? -1, unit: { ...base(item, week.number), type: 'sentence' } });
    }
  }
  // Les anciens mots practice étaient à la fin du catalogue. Garder leur ordre évite
  // de changer les distracteurs et le tirage des sessions lors de cette réorganisation.
  ordered.sort((a, b) => a.order - b.order);
  return { id, weeks: bank.map(({ number, label, reviewedUnitIds }) => ({ number, label,
    ...(reviewedUnitIds === undefined ? {} : { reviewedUnitIds }) })), units: ordered.map(({ unit }) => unit) };
}
