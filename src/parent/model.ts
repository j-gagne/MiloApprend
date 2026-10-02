import type { Activity, LearningProgram, LearningUnit, SchoolWeek, Segmentation, Word } from '../content/model.ts';
import { missingIndexes } from '../content/model.ts';
import { parentActivities } from './activities.ts';
import type { ExerciseScope } from '../content/model.ts';
import type { ReadingSpeed } from '../services/audio-settings.ts';
import type { PlaySettings } from '../game/play-settings.ts';

export interface ParentWeek extends SchoolWeek { readonly id: string }
export interface AudioOverride {
  readonly audioText: string;
  readonly readingMode?: Word['readingMode'];
  readonly readingSequence?: Word['readingSequence'] | null;
}

export interface ParentData extends PlaySettings {
  readonly version: 2;
  readonly activeWeek?: number;
  readonly exerciseScope?: ExerciseScope;
  readonly readingSpeed?: ReadingSpeed;
  readonly unitEnabled: Readonly<Record<string, boolean>>;
  readonly activityEnabled: Readonly<Record<string, boolean>>;
  readonly customUnits: readonly LearningUnit[];
  readonly customWeeks: readonly ParentWeek[];
  readonly activities: readonly Activity[];
  readonly constructions?: Readonly<Record<string, readonly Segmentation[]>>;
  readonly audioOverrides?: Readonly<Record<string, AudioOverride>>;
}
export function emptyParentData(): ParentData {
  return { version: 2, unitEnabled: {}, activityEnabled: {}, customUnits: [], customWeeks: [], activities: [] };
}

// Le seed n'est jamais modifié ni recopié dans la sauvegarde.
export function effectiveProgram(seed: LearningProgram, parent: ParentData): LearningProgram {
  const units = [...seed.units, ...parent.customUnits.filter((unit) => !seed.units.some((item) => item.id === unit.id))]
    .map((original) => {
      const audio = parent.audioOverrides?.[original.id];
      const voiced = !audio ? original : original.type === 'word'
        ? { ...original, audioText: audio.audioText || original.display,
          readingMode: audio.readingMode ?? original.readingMode,
          readingSequence: audio.readingSequence === null ? undefined : audio.readingSequence ?? original.readingSequence }
        : { ...original, audioText: audio.audioText || original.display };
      const unit = (voiced.type === 'word' || voiced.type === 'sentence') && parent.constructions?.[original.id]
        ? { ...voiced, segmentations: parent.constructions[original.id] } : voiced;
      const enabled = parent.unitEnabled[unit.id] ?? unit.enabled;
      if (unit.type !== 'word') return { ...unit, enabled };
      return { ...unit, enabled, completeWord: unit.completeWord?.map((variant) => ({ ...variant,
        enabled: parent.activityEnabled[`${unit.id}:${variant.id}`] ?? variant.enabled })) };
    });
  const activities = new Map((seed.activities ?? []).map((activity) => [activity.id, activity]));
  for (const activity of parent.activities) activities.set(activity.id, activity);
  const weeks = [...seed.weeks, ...parent.customWeeks.filter((week) => !seed.weeks.some((item) => item.number === week.number))]
    .sort((a, b) => a.number - b.number);
  return { ...seed, weeks, units, activityEnabled: parent.activityEnabled, activities: [...activities.values()].map((activity) => ({ ...activity,
    enabled: parent.activityEnabled[activity.id] ?? activity.enabled })) };
}

export function effectiveWeek(seed: LearningProgram, parent: ParentData, defaultWeek: number): number {
  return effectiveProgram(seed, parent).weeks.some((week) => week.number === parent.activeWeek)
    ? parent.activeWeek! : seed.defaults?.activeWeek ?? defaultWeek;
}

export function saveActivity(data: ParentData, activity: Activity): ParentData {
  return { ...data, activities: [...data.activities.filter((item) => item.id !== activity.id), activity] };
}

export function removeCustomWord(data: ParentData, id: string): ParentData {
  if (!data.customUnits.some((unit) => unit.id === id)) return data;
  // Les autres activités qui le référencent sont conservées, mais deviennent invalides/exclues.
  const removedIds = new Set(data.activities.filter((activity) => activity.targetId === id).map((activity) => activity.id));
  return { ...data, customUnits: data.customUnits.filter((unit) => unit.id !== id),
    activities: data.activities.filter((activity) => activity.targetId !== id),
    unitEnabled: Object.fromEntries(Object.entries(data.unitEnabled).filter(([key]) => key !== id)),
    activityEnabled: Object.fromEntries(Object.entries(data.activityEnabled).filter(([key]) => !removedIds.has(key))) };
}

