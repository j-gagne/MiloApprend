import { useEffect, useRef, useState } from 'react';
import type { GeneratedMathExercise } from '../content/math-model';
import type { CharacterId } from '../game/characters';
import { completeTarget, createSessionProgress, incorrectAttempt, nextTarget, type SessionProgress as Progress } from '../game/session-progress';
import { emptyMathBoard, mathBoardCorrect, mathTiles, placeMathTile } from '../game/math-board';
import { gameAudio } from '../services/audio';
import { AnswerTile } from './AnswerTile';
import { SessionProgress } from './SessionProgress';
import './mathematics.css';

export function Mathematics({ exercises, characterId, onComplete }: {
  exercises: readonly GeneratedMathExercise[]; characterId: CharacterId; onComplete: (progress: Progress) => void;
}) {
  const [index, setIndex] = useState(0);
  const exercise = exercises[index];
  const [board, setBoard] = useState(() => emptyMathBoard(exercise));
  const current = useRef(board);
  const [progress, setProgress] = useState(() => createSessionProgress(exercises.length));
  const performance = useRef(progress);
  const [selected, setSelected] = useState<number>();
  const [hover, setHover] = useState<number>();
  const [message, setMessage] = useState('');
  const [canContinue, setCanContinue] = useState(false);
  const locked = useRef(false);
  const targets = useRef(new Map<number, HTMLDivElement>());
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => () => gameAudio.stop(), []);
  const solved = progress.currentTargetCompleted;
  useEffect(() => {
    setCanContinue(false);
    if (!solved) return;
    const timer = window.setTimeout(() => setCanContinue(true), 900);
    return () => window.clearTimeout(timer);
  }, [solved, index]);
  function place(value: number, destination: number) {
    if (locked.current) return;
    const next = placeMathTile(exercise, current.current, value, destination);
    current.current = next; setBoard(next); setSelected(undefined); setMessage('');
    if (next.some(value => value === null)) return;
    if (mathBoardCorrect(exercise, next)) {
      locked.current = true; performance.current = completeTarget(performance.current);
      gameAudio.stop(); gameAudio.success(); setMessage('Bravo !');
    } else { performance.current = incorrectAttempt(performance.current); setMessage('Essaie encore, tu peux déplacer les nombres.'); }
    setProgress(performance.current);
  }
  function findTarget(x: number, y: number) {
    return [...targets.current].find(([, element]) => {
      const rect = element.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    })?.[0];
  }
  function tile(value: number, slot?: number) {
    return <AnswerTile key={value} text={String(value)} disabled={solved} retry={0} gestureKey={exercise.id}
      className={`answer-tile math-tile${selected === value ? ' math-selected' : ''}`}
      label={slot === undefined ? `Choisir ${value}` : `Case ${slot + 1}, ${value}`}
      findTarget={findTarget} onHover={setHover} onAnswer={(_, destination) => { if (destination !== undefined) place(value, destination); }}
      onTap={() => { if (slot !== undefined && selected !== undefined) place(selected, slot); else setSelected(value); }} />;
  }
  function slot(position: number) {
    return <div key={`slot-${position}`} className={`math-slot${hover === position ? ' math-hover' : ''}`}
      ref={element => { if (element) targets.current.set(position, element); else targets.current.delete(position); }}>
      {board[position] === null ? <button className="word-slot" disabled={solved} aria-label={`Case ${position + 1}`} onClick={() => { if (selected !== undefined) place(selected, position); }}>?</button> : tile(board[position]!, position)}
    </div>;
  }
  return <main className="game-screen math-screen" aria-label="Mathématiques" onContextMenu={event => event.preventDefault()}
    onPointerDownCapture={() => gameAudio.unlock()} onKeyDownCapture={() => gameAudio.unlock()}>
    <SessionProgress progress={progress} characterId={characterId} />
    <h1 ref={heading} tabIndex={-1}>{exercise.type === 'ORDER_NUMBERS' ? 'Je range' : exercise.type === 'MISSING_NUMBER' ? 'Nombre manquant' : "J’écoute"}</h1>
    <p className="instruction">{exercise.type === 'ORDER_NUMBERS' ? 'Du plus petit au plus grand.' : 'Trouve le bon nombre.'}</p>
    <section className={`challenge-card math-card${exercise.type === 'HEAR_NUMBER' ? ' math-card-audio' : ''}`} aria-label={`Exercice ${index + 1}`}>
      {exercise.type === 'HEAR_NUMBER' && <button className="listen-button" aria-label="ÉCOUTER ENCORE" onClick={() => { gameAudio.unlock(); void gameAudio.playWord(exercise.prompt.text); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8q4 4 0 8M18 5q7 7 0 14" /></svg>
      </button>}
      <div className="math-row">{exercise.type === 'MISSING_NUMBER'
        ? exercise.sequence.map((value, i) => value === null ? slot(0) : <span className="math-fixed" key={i}>{value}</span>)
        : board.map((_, i) => slot(i))}</div>
      <div className="math-row math-bank" aria-label="Nombres à choisir">{mathTiles(exercise).filter(value => !board.includes(value)).map(value => tile(value))}</div>
    </section>
    <p className="math-message" role="status">{message || 'Glisse un nombre, ou touche un nombre puis sa case.'}</p>
    {exercise.type === 'HEAR_NUMBER' && !solved && <small>Pas de son ? Touche 🔊 ou active le son en haut.</small>}
    {solved && <button className="primary-button continue-button" disabled={!canContinue} onClick={() => {
      gameAudio.stop();
      if (index === exercises.length - 1) { onComplete(performance.current); return; }
      const next = exercises[index + 1];
      current.current = emptyMathBoard(next); setBoard(current.current); setSelected(undefined); setMessage('');
      performance.current = nextTarget(performance.current); setProgress(performance.current); locked.current = false; setIndex(index + 1);
      if (next.type === 'HEAR_NUMBER') { gameAudio.unlock(); void gameAudio.playWord(next.prompt.text); }
    }}>CONTINUER</button>}
  </main>;
}
