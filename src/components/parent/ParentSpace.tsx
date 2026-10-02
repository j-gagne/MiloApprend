import { useEffect, useMemo, useState } from 'react';
import type { Activity, LearningUnit, CompletionTarget, LearningProgram } from '../../content/model';
import type { ContentService } from '../../content/service';
import { getCompleteWordChallenges } from '../../game/complete-word-content';
import type { ParentData } from '../../parent/model';
import { emptyParentData, saveActivity, saveParentUnit, newParentId } from '../../parent/model';
import { primaryConstruction } from '../../content/construction';
import { parentActivities } from '../../parent/activities';
import { ActivityEditor } from './ActivityEditor';
import { UnitEditor } from './UnitEditor';
import { Programme } from './Programme';
import { Exercises } from './Exercises';
import { AudioTest } from './AudioTest';
import { gameAudio } from '../../services/audio';
import { READING_SPEEDS, DEFAULT_READING_SPEED, type ReadingSpeed } from '../../services/audio-settings';
import { DEFAULT_GAME_MODE, DEFAULT_CHAIN_LENGTH, DEFAULT_QUESTION_COUNT } from '../../game/play-settings';

import { ParentDraft } from './ParentDraft';
import { parentDrafts, parentTabs, draftIdentity, type ParentTab } from '../../services/parent-drafts';

interface Props { baseProgram: LearningProgram; playerName: string; data: ParentData; service: ContentService; warning?: string; onChange: (data: ParentData) => boolean;
  onExit: () => void; onDirtyChange: (dirty: boolean) => void; onResetProgress: () => boolean }
const tabs = parentTabs;
type Tab = ParentTab;
interface Editing { activity: Activity; target: CompletionTarget }

