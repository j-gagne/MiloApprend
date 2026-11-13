import { useState } from 'react';
import type { LearningProgram } from '../../content/model';
import type { MathExerciseDefinition, MathExerciseType } from '../../content/math-model';
import { mathCatalog } from '../../content/math-catalog';
import { mathExerciseNumbers, validateMathExercise } from '../../content/math-validation';
import { getEligibleMathNumbers } from '../../content/mathematics';
import { newParentId, type ParentData } from '../../parent/model';
import { saveMathExercise, removeMathExercise } from '../../parent/math-exercises';
import { ParentDraft, useDraftField } from './ParentDraft';
import { parentDrafts } from '../../services/parent-drafts';
const labels = { ORDER_NUMBERS: 'JE RANGE', MISSING_NUMBER: 'NOMBRE MANQUANT', HEAR_NUMBER: "J'ÉCOUTE" };
interface Props { program: LearningProgram; data: ParentData; activeWeek: number; onChange: (data: ParentData) => boolean }
export function MathExercises(props: Props) {
  const { program, data, activeWeek, onChange } = props;
  const [type, setType] = useState<MathExerciseType>('ORDER_NUMBERS');
  const [editing, setEditing] = useState<MathExerciseDefinition>();
  const draftKey = editing ? `math-editor:${data.mathExercises?.some(item => item.id === editing.id) ? editing.id : `new:${editing.type}`}` : '';
  const scope = data.exerciseScope ?? program.defaults?.exerciseScope ?? { mode: 'all', selectedWeeks: [] };
  const allowed = new Set(getEligibleMathNumbers(program, activeWeek, scope).map(item => item.value));
  const explicit = program.mathExercises ?? [];
  const catalog = mathCatalog({ ...program, mathExercises: [], activityEnabled: {} }, activeWeek, scope);
  const definitions = [...explicit, ...catalog.exercises.map(item => item.definition).filter(item => !explicit.some(other => other.id === item.id))];
  return <section aria-label="Exercices mathématiques"><nav className="parent-tabs" aria-label="Activités mathématiques">
    {(Object.keys(labels) as MathExerciseType[]).map(kind => <button key={kind} disabled={!!editing} aria-current={type === kind ? 'page' : undefined} onClick={() => setType(kind)}>{labels[kind]}</button>)}
    </nav><button disabled={!!editing} onClick={() => setEditing(type === 'HEAR_NUMBER' ? { id: `math:${newParentId('activity')}`, type, target: 0, distractors: [] }
      : type === 'ORDER_NUMBERS' ? { id: `math:${newParentId('activity')}`, type, sequence: [] } : { id: `math:${newParentId('activity')}`, type, sequence: [], missingIndex: 0, distractors: [] })}>+ Ajouter un exercice mathématique</button>
    {editing && <ParentDraft key={editing.id} id={draftKey} onDirty={() => {}}><Editor {...props} exercise={editing} onClose={() => { parentDrafts.remove(draftKey); setEditing(undefined); }} /></ParentDraft>}
    {definitions.filter(item => item.type === type).map(exercise => {
      const custom = data.mathExercises?.some(item => item.id === exercise.id);
      const source = custom ? 'Personnalisé' : explicit.some(item => item.id === exercise.id) ? 'Programme' : 'Automatique';
      const numbers = mathExerciseNumbers(exercise);
      const weeks = program.weeks.filter(week => week.mathematics?.numbers.some(n => numbers.includes(n))).map(week => week.number);
      const issues = validateMathExercise(exercise, allowed);
      return <article className="parent-card" key={exercise.id}><h4>{labels[exercise.type]}</h4><p>{source} · Semaines {weeks.join(', ')}</p><p>Nombres : {numbers.join(', ')}</p>
        {issues.map((issue, i) => <p role="alert" key={i}>{issue.message}</p>)}
        <label><input type="checkbox" aria-label={`Activer ${exercise.id}`} checked={data.activityEnabled[exercise.id] ?? exercise.enabled ?? true}
          onChange={event => onChange({ ...data, activityEnabled: { ...data.activityEnabled, [exercise.id]: event.target.checked } })} />Activé</label>
        {custom && <><button disabled={!!editing} onClick={() => setEditing(exercise)}>Modifier</button><button onClick={() => { if (window.confirm('Supprimer cet exercice ?')) onChange(removeMathExercise(data, exercise.id)); }}>Supprimer</button></>}
      </article>;
    })}
  </section>;
}
function Editor({ program, data, activeWeek, onChange, exercise, onClose }: Props & { exercise: MathExerciseDefinition; onClose: () => void }) {
  const [id] = useDraftField('id', exercise.id);
  const [numbers, setNumbers] = useDraftField('numbers', exercise.type === 'HEAR_NUMBER' ? String(exercise.target) : exercise.sequence.join(', '));
  const [distractors, setDistractors] = useDraftField('distractors', exercise.type === 'ORDER_NUMBERS' ? '' : exercise.distractors.join(', '));
  const [position, setPosition] = useDraftField('position', exercise.type === 'MISSING_NUMBER' ? String(exercise.missingIndex + 1) : '1');
  const [error, setError] = useState('');
  function parse(text: string) { const tokens = text.trim().split(/[\s,;]+/); if (tokens.some(token => !/^\d+$/.test(token))) throw new Error('Entiers non négatifs requis, séparés par des virgules.'); return tokens.map(Number); }
  return <form className="parent-card" onSubmit={event => { event.preventDefault(); try {
    const values = parse(numbers);
    if (exercise.type === 'HEAR_NUMBER' && values.length !== 1) throw new Error('Un seul nombre à écouter.');
    const next: MathExerciseDefinition = exercise.type === 'ORDER_NUMBERS' ? { ...exercise, sequence: values } : exercise.type === 'HEAR_NUMBER'
      ? { ...exercise, target: values[0], distractors: parse(distractors) } : { ...exercise, sequence: values, missingIndex: Number(position) - 1, distractors: parse(distractors) };
    const saved = saveMathExercise(data, program, activeWeek, data.exerciseScope ?? program.defaults?.exerciseScope ?? { mode: 'all', selectedWeeks: [] }, { ...next, id });
    if (onChange(saved)) onClose(); else setError('Sauvegarde impossible. Réessayez.');
  } catch (err) { setError(err instanceof Error ? err.message : 'Exercice invalide.'); } }}>
    <label>{exercise.type === 'HEAR_NUMBER' ? 'Nombre à écouter' : 'Séquence croissante'}<input value={numbers} onChange={event => setNumbers(event.target.value)} /></label>
    {exercise.type === 'MISSING_NUMBER' && <label>Position manquante (à partir de 1)<input value={position} onChange={event => setPosition(event.target.value)} /></label>}
    {exercise.type !== 'ORDER_NUMBERS' && <label>Distracteurs<input value={distractors} onChange={event => setDistractors(event.target.value)} /></label>}
    {error && <p role="alert">{error}</p>}<button type="submit">Enregistrer l’exercice mathématique</button><button type="button" onClick={onClose}>Annuler</button>
  </form>;
}