// getRandomValues fonctionne aussi sur une adresse HTTP du réseau local (randomUUID n'est pas garanti).
export function newParentId(kind: 'word' | 'activity' | 'letter' | 'grapheme' | 'syllable' | 'sentence' | 'week' | 'segmentation'): string {
  const bytes = new Uint32Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return `parent-${kind}-${Array.from(bytes, (value) => value.toString(16).padStart(8, '0')).join('')}`;
}

export function weekError(program: LearningProgram, week: ParentWeek): string | undefined {
  if (!week.id || !Number.isSafeInteger(week.number) || week.number < 1 || !week.label.trim()) return 'Numéro positif et libellé requis.';
  if (program.weeks.some((item) => item.number === week.number)) return 'Cette semaine existe déjà.';
}

export function removeCustomWeek(data: ParentData, program: LearningProgram, id: string): ParentData {
  const week = data.customWeeks.find((item) => item.id === id);
  if (!week || program.units.some((unit) => unit.introducedInWeek === week.number
    || ((unit.type === 'word' || unit.type === 'sentence') && unit.segmentations?.some((item) => item.availableFromWeek === week.number)))
    || parentActivities(program).some((activity) => activity.availableFromWeek === week.number
      || (activity.type === 'complete-segments' && activity.segmentation?.availableFromWeek === week.number))) return data;
  return { ...data, customWeeks: data.customWeeks.filter((item) => item.id !== id),
    activeWeek: data.activeWeek === week.number ? undefined : data.activeWeek };
}

export function saveParentUnit(data: ParentData, program: LearningProgram, unit: LearningUnit): ParentData {
  const old = program.units.find((item) => item.id === unit.id);
  const custom = !old || data.customUnits.some((item) => item.id === unit.id);
  let next: ParentData = custom ? { ...data, customUnits: [...data.customUnits.filter((item) => item.id !== unit.id), unit] }
    : { ...data,
      audioOverrides: { ...data.audioOverrides, [unit.id]: { audioText: unit.audioText,
        ...(unit.type === 'word' ? { readingMode: unit.readingMode ?? 'segmented', readingSequence: unit.readingSequence ?? null } : {}) } },
      ...((unit.type === 'word' || unit.type === 'sentence') ? { constructions: { ...data.constructions, [unit.id]: unit.segmentations ?? [] } } : {}) };
  if ((unit.type !== 'word' && unit.type !== 'sentence') || (old?.type !== 'word' && old?.type !== 'sentence')) return next;
  for (const activity of parentActivities(program)) {
    if (activity.type !== 'complete-segments' || activity.targetId !== unit.id || !activity.segmentationId) continue;
    const before = old.segmentations?.find((item) => item.id === activity.segmentationId);
    const after = unit.segmentations?.find((item) => item.id === activity.segmentationId);
    if (!before || !after || JSON.stringify(before.segments) === JSON.stringify(after.segments)) continue;
    const used = new Set<number>();
    const mapping = before.segments.map((part) => {
      const index = after.segments.findIndex((candidate, i) => !used.has(i) && JSON.stringify(part) === JSON.stringify(candidate));
      if (index >= 0) used.add(index); return index;
    });
    const indexes = missingIndexes(activity).map((index) => mapping[index] ?? -1);
    next = saveActivity(next, { ...activity, missingSegmentIndex: undefined,
      missingSegmentIndexes: indexes.includes(-1) ? [] : indexes });
  }
  return next;
}

export function removeCustomActivity(data: ParentData, seed: LearningProgram, id: string): ParentData {
  if (parentActivities(seed).some((item) => item.id === id)) return data;
  return { ...data, activities: data.activities.filter((item) => item.id !== id),
    activityEnabled: Object.fromEntries(Object.entries(data.activityEnabled).filter(([key]) => key !== id)) };
}

export function duplicateActivity(activity: Activity): Activity {
  if (activity.type === 'spell') return { ...activity, id: newParentId('activity'), missingPositions: [...activity.missingPositions], letterUnitIds: { ...activity.letterUnitIds }, distractorUnitIds: [...activity.distractorUnitIds] };
  return { ...activity, id: newParentId('activity'), missingSegmentIndexes: [...(activity.missingSegmentIndexes ?? [])],
    ...(activity.missingSegmentIndex === undefined ? {} : { missingSegmentIndexes: undefined }),
    distractorUnitIds: [...activity.distractorUnitIds] };
}
