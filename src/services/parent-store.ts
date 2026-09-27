import type { CompletionActivity, LearningUnit, PedagogicalSegment, Segmentation, Word } from '../content/model.ts';
import type { ParentData, ParentWeek } from '../parent/model.ts';
import { emptyParentData } from '../parent/model.ts';

export const PARENT_STORAGE_KEY = 'milo-apprend.parent.v1';
export interface ParentStore {
  load(): { data: ParentData; warning?: string };
  save(data: ParentData): boolean;
}
export interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const booleans = (value: unknown): value is Record<string, boolean> => record(value) && Object.values(value).every((item) => typeof item === 'boolean');
const optionalNumber = (value: unknown) => value === undefined || (typeof value === 'number' && Number.isSafeInteger(value));
function segment(value: unknown): value is PedagogicalSegment {
  if (!record(value)) return false;
  if ([value.unitId, value.separator, value.literal].filter((item) => item !== undefined).length !== 1) return false;
  return typeof value.unitId === 'string' || typeof value.separator === 'string'
    || (typeof value.literal === 'string' && typeof value.note === 'string');
}
function segmentation(value: unknown): value is Segmentation {
  return record(value) && typeof value.id === 'string' && Array.isArray(value.segments)
    && value.segments.every(segment) && optionalNumber(value.availableFromWeek)
    && (value.gaps === undefined || strings(value.gaps)) && (value.surface === undefined || strings(value.surface));
}
function activity(value: unknown): value is CompletionActivity {
  return record(value) && typeof value.id === 'string' && value.type === 'complete-segments'
    && typeof value.targetId === 'string'
    && ((typeof value.segmentationId === 'string' && value.segmentation === undefined)
      || (value.segmentationId === undefined && segmentation(value.segmentation))) && strings(value.distractorUnitIds)
    && (value.label === undefined || typeof value.label === 'string')
    && (value.enabled === undefined || typeof value.enabled === 'boolean')
    && optionalNumber(value.missingSegmentIndex) && optionalNumber(value.answerPosition)
    && optionalNumber(value.availableFromWeek) && optionalNumber(value.order)
    && (value.missingSegmentIndexes === undefined || (Array.isArray(value.missingSegmentIndexes)
      && value.missingSegmentIndexes.every((index) => typeof index === 'number' && Number.isSafeInteger(index))));
}
function word(value: unknown): value is Word {
  return record(value) && typeof value.id === 'string' && value.id.startsWith('parent-word-') && value.type === 'word'
    && typeof value.text === 'string' && typeof value.display === 'string' && typeof value.audioText === 'string'
    && typeof value.introducedInWeek === 'number' && Number.isSafeInteger(value.introducedInWeek)
    && typeof value.enabled === 'boolean' && strings(value.tags) && value.tags.includes('practice')
    && Array.isArray(value.segmentations) && value.segmentations.every(segmentation)
    && value.completeWord === undefined
    && (value.audioAsset == null || typeof value.audioAsset === 'string')
    && (value.imageAsset == null || (record(value.imageAsset) && typeof value.imageAsset.label === 'string'
      && (typeof value.imageAsset.emoji === 'string' || typeof value.imageAsset.src === 'string')));
}
function unit(value: unknown): value is LearningUnit {
  if (record(value) && value.type === 'word') return word(value);
  return record(value) && typeof value.id === 'string' && value.id.startsWith(`parent-${value.type}-`)
    && typeof value.display === 'string' && typeof value.audioText === 'string'
    && typeof value.enabled === 'boolean' && typeof value.introducedInWeek === 'number' && Number.isSafeInteger(value.introducedInWeek)
    && strings(value.tags) && value.tags.includes('practice')
    && (value.audioAsset == null || typeof value.audioAsset === 'string')
    && ((value.type === 'letter' && typeof value.grapheme === 'string'
      && (value.lowercase === undefined || typeof value.lowercase === 'string')
      && (value.uppercase === undefined || typeof value.uppercase === 'string'))
      || value.type === 'syllable' || (value.type === 'sentence' && (value.unitIds === undefined || strings(value.unitIds))
        && (value.segmentations === undefined || (Array.isArray(value.segmentations) && value.segmentations.every(segmentation)))));
}
function week(value: unknown): value is ParentWeek {
  return record(value) && typeof value.id === 'string' && value.id.startsWith('parent-week-')
    && typeof value.number === 'number' && Number.isSafeInteger(value.number) && value.number > 0
    && typeof value.label === 'string' && !!value.label.trim();
}
export function parseParentData(raw: string): ParentData | undefined {
  const value: unknown = JSON.parse(raw);
  if (!record(value) || (value.version !== 1 && value.version !== 2) || !optionalNumber(value.activeWeek)
    || !booleans(value.unitEnabled) || !booleans(value.activityEnabled)
    || !Array.isArray(value.activities) || !value.activities.every(activity)) return undefined;
  const units = value.version === 1 ? value.customWords : value.customUnits;
  const weeks = value.version === 1 ? [] : value.customWeeks;
  if (!Array.isArray(units) || !units.every(unit) || !Array.isArray(weeks) || !weeks.every(week)) return undefined;
  if (new Set(units.map((item) => item.id)).size !== units.length
    || new Set(weeks.map((item) => item.id)).size !== weeks.length
    || new Set(weeks.map((item) => item.number)).size !== weeks.length
    || new Set(value.activities.map((item) => item.id)).size !== value.activities.length) return undefined;
  if (value.constructions !== undefined && (!record(value.constructions)
    || !Object.values(value.constructions).every((items) => Array.isArray(items) && items.every(segmentation)))) return undefined;
  return { version: 2, activeWeek: value.activeWeek as number | undefined, unitEnabled: value.unitEnabled,
    activityEnabled: value.activityEnabled, customUnits: units, customWeeks: weeks, activities: value.activities,
    ...(value.constructions === undefined ? {} : { constructions: value.constructions as Record<string, Segmentation[]> }) };
}

export function createParentStore(storage: () => KeyValueStorage): ParentStore {
  return {
    load() {
      try {
        const raw = storage().getItem(PARENT_STORAGE_KEY);
        if (raw === null) return { data: emptyParentData() };
        const data = parseParentData(raw);
        if (data) return { data };
      } catch { return { data: emptyParentData(), warning: 'Les personnalisations ne sont pas lisibles. Le programme initial est utilisé.' }; }
      return { data: emptyParentData(), warning: 'Format de personnalisation inconnu. Le programme initial est utilisé.' };
    },
    save(data) {
      try { storage().setItem(PARENT_STORAGE_KEY, JSON.stringify(data)); return true; }
      catch { return false; }
    },
  };
}
export const parentStore = createParentStore(() => localStorage);
