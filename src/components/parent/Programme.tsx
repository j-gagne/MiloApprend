import { useState } from 'react';
import type { LearningProgram, LearningUnit } from '../../content/model';
import { primaryConstruction } from '../../content/construction';
import type { ParentData } from '../../parent/model';
import { newParentId, removeCustomWeek, removeCustomWord } from '../../parent/model';
import { ParentDraft } from './ParentDraft';
import { WeekDraftForm } from './WeekDraftForm';
import { parentDrafts } from '../../services/parent-drafts';
const weekDraftKey = 'programme:week:new';

interface Props { program: LearningProgram; data: ParentData; onChange: (data: ParentData) => boolean; onEdit: (unit: LearningUnit) => void; onDirtyChange: (value: boolean) => void }
const types = [['letter', 'Lettres', 'une lettre'], ['grapheme', 'Graphèmes', 'un graphème'], ['syllable', 'Syllabes', 'une syllabe'], ['word', 'Mots', 'un mot'], ['sentence', 'Phrases', 'une phrase']] as const;
export function Programme({ program, data, onChange, onEdit, onDirtyChange }: Props) {
  const [opened, setOpened] = useState<number>();
  const [adding, setAdding] = useState(() => !!parentDrafts.load(weekDraftKey));
  const [message, setMessage] = useState('');
  const units = program.units.filter((unit) => unit.introducedInWeek === opened);
  function create(type: 'letter' | 'grapheme' | 'syllable' | 'word' | 'sentence') {
    const base = { id: newParentId(type), display: '', audioText: '', introducedInWeek: opened!, enabled: true, tags: ['parent', 'practice'] };
    onEdit(type === 'word' ? { ...base, type, text: '', segmentations: [] }
      : type === 'letter' ? { ...base, type, grapheme: '' } : { ...base, type });
  }
  return <section aria-label="Programme pédagogique"><h2>Programme</h2>
    {message && <p role="status">{message}</p>}
    {opened === undefined ? <>
      <button className="parent-primary" onClick={() => { setAdding(!adding); if (adding) onDirtyChange(false); }}>+ Ajouter une semaine</button>
      {adding && <ParentDraft id={weekDraftKey} onDirty={() => onDirtyChange(true)}><WeekDraftForm program={program}
        onCancel={() => { parentDrafts.remove(weekDraftKey); setAdding(false); onDirtyChange(false); }}
        onSave={(week) => {
          if (!onChange({ ...data, customWeeks: [...data.customWeeks, week] })) return false;
          parentDrafts.remove(weekDraftKey); setAdding(false); setOpened(week.number); onDirtyChange(false); setMessage('Semaine créée.'); return true;
        }} /></ParentDraft>}
      {program.weeks.map((week) => {
        const custom = data.customWeeks.find((item) => item.number === week.number);
        return <article className="parent-card" key={week.number} aria-label={`Programme semaine ${week.number}`}>
          <h3>Semaine {week.number} — {week.label}</h3><p>{custom ? 'Parent / personnalisé' : 'Programme initial'}</p>
          <p>{types.map(([type, title]) => `${program.units.filter((unit) => unit.introducedInWeek === week.number && unit.type === type).length} ${title.toLocaleLowerCase('fr')}`).join(' · ')}</p>
          <button onClick={() => { setOpened(week.number); onDirtyChange(false); setMessage(''); }}>Ouvrir la semaine {week.number}</button>
          {custom && <button onClick={() => {
            const next = removeCustomWeek(data, program, custom.id);
            if (next === data) { setMessage('Cette semaine contient du contenu ou des exercices. Déplacez ou supprimez ces éléments avant de supprimer la semaine.'); return; }
            if (window.confirm(`Supprimer la semaine ${week.number} ?`)) { onChange(next); setMessage('Semaine supprimée.'); }
          }}>Supprimer la semaine {week.number}</button>}
        </article>;
      })}
    </> : <>
      <button onClick={() => { setOpened(undefined); setMessage(''); }}>Toutes les semaines</button>
      <h3>Semaine {opened} — {program.weeks.find((week) => week.number === opened)?.label}</h3>
      <p>Uniquement les nouveautés introduites cette semaine.</p>
      {types.map(([type, title, singular]) => <section className="parent-group" key={type}><h3>{title}</h3>
        <button onClick={() => create(type)}>+ Ajouter {singular}</button>
        {units.filter((unit) => unit.type === type).map((unit) => <article className="parent-row" key={unit.id} aria-label={`Contenu ${unit.display}`}>
          <div><strong>{unit.display}</strong><p>Semaine {unit.introducedInWeek} · {data.customUnits.some((item) => item.id === unit.id) ? 'Parent / personnalisé' : unit.tags?.includes('practice') ? 'Entraînement initial' : 'École'}</p></div>
          <label><input type="checkbox" aria-label={`Activer ${unit.display}`} checked={unit.enabled} onChange={(event) => onChange({ ...data, unitEnabled: { ...data.unitEnabled, [unit.id]: event.target.checked } })} />Activé</label>
          {!data.customUnits.some((item) => item.id === unit.id) && unit.type !== 'sentence' && <button onClick={() => onEdit(unit)}>Modifier la prononciation</button>}
          {(unit.type === 'word' || unit.type === 'sentence') && <div><small>{primaryConstruction(unit) ? 'Construction définie' : 'Aucune construction'}</small>
            {!data.customUnits.some((item) => item.id === unit.id) && <button onClick={() => onEdit(unit)}>{primaryConstruction(unit) ? 'Modifier la construction' : 'Définir la construction'}</button>}</div>}
          {data.customUnits.some((item) => item.id === unit.id) && <div className="parent-actions"><button onClick={() => onEdit(unit)}>Modifier {unit.display}</button>
            <button onClick={() => { if (window.confirm(`Supprimer « ${unit.display} » et ses exercices ? Les autres contenus qui le référencent deviendront indisponibles.`)) onChange(removeCustomWord(data, unit.id)); }}>Supprimer {unit.display}</button></div>}
        </article>)}
        {!units.some((unit) => unit.type === type) && <p>Aucune nouveauté.</p>}
      </section>)}
      {units.filter((unit) => !types.some(([type]) => type === unit.type)).map((unit) => <p key={unit.id}>{unit.display} · {unit.type}</p>)}
    </>}
  </section>;
}
