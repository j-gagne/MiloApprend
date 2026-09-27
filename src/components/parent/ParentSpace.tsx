import { useEffect, useMemo, useState } from 'react';
import type { CompletionActivity, LearningUnit, Sentence, Word } from '../../content/model';
import type { ContentService } from '../../content/service';
import { getCompleteWordChallenges } from '../../game/complete-word-content';
import type { ParentData } from '../../parent/model';
import { emptyParentData, saveActivity, saveParentUnit, newParentId } from '../../parent/model';
import { primaryConstruction } from '../../content/construction';
import { ActivityEditor } from './ActivityEditor';
import { UnitEditor } from './UnitEditor';
import { Programme } from './Programme';
import { Exercises } from './Exercises';

interface Props { data: ParentData; service: ContentService; warning?: string; onChange: (data: ParentData) => boolean;
  onExit: () => void; onDirtyChange: (dirty: boolean) => void }
const tabs = ['Aperçu', 'Programme', 'Exercices', 'Réglages'] as const;
type Tab = typeof tabs[number];
interface Editing { activity: CompletionActivity; target: Word | Sentence }

export function ParentSpace({ data, service, warning, onChange, onExit, onDirtyChange }: Props) {
  const [tab, setTab] = useState<Tab>('Aperçu');
  const [editing, setEditing] = useState<Editing>();
  const [unit, setUnit] = useState<LearningUnit>();
  const [returnToExercise, setReturnToExercise] = useState(false);
  const [dirty, setDirtyState] = useState(false);
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
  function closeEditor() { if (canLeave()) { setEditing(undefined); setUnit(undefined); setDirty(false); } }
  function navigate(next: Tab) { if (canLeave()) { setEditing(undefined); setUnit(undefined); setDirty(false); setTab(next); setMessage(''); } }
  function saved(persisted: boolean) { setEditing(undefined); setUnit(undefined); setDirty(false); setMessage(persisted ? 'Modifications enregistrées.' : 'Modifications appliquées pour cette session seulement.'); }
  return <main className="parent-screen">
    <div className="parent-heading"><h1>Espace parents</h1><button onClick={() => { if (canLeave()) onExit(); }}>Retour au jeu</button></div>
    <nav className="parent-tabs" aria-label="Sections parents">{tabs.map((item) => <button key={item}
      aria-current={tab === item ? 'page' : undefined} onClick={() => navigate(item)}>{item}</button>)}</nav>
    {warning && <p className="parent-errors" role="alert">{warning}</p>}
    {message && <p role="status" className="parent-notice">{message}</p>}
    {editing ? <ActivityEditor key={editing.activity.id} program={program} {...editing} onDirty={() => setDirty(true)} onCancel={closeEditor}
      onSave={(activity) => saved(onChange(saveActivity(data, activity)))} />
      : unit ? <UnitEditor key={unit.id} program={program} unit={unit}
        constructionOnly={program.units.some((item) => item.id === unit.id) && !data.customUnits.some((item) => item.id === unit.id)}
        onDirty={() => setDirty(true)} onCancel={closeEditor}
        onSave={(value) => {
          saved(onChange(saveParentUnit(data, program, value)));
          const construction = primaryConstruction(value);
          if (returnToExercise && construction && (value.type === 'word' || value.type === 'sentence')) {
            setEditing({ target: value, activity: { id: newParentId('activity'), type: 'complete-segments', targetId: value.id,
              segmentationId: construction.id, availableFromWeek: construction.availableFromWeek ?? value.introducedInWeek,
              missingSegmentIndexes: [], distractorUnitIds: [] } });
          }
          setReturnToExercise(false);
        }} /> : <>
      {tab === 'Aperçu' && <section aria-label="Aperçu du programme"><h2>Le programme de Milo</h2>
        <p>Les disponibilités suivent la semaine choisie et vos activations.</p><dl className="parent-stats">
          {[
            ['Semaine active', service.activeWeek], ['Mots disponibles', words.length],
            ['Mots jouables', new Set(challenges.filter((item) => item.targetType !== 'sentence').map((item) => item.word)).size], ['Variantes d’exercices', challenges.length],
            ['Phrases', service.getAvailableSentences().length],
            ['Contenu de l’école (mots disponibles)', words.filter((word) => word.tags?.includes('school')).length],
            ['Contenu d’entraînement (mots disponibles)', words.filter((word) => word.tags?.includes('practice')).length],
          ].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
        </dl><p>Les modifications restent sur ce navigateur. La progression de Milo est conservée séparément.</p>
      </section>}
      {tab === 'Programme' && <Programme program={program} data={data} onChange={onChange} onEdit={(value) => { setUnit(value); setReturnToExercise(false); setDirty(false); setMessage(''); }} />}
      {tab === 'Exercices' && <Exercises program={program} data={data} activeWeek={service.activeWeek} onChange={onChange}
        onConstruct={(value) => { setUnit(value); setReturnToExercise(true); setDirty(false); setMessage(''); }}
        onEdit={(activity, target) => { setEditing({ activity, target }); setDirty(false); setMessage(''); }} />}
      {tab === 'Réglages' && <section aria-label="Réglages parents"><h2>Réglages</h2>
        <section className="parent-card"><h3>Semaine active</h3><div className="parent-tokens">
          {program.weeks.map((week) => <button key={week.number} aria-label={`Semaine ${week.number}`} aria-pressed={service.activeWeek === week.number}
            onClick={() => { onChange({ ...data, activeWeek: week.number }); setMessage(`Semaine ${week.number} sélectionnée pour les prochaines parties.`); }}>{week.number}</button>)}
        </div><p>Le contenu du jeu est cumulatif. Aucun contenu futur ne sera proposé comme réponse.</p></section>
        <section className="parent-card"><h3>Revenir au programme initial</h3>
          <p>Supprime vos semaines, contenus, exercices et réglages personnalisés. Les aventures terminées de Milo seront conservées.</p>
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
