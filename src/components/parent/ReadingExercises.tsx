import { useState } from 'react';
import type { LearningProgram } from '../../content/model';
import { parentReadingCatalog } from '../../content/reading-catalog';
import type { ParentData } from '../../parent/model';
import type { ReadingExerciseDefinition } from '../../content/reading-model';
import { addReadingExercise, updateReadingExercise, removeReadingExercise } from '../../parent/reading-exercises';
import { ReadingExerciseCreator } from './ReadingExerciseCreator';

interface Props {
  program: LearningProgram;
  data: ParentData;
  activeWeek: number;
  search: string;
  onChange: (data: ParentData) => boolean;
  onCreated: () => void;
}

export function ReadingExercises({ program, data, activeWeek, search, onChange, onCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ReadingExerciseDefinition>();
  const editorOpen = creating || !!editing;
  function closeEditor() { setCreating(false); setEditing(undefined); }
  const { entries, issues } = parentReadingCatalog(program, activeWeek);
  const matching = entries.filter(({ exercise }) => exercise.displayedUnits.some(unit =>
    unit.display.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))));
  return <section className="parent-group" aria-label="Exercices Je lis">
    <h3>Je lis</h3>
    <button className="parent-primary" onClick={() => setCreating(true)} disabled={editorOpen}>+ Ajouter un exercice</button>
    {editorOpen && <ReadingExerciseCreator key={editing?.id ?? 'new'} initialExercise={editing}
      program={program} activeWeek={activeWeek} onCancel={closeEditor}
      onDelete={editing ? () => {
        if (!onChange(removeReadingExercise(data, editing.id))) return false;
        closeEditor(); return true;
      } : undefined}
      onSave={exercise => {
        const next = editing ? updateReadingExercise(data, program, activeWeek, exercise)
          : addReadingExercise(data, program, activeWeek, exercise);
        if (!next || !onChange(next)) return false;
        closeEditor(); onCreated(); return true;
      }} />}
    <p>Une carte représente une page. L’activation concerne seulement cette page de Je lis.</p>
    {matching.map(({ exercise, enabled, available, automatic }) => {
      const custom = data.readingExercises?.find(item => item.id === exercise.id);
      const display = exercise.displayedUnits.map(unit => unit.display).join(' | ');
      const segments = exercise.displayedUnits.map(unit => unit.segments.map(segment => segment.text).join(' + ')).join(' | ');
      return <article key={exercise.id} className="parent-card" aria-label={`Je lis : ${display}`}>
        <h4>{display}</h4>
        <p>{automatic ? 'Automatique' : custom ? 'Personnalisé' : 'Programme'} · Semaine {exercise.introducedInWeek}</p>
        <p>Segments : {segments}</p>
        <p>{!available ? 'Indisponible pour la semaine active' : enabled ? 'Activé' : 'Désactivé'}</p>
        <div className="parent-actions"><label>
          <input type="checkbox" aria-label={`Activer la page ${display} — ${segments}`} checked={enabled}
            onChange={event => onChange({ ...data, activityEnabled: { ...data.activityEnabled, [exercise.id]: event.target.checked } })} />Activé
        </label>
          {custom && !automatic && <button disabled={editorOpen} onClick={() => setEditing(custom)}>Modifier</button>}
        </div>
      </article>;
    })}
    {!matching.length && <p>Aucun exercice Je lis correspondant.</p>}
    {issues.map((issue, index) => <p key={index} role="alert">{issue.path} : {issue.message}</p>)}
  </section>;
}
