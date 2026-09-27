import { useState } from 'react';
import type { CompletionActivity, LearningProgram, Sentence, Word } from '../../content/model';
import { missingIndexes } from '../../content/model';
import { activitySegmentation } from '../../content/activity-segmentation';
import { comparableText } from '../../content/text';
import { isAvailable } from '../../content/selectors';
import { isAnswerUnit } from '../../content/validation';
import { createContentRepository } from '../../content/repository';
import { createContentService } from '../../content/service';
import { activityToExercise } from '../../game/completion-content';
import { segmentText, withActivity } from '../../parent/activities';
import { ActivityPreview } from './ActivityPreview';

interface Props { program: LearningProgram; activity: CompletionActivity; target: Word | Sentence;
  onSave: (activity: CompletionActivity) => void; onCancel: () => void; onDirty: () => void }
export function ActivityEditor({ program, activity, target, onSave, onCancel, onDirty }: Props) {
  const [draft, setDraft] = useState(activity);
  const [search, setSearch] = useState('');
  const segmentation = activitySegmentation(program, draft);
  const segments = segmentation?.segments ?? [];
  const week = draft.availableFromWeek ?? segmentation?.availableFromWeek ?? target.introducedInWeek;
  const indexes = missingIndexes(draft);
  const previewActivity = { ...draft, enabled: true };
  const previewProgram = withActivity(program, previewActivity);
  const result = activityToExercise(createContentService(createContentRepository(previewProgram), week), previewActivity);
  const errors = result.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message);
  const allowed = program.units.filter((unit) => isAvailable(program, unit, week) && isAnswerUnit(unit));
  const expected = indexes.map((index) => segments[index]).filter((segment) => segment && 'unitId' in segment)
    .map((segment) => segmentText(program, segment));
  const isCorrect = (text: string) => expected.some((value) => comparableText(value) === comparableText(text));
  function change(next: CompletionActivity) { setDraft(next); onDirty(); }
  function hide(index: number, checked: boolean) {
    const missing = checked ? [...indexes, index].sort((a, b) => a - b) : indexes.filter((item) => item !== index);
    const correct = missing.map((i) => comparableText(segmentText(program, segments[i])));
    const distractors = draft.distractorUnitIds.filter((id) => !correct.includes(comparableText(program.units.find((unit) => unit.id === id)?.display ?? '')));
    change({ ...draft, missingSegmentIndex: undefined, missingSegmentIndexes: missing, distractorUnitIds: distractors,
      answerPosition: Math.min(draft.answerPosition ?? 0, distractors.length) });
  }
  return <section aria-label="Éditeur d’exercice" className="parent-card">
    <h2>Exercice : {target.display}</h2><p>Le contenu et sa construction sont définis dans Programme.</p>
    <form onSubmit={(event) => { event.preventDefault(); if (!errors.length) onSave(draft); }}>
      <div className="parent-form-grid">
        <label>Nom administratif (facultatif)<input value={draft.label ?? ''} maxLength={120} onChange={(event) => change({ ...draft, label: event.target.value })} /></label>
        <label>Disponible à partir de la semaine<select value={week} onChange={(event) => change({ ...draft, availableFromWeek: Number(event.target.value) })}>
          {program.weeks.map((item) => <option key={item.number} value={item.number}>{item.number} — {item.label}</option>)}
        </select></label>
      </div>
      <h3>{target.type === 'word' ? 'Construction du mot' : 'Construction de la phrase'}</h3><div className="parent-tokens">{segments.map((segment, index) => <span key={index}>{segmentText(program, segment)}</span>)}</div>
      <fieldset><legend>Parties à trouver</legend><div className="parent-checks">{segments.map((segment, index) => {
        const eligible = 'unitId' in segment && allowed.some((unit) => unit.id === segment.unitId);
        return <label key={index}><input type="checkbox" checked={indexes.includes(index)} disabled={!eligible}
          aria-label={`Trouver ${segmentText(program, segment)} (bloc ${index + 1})`} onChange={(event) => hide(index, event.target.checked)} />
          {segmentText(program, segment)}{!('unitId' in segment) ? ' — Texte visible — non appris' : !eligible ? ' — unité indisponible' : ''}</label>;
      })}</div></fieldset>
      <p><strong>Bonnes réponses :</strong> {expected.join(' · ') || 'Sélectionnez au moins une partie.'}</p>
      <fieldset><legend>Distracteurs</legend>
        <label>Filtrer les distracteurs<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="parent-checks choice-scroll">{allowed.filter((unit) => !isCorrect(unit.display) && comparableText(unit.display).includes(comparableText(search)))
          .map((unit) => <label key={unit.id}><input type="checkbox" aria-label={`Distracteur ${unit.display} (${unit.type})`}
            checked={draft.distractorUnitIds.includes(unit.id)} onChange={(event) => {
              const ids = event.target.checked ? [...draft.distractorUnitIds, unit.id] : draft.distractorUnitIds.filter((id) => id !== unit.id);
              change({ ...draft, distractorUnitIds: ids, answerPosition: Math.min(draft.answerPosition ?? 0, ids.length) });
            }} />{unit.display} <small>{unit.type}</small></label>)}</div>
        {draft.distractorUnitIds.filter((id) => !allowed.some((unit) => unit.id === id) || isCorrect(program.units.find((unit) => unit.id === id)?.display ?? '')).map((id) => <p key={id}>
          Distracteur indisponible : {program.units.find((unit) => unit.id === id)?.display ?? id}. <button type="button" onClick={() => {
            const ids = draft.distractorUnitIds.filter((item) => item !== id);
            change({ ...draft, distractorUnitIds: ids, answerPosition: Math.min(draft.answerPosition ?? 0, ids.length) });
          }}>Retirer ce distracteur</button></p>)}
      </fieldset>
      {!!errors.length && <div className="parent-errors" role="alert"><strong>À corriger avant de sauvegarder :</strong><ul>{[...new Set(errors)].map((message) => <li key={message}>{message}</li>)}</ul></div>}
      {!errors.length && result.exercise && <ActivityPreview key={JSON.stringify(result.exercise)} exercise={result.exercise} />}
      <div className="parent-actions"><button type="submit" className="parent-primary" disabled={!!errors.length}>Sauvegarder l’exercice</button><button type="button" onClick={onCancel}>Annuler</button></div>
    </form>
  </section>;
}
