import { useState } from 'react';
import type { Activity, LearningProgram, Sentence, Word } from '../../content/model';
import { missingIndexes } from '../../content/model';
import { activitySegmentation } from '../../content/activity-segmentation';
import { validateCompletionActivity } from '../../content/validation';
import { parentActivities, segmentText } from '../../parent/activities';
import { duplicateActivity, newParentId, removeCustomActivity } from '../../parent/model';
import type { ParentData } from '../../parent/model';
import { primaryConstruction } from '../../content/construction';
import { activityCatalog, isAutomatic, isCompletionTarget } from '../../content/activity-catalog';
import type { CompletionTarget } from '../../content/model';
import { letterPositions, newSpellActivity } from '../../content/spelling';
import { ReadingExercises } from './ReadingExercises';

interface Props { baseProgram: LearningProgram; program: LearningProgram; data: ParentData; activeWeek: number; onChange: (data: ParentData) => boolean;
  onConstruct: (target: Word | Sentence) => void;
  onEdit: (activity: Activity, target: CompletionTarget) => void }
export function Exercises({ baseProgram, program, data, activeWeek, onChange, onEdit, onConstruct }: Props) {
  const [tab, setTab] = useState<'complete' | 'reading'>('complete');
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<'complete-segments' | 'spell'>('complete-segments');
  const [targetId, setTargetId] = useState('');
  const [search, setSearch] = useState('');
  const activities = activityCatalog(program, activeWeek, true);
  const seedIds = new Set(parentActivities(baseProgram).map((item) => item.id));
  const target = program.units.find((unit) => unit.id === targetId);
  return <section aria-label="Exercices pédagogiques"><h2>Exercices</h2>
    <nav className="parent-tabs" aria-label="Types d’exercices">
      <button aria-current={tab === 'complete' ? 'page' : undefined} onClick={() => setTab('complete')}>COMPLÈTE</button>
      <button aria-current={tab === 'reading' ? 'page' : undefined} onClick={() => setTab('reading')}>JE LIS</button>
    </nav>
    {tab === 'complete' ? <>
    <button className="parent-primary" onClick={() => setAdding(!adding)}>+ Nouvel exercice</button>
    {adding && <div className="parent-card">
      <label>Type de défi<select aria-label="Type de défi" value={kind} onChange={(event) => { setKind(event.target.value as typeof kind); setTargetId(''); }}>
        <option value="complete-segments">Compléter</option><option value="spell">Écris le mot</option>
      </select></label>
      <label>Cible de l’exercice<select aria-label="Cible de l’exercice" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
      <option value="">Choisir un mot ou une phrase</option>{(['word', 'sentence'] as const).map((type) => <optgroup key={type} label={type === 'word' ? 'Mots' : 'Phrases'}>
        {program.units.filter((unit) => unit.type === type && (kind !== 'spell' || unit.type === 'word')).map((unit) => <option key={unit.id} value={unit.id}>{unit.display} · semaine {unit.introducedInWeek}{kind !== 'spell' && !primaryConstruction(unit) ? ' · Aucune construction' : ''}</option>)}
      </optgroup>)}
    </select></label>
      {kind !== 'spell' && target && (target.type === 'word' || target.type === 'sentence') && !primaryConstruction(target) && <>
        <p>{target.type === 'word' ? "Ce mot n'a pas encore de construction." : "Cette phrase n'a pas encore de construction."}</p>
        <button onClick={() => onConstruct(target)}>Définir la construction</button>
      </>}
      <button disabled={!target || (kind === 'spell' ? target.type !== 'word' : !primaryConstruction(target))} onClick={() => {
        if (target?.type !== 'word' && target?.type !== 'sentence') return;
        if (kind === 'spell' && target.type === 'word') { onEdit(newSpellActivity(program, target, Math.max(activeWeek, target.introducedInWeek), newParentId('activity')), target); return; }
        const construction = primaryConstruction(target); if (!construction) return;
        onEdit({ id: newParentId('activity'), type: 'complete-segments', targetId: target.id, segmentationId: construction.id,
          availableFromWeek: construction.availableFromWeek ?? target.introducedInWeek,
          missingSegmentIndexes: [], distractorUnitIds: [] }, target);
      }}>Configurer l’exercice</button></div>}
    <label>Rechercher un exercice<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {program.units.filter((unit): unit is CompletionTarget => isCompletionTarget(unit)
      && unit.display.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))).map((unit) => {
      const group = activities.filter((activity) => activity.targetId === unit.id);
      if (!group.length) return <section key={unit.id} className="parent-group"><h3>{unit.display}</h3><p>{!primaryConstruction(unit) && unit.type !== 'syllable'
        ? 'Aucun exercice automatique : construction non définie.' : 'Aucun exercice automatique admissible pour la semaine active.'}</p></section>;
      return <section key={unit.id} className="parent-group" aria-label={`Exercices du mot ${unit.display}`}><h3>{unit.display} · {group.length} exercice{group.length > 1 ? 's' : ''}</h3>
        {group.map((activity, index) => {
          const segmentation = activitySegmentation(program, activity);
          const errors = validateCompletionActivity({ ...program, activities }, activity, activeWeek).filter((issue) => issue.severity === 'error');
          const automatic = isAutomatic(activity);
          const custom = !automatic && !seedIds.has(activity.id);
          return <article key={activity.id} className="parent-card" aria-label={`Exercice ${unit.display} variante ${index + 1}`}>
            {(index === 0 || isAutomatic(group[index - 1]) !== automatic) && <h4>{automatic ? 'Exercices automatiques' : 'Exercices personnalisés'}</h4>}
            <h4>{activity.label || `Variante ${index + 1}`}</h4><p>{unit.type === 'sentence' ? 'Phrase' : unit.type === 'syllable' ? 'Syllabe' : 'Mot'} · {automatic ? 'Automatique' : custom ? 'Parent / personnalisé' : 'Programme initial'} · Semaine {activity.availableFromWeek ?? segmentation?.availableFromWeek ?? unit.introducedInWeek}</p>
            <p>{activity.type === 'spell' ? `Écris le mot : ${letterPositions(unit.display).join(' | ')}` : `Construction : ${segmentation?.segments.map((segment) => segmentText(program, segment)).join(' + ') ?? 'Introuvable'}`}</p>
            <p>Parties à trouver : {activity.type === 'spell' ? activity.missingPositions.map((i) => `${letterPositions(unit.display)[i] ?? '?'} (${i + 1})`).join(' + ')
              : missingIndexes(activity).map((i) => segmentation?.segments[i]).filter((part) => !!part).map((part) => segmentText(program, part)).join(' + ')}</p>
            <p>{errors.length ? 'Indisponible pour la semaine active' : 'Jouable'}</p>
            {!!errors.length && <details><summary>Voir les raisons</summary><ul>{errors.map((issue, i) => <li key={i}>{issue.message}</li>)}</ul></details>}
            <div className="parent-actions"><label><input type="checkbox" aria-label={`Activer l’exercice ${unit.display} variante ${index + 1}`} checked={activity.enabled !== false}
              onChange={(event) => onChange({ ...data, activityEnabled: { ...data.activityEnabled, [activity.id]: event.target.checked } })} />Activé</label>
              <button onClick={() => onEdit(automatic ? duplicateActivity(activity) : activity, unit)}>{automatic ? 'Personnaliser l’exercice' : 'Modifier l’exercice'}</button>
              <button onClick={() => onEdit(duplicateActivity(activity), unit)}>Dupliquer l’exercice</button>
              {custom && <button onClick={() => { if (window.confirm(`Supprimer cet exercice de « ${unit.display} » ? Le mot sera conservé.`)) onChange(removeCustomActivity(data, baseProgram, activity.id)); }}>Supprimer l’exercice</button>}
            </div>
          </article>;
        })}
      </section>;
    })}
    {activities.filter((activity) => !program.units.some((unit) => unit.id === activity.targetId)).map((activity) => <p key={activity.id} role="alert">Exercice {activity.id} : cible introuvable, exclu du jeu.</p>)}
    </> : <>
      <label>Rechercher un exercice<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <ReadingExercises program={program} data={data} activeWeek={activeWeek} search={search} onChange={onChange} onCreated={() => setSearch('')} />
    </>}
  </section>;
}
