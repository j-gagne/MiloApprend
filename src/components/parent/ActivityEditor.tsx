import { useDraftField } from './ParentDraft';
import type { Activity, LearningProgram, CompletionTarget } from '../../content/model';
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
import { useEffect } from 'react';
import { letterForPosition, letterPositions, newSpellActivity } from '../../content/spelling';
import { primaryConstruction } from '../../content/construction';
import { reconcileSpellOrder, spellTileText } from '../../content/spell-tile-order';

interface Props { program: LearningProgram; activity: Activity; target: CompletionTarget;
  onSave: (activity: Activity) => void; onCancel: () => void; onDirty: () => void }
export function ActivityEditor({ program, activity, target, onSave, onCancel, onDirty }: Props) {
  const [draft, setDraft] = useDraftField('activity', activity);
  useEffect(() => {
    // Choosing a Word and spell type already creates a meaningful unsaved configuration.
    if (activity.type === 'spell' && !program.activities?.some((item) => item.id === activity.id)) { setDraft(draft); onDirty(); }
  }, []);
  const [search, setSearch] = useDraftField('search', '');
  const segmentation = activitySegmentation(program, draft);
  const segments = segmentation?.segments ?? [];
  const spelling = draft.type === 'spell';
  const positions = spelling ? letterPositions(target.display) : segments.map((segment) => segmentText(program, segment));
  const week = draft.availableFromWeek ?? segmentation?.availableFromWeek ?? target.introducedInWeek;
  const indexes = missingIndexes(draft);
  const previewActivity = { ...draft, enabled: true };
  const previewProgram = withActivity(program, previewActivity);
  const result = activityToExercise(createContentService(createContentRepository(previewProgram), week), previewActivity);
  const errors = result.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message);
  const allowed = program.units.filter((unit) => isAvailable(program, unit, week) && (spelling ? unit.type === 'letter' : isAnswerUnit(unit)));
  const expected = spelling ? indexes.flatMap((index) => positions[index] === undefined ? [] : [positions[index]]) : indexes.map((index) => segments[index]).filter((segment) => segment && 'unitId' in segment)
    .map((segment) => segmentText(program, segment));
  const isCorrect = (text: string) => expected.some((value) => comparableText(value) === comparableText(text));
  function change(next: Activity) {
    setDraft(next.type === 'spell' && next.tileOrder ? { ...next, tileOrder: reconcileSpellOrder(next) } : next); onDirty();
  }
  function hide(index: number, checked: boolean) {
    const missing = checked ? [...indexes, index].sort((a, b) => a - b) : indexes.filter((item) => item !== index);
    const correct = missing.map((i) => comparableText(positions[i]));
    const distractors = draft.distractorUnitIds.filter((id) => !correct.includes(comparableText(program.units.find((unit) => unit.id === id)?.display ?? '')));
    if (draft.type === 'spell') {
      const ids = { ...draft.letterUnitIds };
      if (checked) { const letter = letterForPosition(program, positions[index], week); if (!letter) return; ids[index] = letter.id; }
      else delete ids[index];
      change({ ...draft, missingPositions: missing, letterUnitIds: ids, distractorUnitIds: distractors,
        answerPosition: Math.min(draft.answerPosition ?? 0, distractors.length) }); return;
    }
    change({ ...draft, missingSegmentIndex: undefined, missingSegmentIndexes: missing, distractorUnitIds: distractors,
      answerPosition: Math.min(draft.answerPosition ?? 0, distractors.length) });
  }
  return <section aria-label="Éditeur d’exercice" className="parent-card">
    <h2>Exercice : {target.display}</h2><p>Le contenu et sa construction sont définis dans Programme.</p>
    <form onSubmit={(event) => { event.preventDefault(); if (!errors.length) onSave(draft); }}>
      <div className="parent-form-grid">
        <label>Type de défi<select aria-label="Type de défi" value={draft.type} onChange={(event) => {
          if (event.target.value === 'spell' && target.type === 'word') change({ ...newSpellActivity(program, target, week, draft.id), label: draft.label, enabled: draft.enabled, order: draft.order });
          else change({ id: draft.id, type: 'complete-segments', targetId: target.id, label: draft.label, enabled: draft.enabled, order: draft.order,
            segmentationId: primaryConstruction(target)?.id, availableFromWeek: week, missingSegmentIndexes: [], distractorUnitIds: [] });
        }}><option value="complete-segments">Compléter</option><option value="spell" disabled={target.type !== 'word'}>Écris le mot</option></select></label>
        <label>Nom administratif (facultatif)<input value={draft.label ?? ''} maxLength={120} onChange={(event) => change({ ...draft, label: event.target.value })} /></label>
        <label>Disponible à partir de la semaine<select value={week} onChange={(event) => change({ ...draft, availableFromWeek: Number(event.target.value) })}>
          {program.weeks.map((item) => <option key={item.number} value={item.number}>{item.number} — {item.label}</option>)}
        </select></label>
      </div>
      {draft.type === 'spell' && draft.targetText !== target.display && target.type === 'word' && <button type="button" onClick={() => {
        change({ ...newSpellActivity(program, target, week, draft.id), label: draft.label, enabled: draft.enabled, order: draft.order, tileOrder: draft.tileOrder });
      }}>Reconfigurer les positions pour ce mot</button>}
      <h3>{spelling ? 'Positions des lettres' : target.type === 'word' ? 'Construction du mot' : target.type === 'sentence' ? 'Construction de la phrase' : 'Syllabe à retrouver'}</h3><div className="parent-tokens">{positions.map((text, index) => <span key={index}>{text}</span>)}</div>
      <fieldset><legend>Parties à trouver</legend><div className="parent-checks">{positions.map((text, index) => {
        const segment = segments[index];
        const eligible = spelling ? !!letterForPosition(program, text, week) : 'unitId' in segment && allowed.some((unit) => unit.id === segment.unitId);
        return <label key={index}><input type="checkbox" checked={indexes.includes(index)} disabled={!eligible && !(spelling && indexes.includes(index))}
          aria-label={`Trouver ${text} (${spelling ? 'lettre' : 'bloc'} ${index + 1})`} onChange={(event) => hide(index, event.target.checked)} />
          {text}{spelling ? !eligible ? ' — Texte fourni — réponse non autorisée' : ''
            : !('unitId' in segment) ? ' — Texte visible — non appris' : !eligible ? ' — unité indisponible' : ''}</label>;
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
      {draft.type === 'spell' && <fieldset><legend>Ordre des lettres proposées</legend>
        <p>Déplacez chaque lettre. Cet ordre sera conservé après sauvegarde.</p>
        <div className="parent-actions">{reconcileSpellOrder(draft).map((id, index, order) => {
          const text = spellTileText(draft, id, unitId => program.units.find(unit => unit.id === unitId)?.display ?? '?');
          function move(offset: number) {
            if (draft.type !== 'spell') return;
            const next = [...order]; [next[index], next[index + offset]] = [next[index + offset], next[index]];
            change({ ...draft, tileOrder: next });
          }
          return <span key={id}><strong>{text}</strong>
            <button type="button" disabled={index === 0} aria-label={`Déplacer ${text} (${index + 1}) à gauche`} onClick={() => move(-1)}>←</button>
            <button type="button" disabled={index === order.length - 1} aria-label={`Déplacer ${text} (${index + 1}) à droite`} onClick={() => move(1)}>→</button>
          </span>;
        })}</div>
      </fieldset>}
      {!!errors.length && <div className="parent-errors" role="alert"><strong>À corriger avant de sauvegarder :</strong><ul>{[...new Set(errors)].map((message) => <li key={message}>{message}</li>)}</ul></div>}
      {!errors.length && result.exercise && <ActivityPreview key={JSON.stringify(result.exercise)} exercise={result.exercise} />}
      <div className="parent-actions"><button type="submit" className="parent-primary" disabled={!!errors.length}>Sauvegarder l’exercice</button><button type="button" onClick={onCancel}>Annuler</button></div>
    </form>
  </section>;
}
