import { useState } from 'react';
import { useDraftField } from './ParentDraft';
import { newParentId, weekError, type ParentWeek } from '../../parent/model';
import type { LearningProgram } from '../../content/model';

export function WeekDraftForm({ program, onSave, onCancel }: {
  program: LearningProgram; onSave: (week: ParentWeek) => boolean; onCancel: () => void;
}) {
  const [number, setNumber] = useDraftField('number', Math.max(0, ...program.weeks.map((week) => week.number)) + 1);
  const [label, setLabel] = useDraftField('label', '');
  const [message, setMessage] = useState('');
  return <form className="parent-card" onSubmit={(event) => {
    event.preventDefault(); const week = { id: newParentId('week'), number, label: label.trim() };
    const error = weekError(program, week); if (error) { setMessage(error); return; }
    if (!onSave(week)) setMessage('Sauvegarde impossible : le brouillon est conservé.');
  }}>
    {message && <p role="status">{message}</p>}
    <label>Numéro de semaine<input type="number" min={1} required value={number} onChange={(event) => setNumber(Number(event.target.value))} /></label>
    <label>Libellé de la semaine<input required value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></label>
    <button type="submit">Créer la semaine</button><button type="button" onClick={onCancel}>Annuler</button>
  </form>;
}
