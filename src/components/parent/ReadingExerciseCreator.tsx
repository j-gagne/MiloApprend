import { useState } from 'react';
import type { LearningProgram, LearningUnitType } from '../../content/model';
import type { ReadingExerciseDefinition } from '../../content/reading-model';
import { isAvailable } from '../../content/selectors';
import { newParentId } from '../../parent/model';
import { readingExerciseError } from '../../parent/reading-exercises';

interface Props {
  program: LearningProgram;
  activeWeek: number;
  initialExercise?: ReadingExerciseDefinition;
  onSave: (exercise: ReadingExerciseDefinition) => boolean;
  onCancel: () => void;
  onDelete?: () => boolean;
}
type DisplayedUnit = NonNullable<ReadingExerciseDefinition['displayedUnits']>[number];
const types: Record<LearningUnitType, string> = {
  letter: 'Lettre', grapheme: 'Graphème', sound: 'Son', syllable: 'Syllabe',
  word: 'Mot', 'tool-word': 'Mot-outil', sentence: 'Phrase',
};
function move<T>(items: readonly T[], index: number, direction: number): T[] {
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}

export function ReadingExerciseCreator({ program, activeWeek, initialExercise, onSave, onCancel, onDelete }: Props) {
  const [id] = useState(() => initialExercise?.id ?? `reading:${newParentId('activity')}`);
  const [displayedUnits, setDisplayedUnits] = useState<readonly DisplayedUnit[]>(() => initialExercise?.displayedUnits
    ?? [{ unitId: initialExercise?.targetId ?? '' }]);
  const [saveError, setSaveError] = useState('');
  const available = program.units.filter(unit => isAvailable(program, unit, activeWeek));
  const exercise: ReadingExerciseDefinition = { ...initialExercise, id, displayedUnits, enabled: initialExercise?.enabled ?? true };
  const error = readingExerciseError(program, activeWeek, exercise);
  function update(index: number, value: DisplayedUnit) {
    setDisplayedUnits(items => items.map((item, i) => i === index ? value : item));
    setSaveError('');
  }
  const options = (selectedId: string) => <><option value="">Choisir un contenu</option>
    {selectedId && !available.some(unit => unit.id === selectedId) && <option value={selectedId} disabled>
      {program.units.find(unit => unit.id === selectedId)?.display ?? 'Contenu introuvable'} · Indisponible
    </option>}
    {available.map(unit => <option key={unit.id} value={unit.id}>{unit.display} · {types[unit.type]} · Semaine {unit.introducedInWeek}</option>)}</>;
  return <form className="parent-card" aria-label={initialExercise ? 'Modifier un exercice Je lis' : 'Nouvel exercice Je lis'} onSubmit={event => {
    event.preventDefault();
    if (error) return;
    if (!onSave(exercise)) setSaveError('Sauvegarde impossible : votre page est conservée ici. Réessayez.');
  }}>
    <h3>{initialExercise ? 'Modifier la page Je lis' : 'Nouvelle page Je lis'}</h3>
    <p>Choisissez les contenus à afficher sur une même page, puis les morceaux à lire pour chacun.</p>
    {displayedUnits.map((unit, index) => <fieldset key={index}>
      <legend>Contenu {index + 1}</legend>
      <label>Contenu affiché<select autoFocus={index === 0} aria-label={`Contenu affiché ${index + 1}`} value={unit.unitId}
        onChange={event => update(index, { unitId: event.target.value })}>{options(unit.unitId)}</select></label>
      <div className="parent-actions">
        <button type="button" aria-label={`Déplacer le contenu ${index + 1} à gauche`} disabled={index === 0}
          onClick={() => setDisplayedUnits(move(displayedUnits, index, -1))}>←</button>
        <button type="button" aria-label={`Déplacer le contenu ${index + 1} à droite`} disabled={index === displayedUnits.length - 1}
          onClick={() => setDisplayedUnits(move(displayedUnits, index, 1))}>→</button>
        <button type="button" onClick={() => setDisplayedUnits(displayedUnits.filter((_, i) => i !== index))}>Retirer le contenu {index + 1}</button>
      </div>
      <label>Prononciation<select aria-label={`Prononciation du contenu ${index + 1}`} disabled={!unit.unitId}
        value={unit.segmentUnitIds === undefined ? 'whole' : 'segments'} onChange={event => update(index,
          event.target.value === 'whole' ? { ...unit, segmentUnitIds: undefined } : { ...unit, segmentUnitIds: [''] })}>
        <option value="whole">En entier · un curseur</option><option value="segments">Morceaux choisis · un curseur par morceau</option>
      </select></label>
      {unit.segmentUnitIds !== undefined && <>
        {unit.segmentUnitIds.map((segmentId, segmentIndex) => <div key={segmentIndex}>
          <label>Morceau {segmentIndex + 1}<select aria-label={`Morceau ${segmentIndex + 1} du contenu ${index + 1}`} value={segmentId}
            onChange={event => update(index, { ...unit, segmentUnitIds: unit.segmentUnitIds!.map((value, i) =>
              i === segmentIndex ? event.target.value : value) })}>{options(segmentId)}</select></label>
          <div className="parent-actions">
            <button type="button" aria-label={`Monter le morceau ${segmentIndex + 1} du contenu ${index + 1}`} disabled={segmentIndex === 0}
              onClick={() => update(index, { ...unit, segmentUnitIds: move(unit.segmentUnitIds!, segmentIndex, -1) })}>Monter</button>
            <button type="button" aria-label={`Descendre le morceau ${segmentIndex + 1} du contenu ${index + 1}`} disabled={segmentIndex === unit.segmentUnitIds!.length - 1}
              onClick={() => update(index, { ...unit, segmentUnitIds: move(unit.segmentUnitIds!, segmentIndex, 1) })}>Descendre</button>
            <button type="button" aria-label={`Retirer le morceau ${segmentIndex + 1} du contenu ${index + 1}`}
              onClick={() => update(index, { ...unit, segmentUnitIds: unit.segmentUnitIds!.filter((_, i) => i !== segmentIndex) })}>Retirer</button>
          </div>
        </div>)}
        <button type="button" onClick={() => update(index, { ...unit, segmentUnitIds: [...unit.segmentUnitIds!, ''] })}>+ Ajouter un morceau</button>
      </>}
    </fieldset>)}
    <button type="button" onClick={() => setDisplayedUnits([...displayedUnits, { unitId: '' }])}>+ Ajouter un contenu</button>
    {error && <p className="parent-errors">{error}</p>}
    {saveError && <p role="alert" className="parent-errors">{saveError}</p>}
    <div className="parent-actions">
      <button className="parent-primary" type="submit" disabled={!!error}>Enregistrer</button>
      <button type="button" onClick={onCancel}>Annuler</button>
      {onDelete && <button type="button" onClick={() => {
        if (window.confirm('Supprimer cet exercice Je lis ? Les contenus partagés seront conservés.') && !onDelete()) {
          setSaveError('Suppression non enregistrée. Réessayez.');
        }
      }}>Supprimer</button>}
    </div>
  </form>;
}
