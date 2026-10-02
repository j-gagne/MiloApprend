import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createReadingState, moveReadingSlider, readingExerciseComplete, readingSessionComplete, type ReadingExercise } from '../game/reading-session';
import { gameAudio } from '../services/audio';
import { PronunciationSlider } from './PronunciationSlider';
import './reading.css';

export function Reading({ exercises, ready, saveFailed, onRetry, onReward, onHome }: {
  exercises: readonly ReadingExercise[]; ready: boolean; saveFailed: boolean;
  onRetry: () => void; onReward: () => void; onHome: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState(() => createReadingState(exercises));
  const current = useRef(state);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => () => gameAudio.stop(), []);
  const complete = readingSessionComplete(state);
  function move(segment: number, value: number) {
    if (!ready) return;
    gameAudio.unlock();
    const before = current.current;
    const next = moveReadingSlider(before, index, segment, value);
    current.current = next; setState(next);
    if (!readingExerciseComplete(before, index) && readingExerciseComplete(next, index)) gameAudio.success();
  }
  return <main className="game-screen reading-screen" aria-label="Je lis" onPointerDownCapture={() => gameAudio.unlock()} onKeyDownCapture={() => gameAudio.unlock()}>
    <ol className="reading-progress" aria-label="Progression de lecture">
      {exercises.map((exercise, i) => <li key={exercise.id} className={`reading-dot${readingExerciseComplete(state, i) ? ' done' : ''}`}
        aria-current={i === index ? 'step' : undefined} aria-label={`Exercice ${i + 1} : ${readingExerciseComplete(state, i) ? 'terminé' : 'à faire'}`} />)}
    </ol>
    <h1 ref={heading} tabIndex={-1}>Je lis</h1>
    <p className="instruction">Dis le son en glissant.</p>
    {!exercises.length ? <><p role="status">Pas de lecture pour le moment.</p><button className="primary-button" onClick={onHome}>RETOUR À L’ACCUEIL</button></> : <div className="reading-layout">
      <section className="reading-units" aria-label={`Exercice ${index + 1}`}>
        {exercises[index].displayedUnits.map((unit, unitIndex, units) => {
          const offset = units.slice(0, unitIndex).reduce((sum, previous) => sum + previous.segments.length, 0);
          return <div className="reading-unit" role="group" aria-label={unit.display} key={`${exercises[index].id}:${unitIndex}`}>
            <span className="reading-text">{unit.display}</span>
            <div className="reading-unit-sliders">
              {unit.segments.map((segment, i) => <div className="reading-segment" key={i}
                style={{ '--reading-gesture-length': Array.from(segment.text).length } as CSSProperties}>
                <span className="reading-segment-size" aria-hidden="true">{segment.text}</span>
                <PronunciationSlider label={`Prononcer ${segment.text}, morceau ${offset + i + 1}`} value={state.values[index][offset + i]} disabled={!ready}
                  onChange={value => move(offset + i, value)} />
              </div>)}
            </div>
          </div>;
        })}
      </section>
      <nav className="reading-navigation" aria-label="Exercices de lecture">
        <button aria-label="Exercice précédent" disabled={index === 0} onClick={() => setIndex(index - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg></button>
        <button aria-label="Exercice suivant" disabled={index === exercises.length - 1} onClick={() => setIndex(index + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5 7 7-7 7" /></svg></button>
      </nav>
    </div>}
    {!ready && exercises.length > 0 && <><p className="save-note" role="status">La sauvegarde est indisponible. Réessaie pour commencer.</p>
      <button className="primary-button" onClick={onRetry}>RÉESSAYER</button></>}
    {complete && ready && <button className="primary-button reading-reward" onClick={onReward}>{saveFailed ? 'RÉESSAYER LA SAUVEGARDE' : 'DÉCOUVRE TA SURPRISE'}</button>}
    {complete && saveFailed && <p className="save-note" role="status">La partie est terminée. Garde cette page ouverte pour réessayer.</p>}
  </main>;
}
