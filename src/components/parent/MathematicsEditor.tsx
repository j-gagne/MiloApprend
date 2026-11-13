import { useState } from 'react';
import type { LearningProgram } from '../../content/model';
import { saveWeekMathematics, type ParentData } from '../../parent/model';
import { useDraftField } from './ParentDraft';

export function MathematicsEditor({ program, data, week, onSave }: {
  program: LearningProgram; data: ParentData; week: number; onSave: (data: ParentData) => boolean;
}) {
  const [text, setText] = useDraftField('numbers', program.weeks.find(item => item.number === week)?.mathematics?.numbers.join(', ') ?? '');
  const [message, setMessage] = useState('');
  return <form className="parent-group" onSubmit={event => {
    event.preventDefault();
    const tokens = text.trim() ? text.trim().split(/[\s,;]+/) : [];
    if (tokens.some(token => !/^\d+$/.test(token))) { setMessage('Saisissez des entiers non négatifs séparés par des virgules ou des espaces.'); return; }
    try {
      const next = saveWeekMathematics(data, program, week, { numbers: tokens.map(Number) });
      const previous = program.weeks.find(item => item.number === week)?.mathematics?.numbers ?? [];
      if (previous.some(number => !tokens.map(Number).includes(number))
        && !window.confirm('Retirer les nombres remplacés de cette semaine ?')) return;
      setMessage(onSave(next) ? 'Nombres enregistrés.' : 'Enregistrement impossible. Réessayez.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Nombres invalides.'); }
  }}>
    <h3>Mathématiques</h3>
    <label>Nombres introduits<input value={text} onChange={event => setText(event.target.value)} aria-describedby="math-help" /></label>
    <p id="math-help">Séparez les nombres par des virgules ou des espaces. Laissez vide pour aucun nombre.</p>
    <button type="submit">Enregistrer les nombres</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
