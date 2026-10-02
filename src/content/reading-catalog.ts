import type { ContentIssue, ExerciseScope, LearningProgram } from './model.ts';
import type { ProgramReadingExercise, ReadingExerciseDefinition } from './reading-model.ts';
import { wholeWordReadingId } from './reading-model.ts';
import { isAvailable } from './selectors.ts';

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function segmentsMatchDisplay(display: string, segments: readonly { text: string }[], sentence: boolean): boolean {
  let remaining = display;
  for (const segment of segments) {
    // Sentence spaces may separate referenced pieces; characters inside a piece stay exact.
    if (sentence && !remaining.startsWith(segment.text)) remaining = remaining.trimStart();
    if (!remaining.startsWith(segment.text)) return false;
    remaining = remaining.slice(segment.text.length);
  }
  // Only non-pronounced terminal punctuation may remain after the last piece.
  return /^[.!?…]*$/u.test(sentence ? remaining.trim() : remaining);
}

export function isReadingExerciseDefinition(value: unknown): value is ReadingExerciseDefinition {
  return object(value) && identifier(value.id)
    && (value.targetId === undefined || identifier(value.targetId))
    && (identifier(value.targetId) || value.displayedUnits !== undefined)
    && (value.enabled === undefined || typeof value.enabled === 'boolean')
    && (value.displayedUnits === undefined || (Array.isArray(value.displayedUnits)
      && value.displayedUnits.length > 0 && value.displayedUnits.every(unit => object(unit)
        && identifier(unit.unitId)
        && (unit.range === undefined || (Array.isArray(unit.range) && unit.range.length === 2
          && unit.range.every(Number.isSafeInteger) && unit.range[0] >= 0 && unit.range[1] > unit.range[0]))
        && (unit.segmentUnitIds === undefined || (Array.isArray(unit.segmentUnitIds)
          && unit.segmentUnitIds.length > 0 && unit.segmentUnitIds.every(identifier))))));
}

/** Pure projection of an effective program. Scope filters targets, not previously learned segments. */
function projectReadingCatalog(program: LearningProgram, week: number, scope: ExerciseScope, includeUnavailable = false) {
  const entries: { exercise: ProgramReadingExercise; enabled: boolean; available: boolean; automatic: boolean }[] = [];
  const issues: ContentIssue[] = [];
  const units = new Map(program.units.map(unit => [unit.id, unit]));
  const definitions = new Map<string, ReadingExerciseDefinition>();
  const reservedIds = new Set<string>();
  const issue = (path: string, message: string) => issues.push({ severity: 'error',
    code: 'invalid-reading-exercise', path, message });
  const configured: unknown = program.readingExercises;
  if (configured !== undefined && !Array.isArray(configured)) {
    issue('readingExercises', 'Les exercices Reading doivent être une liste.');
  }
  for (const [index, value] of (Array.isArray(configured) ? configured : []).entries()) {
    const path = `readingExercises[${index}]`;
    // Reserve even invalid definitions: never silently replace them with a generated exercise.
    const id = object(value) && identifier(value.id) ? value.id : undefined;
    const duplicate = id !== undefined && reservedIds.has(id);
    if (id !== undefined) reservedIds.add(id);
    if (!isReadingExerciseDefinition(value) || duplicate) {
      issue(path, 'Configuration Reading invalide ou identifiant dupliqué.');
      if (id !== undefined) definitions.delete(id);
      continue;
    }
    definitions.set(value.id, value);
  }
  for (const unit of program.units) {
    if (unit.type !== 'word') continue;
    const id = wholeWordReadingId(unit.id);
    if (!reservedIds.has(id)) definitions.set(id, { id, targetId: unit.id });
  }
  const otherActivityIds = new Set([
    ...(program.activities ?? []).map(activity => activity.id),
    ...program.units.flatMap(unit => unit.type === 'word'
      ? (unit.completeWord ?? []).map(activity => `${unit.id}:${activity.id}`) : []),
  ]);
  for (const definition of definitions.values()) {
    const path = `readingExercises.${definition.id}`;
    if (!definition.id.startsWith('reading:') || otherActivityIds.has(definition.id)) {
      issue(path, 'Utiliser un identifiant Reading distinct avec le préfixe reading:.');
      continue;
    }
    const target = definition.targetId === undefined ? undefined : units.get(definition.targetId);
    const displayed = definition.displayedUnits ?? [{ unitId: definition.targetId! }];
    const targetIds = definition.targetId === undefined
      ? displayed.map(unit => unit.unitId) : [definition.targetId];
    const references = [...targetIds, ...displayed.flatMap(unit => [unit.unitId, ...(unit.segmentUnitIds ?? [])])];
    if (references.some(id => !units.has(id))) {
      issue(path, 'Une référence Reading est absente de la banque partagée.');
      continue;
    }
    const enabled = program.activityEnabled?.[definition.id] ?? definition.enabled ?? true;
    const available = references.every(id => isAvailable(program, units.get(id)!, week))
      && (scope.mode !== 'selected-weeks'
        || targetIds.every(id => scope.selectedWeeks.includes(units.get(id)!.introducedInWeek)));
    if (!includeUnavailable && (!enabled || !available)) continue;
    if (displayed.some(unit => unit.range && (units.get(unit.unitId)!.type !== 'sentence'
      || unit.range[1] > Array.from(units.get(unit.unitId)!.display).length))) {
      issue(path, 'La plage Reading doit désigner une portion valide de la phrase partagée.');
      continue;
    }
    const displayedUnits = displayed.map(unit => {
      const source = units.get(unit.unitId)!;
      const display = unit.range ? Array.from(source.display).slice(...unit.range).join('') : source.display;
      return { display, segments: unit.segmentUnitIds
        ? unit.segmentUnitIds.map(unitId => ({ unitId, text: units.get(unitId)!.display }))
        : [{ unitId: unit.unitId, text: display.replace(/[.!?…]+$/u, '') }] };
    });
    // Explicit references must spell the displayed units; audioText never defines slider text.
    if (displayedUnits.some((unit, index) => !unit.display.trim()
      || unit.segments.some(segment => !segment.text.trim())
      || !segmentsMatchDisplay(unit.display, unit.segments, units.get(displayed[index].unitId)!.type === 'sentence'))
      || (target && displayedUnits.map(unit => unit.display).join(target.type === 'sentence' ? ' ' : '') !== target.display)) {
      issue(path, 'Les segments Reading doivent correspondre au texte partagé affiché.');
      continue;
    }
    entries.push({ enabled, available, automatic: !reservedIds.has(definition.id),
      exercise: { id: definition.id, ...(target ? { targetId: target.id } : {}),
        introducedInWeek: Math.max(...targetIds.map(id => units.get(id)!.introducedInWeek)), displayedUnits } });
  }
  return { entries, issues };
}

export function readingCatalog(program: LearningProgram, week: number, scope: ExerciseScope) {
  const { entries, issues } = projectReadingCatalog(program, week, scope);
  return { exercises: entries.map(entry => entry.exercise), issues };
}

/** Parent lists all valid pages across weeks, including disabled pages, without session scope. */
export function parentReadingCatalog(program: LearningProgram, week: number) {
  return projectReadingCatalog(program, week, { mode: 'all', selectedWeeks: [] }, true);
}
