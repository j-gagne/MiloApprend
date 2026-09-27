import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CompleteWord } from './components/CompleteWord';
import { Dinosaur } from './components/Dinosaur';
import { gameAudio } from './services/audio';
import { progressStore } from './services/progress';
import { SessionProgress } from './components/SessionProgress';
import { createSessionProgress } from './game/session-progress';
import type { SessionProgress as Progress } from './game/session-progress';
import { createPlaySession } from './game/play-session';
import { DEFAULT_QUESTION_COUNT } from './game/play-settings';
import { getCompleteWordChallenges } from './game/complete-word-content';
import { createContentRepository } from './content/repository';
import { createContentService } from './content/service';
import { initialProgram } from './content/program';
import { activeWeek } from './content/settings';
import { parentStore } from './services/parent-store';
import { effectiveProgram, effectiveWeek } from './parent/model';
import { ParentGate } from './components/parent/ParentGate';
import { ParentSpace } from './components/parent/ParentSpace';
import './components/parent/parent.css';

export function App() {
  const [screen, setScreen] = useState<'home' | 'game' | 'celebration' | 'gate' | 'parent'>('home');
  const [parent, setParent] = useState(() => parentStore.load());
  const service = useMemo(() => createContentService(createContentRepository(effectiveProgram(initialProgram, parent.data)),
    effectiveWeek(initialProgram, parent.data, activeWeek), parent.data.exerciseScope), [parent.data]);
  const availableCount = useMemo(() => Math.min(parent.data.questionCount ?? DEFAULT_QUESTION_COUNT,
    new Set(getCompleteWordChallenges(service).challenges.filter((challenge) => service.exerciseScope.mode === 'all'
      || service.exerciseScope.selectedWeeks.includes(challenge.introducedInWeek)).map((challenge) => challenge.word)).size), [service, parent.data.questionCount]);
  const [progress, setProgress] = useState(() => progressStore.load());
  const [sound, setSound] = useState(true);
  const [saved, setSaved] = useState(true);
  const [session, setSession] = useState(() => createPlaySession(service, parent.data));
  const [result, setResult] = useState(() => createSessionProgress(0));
  const title = useRef<HTMLHeadingElement>(null);
  const completed = useRef(false);
  const parentDirty = useRef(false);

  useEffect(() => { title.current?.focus(); }, [screen]);
  useEffect(() => { gameAudio.setReadingSpeed(parent.data.readingSpeed); }, [parent.data.readingSpeed]);
  useEffect(() => () => gameAudio.stop(), []);

  const finish = useCallback((performance: Progress) => {
    if (completed.current) return;
    completed.current = true;
    const next = { completedSessions: progress.completedSessions + 1 };
    setSaved(progressStore.save(next));
    setProgress(next);
    setResult(performance);
    setScreen('celebration');
  }, [progress.completedSessions]);

  function start() {
    const nextSession = createPlaySession(service, parent.data);
    if (!nextSession.challenges.length) return;
    completed.current = false;
    gameAudio.unlock();
    // Monter le défi avant de parler, tout en restant dans le geste JOUER/REJOUER
    // pour iOS. Le cycle de vérification StrictMode précède ainsi cette lecture.
    flushSync(() => { setSession(nextSession); setScreen('game'); });
    const first = nextSession.challenges[0];
    void gameAudio.playWord(first.audioText ?? first.word, first.audioSrc);
  }

  return <div className="app-shell">
    <div className="landscape" aria-hidden="true"><div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="plant plant-left">✦</div><div className="plant plant-right">✦</div></div>
    <header className="topbar">
      <button className="brand" aria-label="Milo apprend, accueil" onClick={() => {
        if (screen === 'parent' && parentDirty.current && !window.confirm('Quitter cet éditeur sans enregistrer les modifications ?')) return;
        parentDirty.current = false; gameAudio.stop(); setScreen('home');
      }}><span className="brand-icon" aria-hidden="true">m.</span><span>milo <b>apprend</b></span></button>
      <button className="sound-button" aria-label={sound ? 'Couper le son' : 'Activer le son'} aria-pressed={sound} onClick={() => { gameAudio.setEnabled(!sound); if (!sound) gameAudio.unlock(); setSound(!sound); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{sound ? <><path d="M15 8q4 4 0 8M18 5q7 7 0 14" /></> : <path d="m16 9 6 6m0-6-6 6" />}</svg>
      </button>
    </header>

    {screen === 'home' && <main className="home-screen">
      <span className="eyebrow"><span aria-hidden="true">✦</span> UNE PETITE AVENTURE DE LECTURE</span>
      <h1 ref={title} tabIndex={-1}>Milo <span>apprend</span><span className="title-dot">.</span></h1>
      <p className="home-subtitle">De petits mots, de grandes découvertes !</p>
      <div className="hero-scene"><span className="hello-bubble">Salut Milo ! <span aria-hidden="true">✦</span></span><Dinosaur /><span className="scene-stone stone-one" /><span className="scene-stone stone-two" /></div>
      <button className="primary-button play-button" onClick={start} disabled={!availableCount}><span aria-hidden="true">▶</span> JOUER</button>
      {!availableCount && <p role="status">Aucun défi disponible pour le contenu autorisé.</p>}
      <p className="adventure-note">{availableCount} petits défis avec ton ami dino</p>
      <div className="progress-pill"><span aria-hidden="true">●</span> {progress.completedSessions === 0 ? 'Ta première aventure t’attend !' : `${progress.completedSessions} aventure${progress.completedSessions > 1 ? 's' : ''} terminée${progress.completedSessions > 1 ? 's' : ''}`}</div>
      <button className="text-button parents-link" onClick={() => { gameAudio.stop(); setScreen('gate'); }}>Parents</button>
    </main>}

    {screen === 'game' && <CompleteWord onComplete={finish} sound={sound} challenges={session.challenges} chains={session.chains} />}
    {screen === 'gate' && <ParentGate onOpen={() => setScreen('parent')} onCancel={() => setScreen('home')} />}
    {screen === 'parent' && <ParentSpace data={parent.data} service={service} warning={parent.warning}
      onDirtyChange={(dirty) => { parentDirty.current = dirty; }}
      onExit={() => { parentDirty.current = false; setScreen('home'); }} onChange={(data) => {
        const saved = parentStore.save(data);
        setParent({ data, warning: saved ? undefined : 'Sauvegarde locale indisponible. Ces changements sont actifs seulement jusqu’à la fermeture ou au rechargement de cette page.' });
        return saved;
      }} />}

    {screen === 'celebration' && <main className="celebration-screen">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${4 + i * 3.9}%`, animationDelay: `${i * 0.08}s`, background: ['#e4b454', '#81a879', '#de9984'][i % 3] }} />)}</div>
      <h1 ref={title} tabIndex={-1}>Bravo Milo !</h1>
      <p>{result.completedTargets} exercices terminés</p>
      <SessionProgress progress={result} />
      <Dinosaur happy />
      <button className="primary-button" onClick={start}><span aria-hidden="true">↻</span> REJOUER</button>
      <button className="text-button" onClick={() => setScreen('home')}>Retour à l’accueil</button>
      {!saved && <p className="save-note" role="status">La partie est terminée. La sauvegarde est indisponible.</p>}
    </main>}
    <footer>Un petit pas à la fois <span aria-hidden="true">✦</span></footer>
  </div>;
}