export function ParentSpace({ baseProgram, playerName, data, service, warning, onChange, onExit, onDirtyChange, onResetProgress }: Props) {
  const [restored] = useState(() => {
    const key = parentDrafts.navigation().editorKey;
    const fields = key ? parentDrafts.load(key) : undefined;
    const editor = fields?.$editor as { unit?: LearningUnit; editing?: Editing; returnToExercise?: boolean } | undefined;
    if (editor?.unit && typeof editor.unit.id === 'string' && typeof editor.unit.display === 'string'
      && key?.startsWith(`unit:${editor.unit.type}:`) && key.endsWith(`:${editor.unit.id}`)) return { ...editor, key };
    if (editor?.editing?.activity?.id && editor.editing.target?.id
      && key?.startsWith('exercise:') && key.endsWith(`:${editor.editing.activity.id}`)) return { ...editor, key };
    return undefined;
  });
  const [tab, setTab] = useState<Tab>(() => parentDrafts.navigation().tab);
  const [editing, setEditing] = useState<Editing | undefined>(restored?.editing);
  const [unit, setUnit] = useState<LearningUnit | undefined>(restored?.unit);
  const [returnToExercise, setReturnToExercise] = useState(restored?.returnToExercise ?? false);
  const [draftKey, setDraftKey] = useState(restored?.key);
  useEffect(() => { parentDrafts.navigate({ active: true, tab, editorKey: draftKey }); }, [tab, draftKey]);
  const [dirty, setDirtyState] = useState(false);
  useEffect(() => () => gameAudio.stop(), []);
  function setDirty(value: boolean) { setDirtyState(value); onDirtyChange(value); }
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const [message, setMessage] = useState('');
  const program = service.getProgram();
  const challenges = useMemo(() => getCompleteWordChallenges(service).challenges, [service]);
  const words = service.getAvailableWords();
  function canLeave() { return !dirty || window.confirm('Quitter cet éditeur sans enregistrer les modifications ?'); }
  function discard() { if (draftKey) parentDrafts.remove(draftKey); setDraftKey(undefined); }
  function closeEditor() { if (canLeave()) { discard(); setEditing(undefined); setUnit(undefined); setDirty(false); } }
  function navigate(next: Tab) { if (canLeave()) { setEditing(undefined); setUnit(undefined); setDirty(false); setDraftKey(undefined); setTab(next); setMessage(''); } }
  function saved(persisted: boolean) {
    if (!persisted) { setMessage('Sauvegarde impossible : le brouillon est conservé.'); return false; }
    discard(); setEditing(undefined); setUnit(undefined); setDirty(false); setMessage('Modifications enregistrées.'); return true;
  }
  return <main className="parent-screen">
    <div className="parent-heading"><h1>Espace parents</h1><button onClick={() => { if (canLeave()) onExit(); }}>Retour au jeu</button></div>
    <nav className="parent-tabs" aria-label="Sections parents">{tabs.map((item) => <button key={item}
      aria-current={tab === item ? 'page' : undefined} onClick={() => navigate(item)}>{item}</button>)}</nav>
    {warning && <p className="parent-errors" role="alert">{warning}</p>}
    {message && <p role="status" className="parent-notice">{message}</p>}
    {(editing || unit) && draftKey ? <ParentDraft key={draftKey} id={draftKey} editor={{ unit, editing, returnToExercise }} onDirty={() => setDirty(true)}>
    {editing ? <ActivityEditor key={editing.activity.id} program={program} {...editing} onDirty={() => setDirty(true)} onCancel={closeEditor}
      onSave={(activity) => saved(onChange(saveActivity(data, activity)))} />
      : unit ? <UnitEditor key={unit.id} program={program} unit={unit} activeWeek={service.activeWeek}
        constructionOnly={program.units.some((item) => item.id === unit.id) && !data.customUnits.some((item) => item.id === unit.id)}
        onDirty={() => setDirty(true)} onCancel={closeEditor}
        onSave={(value) => {
          if (!saved(onChange(saveParentUnit(data, program, value)))) return;
          const construction = primaryConstruction(value);
          if (returnToExercise && construction && (value.type === 'word' || value.type === 'sentence')) {
            const id = newParentId('activity'); setDraftKey(draftIdentity('exercise', id, false));
            setEditing({ target: value, activity: { id, type: 'complete-segments', targetId: value.id,
              segmentationId: construction.id, availableFromWeek: construction.availableFromWeek ?? value.introducedInWeek,
              missingSegmentIndexes: [], distractorUnitIds: [] } });
          }
          setReturnToExercise(false);
        }} /> : null}</ParentDraft> : <>
      {tab === 'Aperçu' && <section aria-label="Aperçu du programme"><h2>Le programme de {playerName}</h2>
        <p>Les disponibilités suivent la semaine choisie et vos activations.</p><dl className="parent-stats">
          {[
            ['Semaine active', service.activeWeek], ['Mots disponibles', words.length],
            ['Mots jouables', new Set(challenges.filter((item) => item.targetType === 'word').map((item) => item.word)).size], ['Variantes d’exercices', challenges.length],
            ['Phrases', service.getAvailableSentences().length],
            ['Contenu de l’école (mots disponibles)', words.filter((word) => word.tags?.includes('school')).length],
            ['Contenu d’entraînement (mots disponibles)', words.filter((word) => word.tags?.includes('practice')).length],
          ].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
        </dl><p>Les modifications restent sur ce navigateur. La progression de {playerName} est conservée séparément.</p>
      </section>}
      {tab === 'Programme' && <Programme onDirtyChange={setDirty} program={program} data={data} onChange={onChange} onEdit={(value) => { setDraftKey(draftIdentity(`unit:${value.type}`, value.id, program.units.some((item) => item.id === value.id))); setUnit(value); setReturnToExercise(false); setDirty(false); setMessage(''); }} />}
      {tab === 'Exercices' && <Exercises baseProgram={baseProgram} program={program} data={data} activeWeek={service.activeWeek} onChange={onChange}
        onConstruct={(value) => { setDraftKey(draftIdentity(`unit:${value.type}`, value.id, true)); setUnit(value); setReturnToExercise(true); setDirty(false); setMessage(''); }}
        onEdit={(activity, target) => { setDraftKey(draftIdentity('exercise', activity.id, parentActivities(program).some((item) => item.id === activity.id))); setEditing({ activity, target }); setDirty(false); setMessage(''); }} />}
      {tab === 'Test audio' && <AudioTest service={service} />}
      {tab === 'Réglages' && <section aria-label="Réglages parents"><h2>Réglages</h2>
        <section className="parent-card"><h3>Mode de jeu</h3>
          <label className="parent-scope-choice"><input type="radio" name="game-mode" checked={(data.gameMode ?? DEFAULT_GAME_MODE) === 'individual'}
            onChange={() => onChange({ ...data, gameMode: 'individual' })} />Cibles individuelles</label>
          <label className="parent-scope-choice"><input type="radio" name="game-mode" checked={data.gameMode === 'chain'}
            onChange={() => onChange({ ...data, gameMode: 'chain' })} />Chaîne de cibles</label>
          <fieldset><legend>Nombre de questions par partie</legend>
            {([3, 6, 9] as const).map((count) => <label className="parent-scope-choice" key={count}>
              <input type="radio" name="question-count" checked={(data.questionCount ?? DEFAULT_QUESTION_COUNT) === count}
                onChange={() => onChange({ ...data, questionCount: count })} />{count}</label>)}
          </fieldset>
          {data.gameMode === 'chain' && <fieldset><legend>Nombre de cibles par chaîne</legend>
            {([2, 3] as const).map((length) => <label className="parent-scope-choice" key={length}>
              <input type="radio" name="chain-length" checked={(data.chainLength ?? DEFAULT_CHAIN_LENGTH) === length}
                onChange={() => onChange({ ...data, chainLength: length })} />{length}</label>)}
          </fieldset>}
        </section>
        <section className="parent-card"><h3>Semaine active</h3><div className="parent-tokens">
          {program.weeks.map((week) => <button key={week.number} aria-label={`Semaine ${week.number}`} aria-pressed={service.activeWeek === week.number}
            onClick={() => { onChange({ ...data, activeWeek: week.number }); setMessage(`Semaine ${week.number} sélectionnée pour les prochaines parties.`); }}>{week.number}</button>)}
        </div><p>Le contenu du jeu est cumulatif. Aucun contenu futur ne sera proposé comme réponse.</p></section>
        <section className="parent-card"><h3>Exercices à pratiquer</h3>
          <p>Ce réglage choisit les exercices proposés pendant une partie. Le contenu appris des semaines précédentes reste disponible.</p>
          <label className="parent-scope-choice"><input type="radio" name="exercise-scope" checked={service.exerciseScope.mode === 'all'}
            onChange={() => onChange({ ...data, exerciseScope: { mode: 'all', selectedWeeks: service.exerciseScope.selectedWeeks } })} />Révision complète</label>
          <label className="parent-scope-choice"><input type="radio" name="exercise-scope" checked={service.exerciseScope.mode === 'selected-weeks'}
            onChange={() => onChange({ ...data, exerciseScope: { mode: 'selected-weeks', selectedWeeks: service.exerciseScope.selectedWeeks.length ? service.exerciseScope.selectedWeeks : [service.activeWeek] } })} />Semaines sélectionnées</label>
          {service.exerciseScope.mode === 'selected-weeks' && <div className="parent-checks">{program.weeks.map((week) => <label key={week.number}>
            <input type="checkbox" checked={service.exerciseScope.selectedWeeks.includes(week.number)}
              onChange={(event) => onChange({ ...data, exerciseScope: { mode: 'selected-weeks', selectedWeeks: event.target.checked
                ? [...service.exerciseScope.selectedWeeks, week.number] : service.exerciseScope.selectedWeeks.filter((item) => item !== week.number) } })} />
            Semaine {week.number}{week.number > service.activeWeek ? ' — contenu pas encore disponible' : ''}</label>)}</div>}
          {service.exerciseScope.mode === 'selected-weeks' && !service.exerciseScope.selectedWeeks.some((week) => week <= service.activeWeek && program.weeks.some((item) => item.number === week))
            && <p role="status">Aucune semaine apprise sélectionnée : aucune partie ne sera proposée.</p>}
        </section>
        <section className="parent-card"><h3>Vitesse de lecture</h3><div className="parent-tokens">
          {(Object.keys(READING_SPEEDS) as ReadingSpeed[]).map((speed) => <button key={speed} aria-pressed={(data.readingSpeed ?? DEFAULT_READING_SPEED) === speed}
            onClick={() => { gameAudio.setReadingSpeed(speed); onChange({ ...data, readingSpeed: speed }); }}>{READING_SPEEDS[speed].label}</button>)}
          <button onClick={() => { gameAudio.unlock(); const example = service.getAvailableWords()[0]; if (example) void gameAudio.playWord(example.audioText, example.audioAsset ?? undefined); }}>Écouter un exemple</button>
        </div></section>
        <section className="parent-card"><h3>Progression enfant</h3>
          <p>Efface les aventures terminées, l’œuf en cours et les animaux de la Collection. Vos contenus et réglages Parent sont conservés.</p>
          <button onClick={() => {
            if (window.confirm('Réinitialiser la progression enfant ? Les aventures terminées, l’œuf et les récompenses en cours ainsi que tous les animaux de la Collection seront effacés. Le prénom et le personnage reprendront leurs valeurs initiales. Le programme éducatif, les contenus, exercices, personnalisations et réglages Parent seront conservés.')) {
              setMessage(onResetProgress() ? 'Progression enfant réinitialisée. Les contenus et réglages Parent sont conservés.'
                : 'Réinitialisation impossible : la sauvegarde locale est indisponible. La progression est conservée.');
            }
          }}>Réinitialiser la progression</button>
        </section>
        <section className="parent-card"><h3>Revenir au programme initial</h3>
          <p>Supprime vos semaines, contenus, exercices et réglages personnalisés. Les aventures terminées de {playerName} seront conservées.</p>
          <button onClick={() => {
            if (window.confirm('Réinitialiser toutes les personnalisations Parent ? La progression enfant sera conservée.')) {
              onChange(emptyParentData()); setMessage('Programme initial restauré. La progression enfant est conservée.');
            }
          }}>Réinitialiser les personnalisations</button>
        </section>
      </section>}
    </>}
  </main>;
}
