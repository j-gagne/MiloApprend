export type LearningUnitType = 'letter' | 'grapheme' | 'sound' | 'syllable' | 'word' | 'tool-word' | 'sentence';

interface UnitBase {
  readonly id: string;
  readonly display: string;
  readonly audioText: string;
  readonly introducedInWeek: number;
  readonly enabled: boolean;
  readonly tags?: readonly string[];
  readonly audioAsset?: string | null;
}

export interface Letter extends UnitBase {
  readonly type: 'letter';
  readonly grapheme: string;
  readonly lowercase?: string;
  readonly uppercase?: string;
}
export interface Grapheme extends UnitBase { readonly type: 'grapheme' }
export interface Sound extends UnitBase { readonly type: 'sound' }
export interface Syllable extends UnitBase { readonly type: 'syllable' }
export interface ToolWord extends UnitBase { readonly type: 'tool-word' }
export interface Sentence extends UnitBase {
  readonly type: 'sentence';
  readonly imageAsset?: ImageAsset | null;
  readonly segmentations?: readonly Segmentation[];
  // Références facultatives : ne pas déduire automatiquement les unités d'une phrase.
  readonly unitIds?: readonly string[];
}

export type PedagogicalSegment =
  | { readonly unitId: string }
  // Espaces et ponctuation, visibles et jamais utilisables comme réponses.
  | { readonly separator: string }
  // Un segment scolaire non confirmé reste visible, mais jamais proposé comme réponse.
  | { readonly literal: string; readonly note: string };

export interface Segmentation {
  readonly id: string;
  readonly segments: readonly PedagogicalSegment[];
  readonly availableFromWeek?: number;
  // Espaces exacts autour des blocs et graphies de la phrase originale.
  readonly gaps?: readonly string[];
  readonly surface?: readonly string[];
}

export interface CompletionParameters {
  readonly id: string;
  // Absence = activée, pour préserver les configurations existantes.
  readonly enabled?: boolean;
  readonly missingSegmentIndexes?: readonly number[];
  // Compatibilité avec les 21 variantes initiales. Ne pas fournir les deux formes.
  readonly missingSegmentIndex?: number;
  readonly distractorUnitIds: readonly string[];
  readonly answerPosition?: number;
  readonly availableFromWeek?: number;
  readonly order?: number;
}

export interface CompleteWordVariant extends CompletionParameters {
  readonly segmentationId: string;
}

// Configuration indépendante de React, stockable et éditable par le futur Parent.
// Word, Sentence et Syllable restent des types de cibles distincts.
export interface CompletionActivity extends CompletionParameters {
  readonly type: 'complete-segments';
  readonly targetId: string;
  // Les nouvelles activités de mots référencent le découpage du contenu.
  readonly segmentationId?: string;
  // Compatibilité V1 et activités de phrases.
  readonly segmentation?: Segmentation;
  readonly label?: string;
}

// Letter positions are activity data, never a second pedagogical construction.
export interface SpellActivity extends Omit<CompletionParameters, 'missingSegmentIndex' | 'missingSegmentIndexes'> {
  readonly type: 'spell';
  readonly targetId: string;
  readonly targetText: string;
  readonly missingPositions: readonly number[];
  readonly letterUnitIds: Readonly<Record<number, string>>;
  // Occurrence keys: answer:<word position> or distractor:<unit ID>.
  readonly tileOrder?: readonly string[];
  readonly label?: string;
}
export type Activity = CompletionActivity | SpellActivity;

export function missingIndexes(config: Pick<CompletionParameters, 'missingSegmentIndex' | 'missingSegmentIndexes'> | SpellActivity): readonly number[] {
  if ('missingPositions' in config) return config.missingPositions;
  return config.missingSegmentIndexes ?? (config.missingSegmentIndex === undefined ? [] : [config.missingSegmentIndex]);
}

export type ImageAsset =
  | { readonly emoji: string; readonly label: string }
  | { readonly src: string; readonly label: string };

export interface Word extends UnitBase {
  readonly type: 'word';
  readonly readingMode?: 'segmented' | 'whole';
  // Audio instructions only: these texts never become exercise blocks or units.
  readonly readingSequence?: readonly ({ readonly text: string } | { readonly unitId: string })[];
  readonly text: string;
  readonly segmentations: readonly Segmentation[];
  readonly imageAsset?: ImageAsset | null;
  readonly completeWord?: readonly CompleteWordVariant[];
}

export type LearningUnit = Letter | Grapheme | Sound | Syllable | Word | ToolWord | Sentence;
export type CompletionTarget = Word | Sentence | Syllable;
export interface ExerciseScope { readonly mode: 'all' | 'selected-weeks'; readonly selectedWeeks: readonly number[] }
export interface SchoolWeek {
  readonly number: number;
  readonly label: string;
  // Observations répétées, sans recopier les unités déjà introduites.
  readonly reviewedUnitIds?: readonly string[];
}
export interface LearningProgram {
  readonly readingExercises?: readonly import('./reading-model.ts').ReadingExerciseDefinition[];
  readonly id: string;
  readonly weeks: readonly SchoolWeek[];
  readonly units: readonly LearningUnit[];
  readonly activities?: readonly Activity[];
  readonly activityEnabled?: Readonly<Record<string, boolean>>;
}

export interface ContentIssue {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
