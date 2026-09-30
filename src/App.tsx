import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CompleteWord } from './components/CompleteWord';
import { Character } from './components/Character';
import { CharacterPicker } from './components/CharacterPicker';
import { Collection } from './components/Collection';
import { CharacterRewardScreen } from './components/CharacterRewardReveal';
import { eggVisualStage, emptyEggRewards } from './game/egg-rewards';
import { getCharacter, type CharacterId } from './game/characters';
import { themeVariables } from './game/themes';
import { gameAudio } from './services/audio';
import { progressStore, DEFAULT_PLAYER_NAME } from './services/progress';
import { SessionProgress } from './components/SessionProgress';
import { createSessionProgress } from './game/session-progress';
import type { SessionProgress as Progress } from './game/session-progress';
import { createPlaySession } from './game/play-session';
import { DEFAULT_QUESTION_COUNT } from './game/play-settings';
import { getCompleteWordChallenges } from './game/complete-word-content';
import { createContentRepository } from './content/repository';
import { createContentService } from './content/service';
import { initialProgram } from './content/program';
import type { LearningProgram } from './content/model';
import { activeWeek } from './content/settings';
import { parentStore } from './services/parent-store';
import { effectiveProgram, effectiveWeek } from './parent/model';
import { ParentGate } from './components/parent/ParentGate';
import { ParentSpace } from './components/parent/ParentSpace';
import { parentDrafts } from './services/parent-drafts';
import './components/parent/parent.css';

export function App({ baseProgram = initialProgram }: { baseProgram?: LearningProgram }) {
  const [progress, setProgress] = useState(() => progressStore.load());
  const [screen, setScreen] = useState<'home' | 'game' | 'celebration' | 'egg' | 'gate' | 'parent' | 'characters' | 'collection'>(() => progress.eggRewards?.pendingTransition ? 'egg' : parentDrafts.navigation().active ? 'parent' : 'home');
  useEffect(() => {
    parentDrafts.navigate({ ...parentDrafts.navigation(), active: screen === 'parent' });
  }, [screen]);
  const [parent, setParent] = useState(() => parentStore.load());
  const service = useMemo(() => createContentService(createContentRepository(effectiveProgram(baseProgram, parent.data)),
    effectiveWeek(baseProgram, parent.data, activeWeek), parent.data.exerciseScope), [baseProgram, parent.data]);
  const availableCount = useMemo(() => Math.min(parent.data.questionCount ?? DEFAULT_QUESTION_COUNT,
    new Set(getCompleteWordChallenges(service).challenges.filter((challenge) => service.exerciseScope.mode === 'all'
      || service.exerciseScope.selectedWeeks.includes(challenge.introducedInWeek)).map((challenge) => challenge.word)).size), [service, parent.data.questionCount]);
  const character = getCharacter(progress.selectedCharacterId);
  const canChooseCharacter = (progress.eggRewards?.currentEgg.progress ?? 0) === 0;
  const [previewCharacter, setPreviewCharacter] = useState<CharacterId>();
  const themeCharacter = screen === 'characters' && previewCharacter ? getCharacter(previewCharacter) : character;
  useLayoutEffect(() => {
    const root = document.documentElement;
    const variables = themeVariables(themeCharacter.theme);
    root.dataset.theme = themeCharacter.id;
    for (const [key, value] of Object.entries(variables)) root.style.setProperty(key, value);
    return () => { for (const key of Object.keys(variables)) root.style.removeProperty(key); delete root.dataset.theme; };
  }, [themeCharacter]);
  const playerName = progress.playerName ?? DEFAULT_PLAYER_NAME;
  const [characterSaved, setCharacterSaved] = useState(true);
  const characterButton = useRef<HTMLButtonElement>(null);
  const returnToCharacterButton = useRef(false);
  const [sound, setSound] = useState(true);
  const [saved, setSaved] = useState(true);
  const [session, setSession] = useState(() => createPlaySession(service, parent.data));
  const [result, setResult] = useState(() => createSessionProgress(0));
  const title = useRef<HTMLHeadingElement>(null);
  const completed = useRef(false);
  const sessionId = useRef('');
  const parentDirty = useRef(false);

  useEffect(() => {
    if (screen === 'home' && returnToCharacterButton.current) {
      returnToCharacterButton.current = false; characterButton.current?.focus();
    } else title.current?.focus();
  }, [screen]);
  useEffect(() => { gameAudio.setReadingSpeed(parent.data.readingSpeed); }, [parent.data.readingSpeed]);
  useEffect(() => () => gameAudio.stop(), []);

  const finish = useCallback((performance: Progress) => {
    if (completed.current) return;
    completed.current = true;
    const completion = progressStore.completeSession(sessionId.current);
    setSaved(completion.saved);
    setProgress(completion.progress);
    setResult(performance);
    setScreen('celebration');
  }, []);

  function showEgg() {
    if (!saved) {
      const completion = progressStore.completeSession(sessionId.current);
      setSaved(completion.saved); setProgress(completion.progress);
      if (!completion.saved) return;
    }
    gameAudio.stop(); setScreen('egg');
  }

  function continueFromEgg() {
    const pending = progress.eggRewards?.pendingTransition;
    if (!pending) return;
    const acknowledgement = progressStore.acknowledgeEgg(pending.sessionId);
    setSaved(acknowledgement.saved);
    if (!acknowledgement.saved) return;
    setProgress(acknowledgement.progress); setScreen('home');
  }

  function closeCharacters() { setPreviewCharacter(undefined); returnToCharacterButton.current = true; setScreen('home'); }
  function resetProgress() {
    const reset = progressStore.reset();
    if (!reset.saved) return false;
    setProgress(reset.progress); setSaved(true); setCharacterSaved(true);
    setResult(createSessionProgress(0)); completed.current = false; sessionId.current = '';
    return true;
  }
  function selectCharacter(selectedCharacterId: CharacterId, playerName: string) {
    const stored = progressStore.load();
    if (!canChooseCharacter || (stored.eggRewards?.currentEgg.progress ?? 0) !== 0) {
      setProgress(stored); closeCharacters(); return;
    }
    const eggRewards = progress.eggRewards ?? emptyEggRewards(selectedCharacterId);
    const next = { ...progress, selectedCharacterId, playerName,
      eggRewards: { ...eggRewards, currentEgg: { ...eggRewards.currentEgg, pendingAnimalId: selectedCharacterId } } };
    setCharacterSaved(progressStore.save(next)); setProgress(next); closeCharacters();
    void gameAudio.speakCharacter(`Salut ${next.playerName} !`, next.selectedCharacterId);
  }

  function start() {
    const stored = progressStore.load();
    if (stored.eggRewards?.pendingTransition) { setProgress(stored); setScreen('egg'); return; }
    const nextSession = createPlaySession(service, parent.data);
    if (!nextSession.challenges.length) return;
    completed.current = false;
    // getRandomValues also works on local-network HTTP (unlike randomUUID).
    sessionId.current = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
    gameAudio.unlock();
    // Monter le défi avant de parler, tout en restant dans le geste JOUER/REJOUER
    // pour iOS. Le cycle de vérification StrictMode précède ainsi cette lecture.
    flushSync(() => { setSession(nextSession); setScreen('game'); });
    const first = nextSession.challenges[0];
    void gameAudio.playAutomatic(`${sessionId.current}:0:${first.id}`, first.audioText ?? first.word, first.audioSrc, first.firstSegmentAudio,
      first.activityType !== 'spell' && first.targetType === 'word' && first.slots.length === 1 ? first.slots[0].segmentIndex : undefined);
  }

  const pending = progress.eggRewards?.pendingTransition;
  if (screen === 'egg' && pending) return <CharacterRewardScreen
    stage={eggVisualStage(pending.progress, pending.sessionsToHatch)} progress={pending.progress} total={pending.sessionsToHatch}
    animalId={pending.animalId} onContinue={continueFromEgg}
    notice={!saved && <p className="save-note" role="status">La sauvegarde est indisponible. Ta surprise reste en attente. Réessaie CONTINUER.</p>} />;

  return <div className="app-shell">
    <div className="landscape" aria-hidden="true"><div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="plant plant-left">✦</div><div className="plant plant-right">✦</div></div>
    <header className="topbar">
      <button className="brand" aria-label="Milo apprend, accueil" onClick={() => {
        if (screen === 'parent' && parentDirty.current && !window.confirm('Quitter cet éditeur sans enregistrer les modifications ?')) return;
        parentDirty.current = false; gameAudio.stop();
        if (screen === 'celebration') { showEgg(); return; }
        setScreen('home');
      }}><span className="brand-icon" aria-hidden="true">m.</span><span>milo <b>apprend</b></span></button>
      <button className="sound-button" aria-label={sound ? 'Couper le son' : 'Activer le son'} aria-pressed={sound} onClick={() => { gameAudio.setEnabled(!sound); if (!sound) gameAudio.unlock(); setSound(!sound); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{sound ? <><path d="M15 8q4 4 0 8M18 5q7 7 0 14" /></> : <path d="m16 9 6 6m0-6-6 6" />}</svg>
      </button>
    </header>

    {screen === 'home' && <main className="home-screen">
      <span className="eyebrow"><span aria-hidden="true">✦</span> UNE PETITE AVENTURE DE LECTURE</span>
      <h1 ref={title} tabIndex={-1}>Milo <span>apprend</span><span className="title-dot">.</span></h1>
      <p className="home-subtitle">De petits mots, de grandes découvertes !</p>
      <div className="hero-scene"><span className="hello-bubble">Salut {playerName} ! <span aria-hidden="true">✦</span></span><Character id={character.id} /><span className="scene-stone stone-one" /><span className="scene-stone stone-two" /></div>
      {canChooseCharacter && <button ref={characterButton} className="character-picker-button" onClick={() => { gameAudio.stop(); setPreviewCharacter(character.id); setScreen('characters'); }}>CHOISIR MON PERSONNAGE</button>}
      {!characterSaved && <p className="save-note" role="status">Ton prénom et ton personnage restent choisis ici. La sauvegarde est indisponible.</p>}
      <button className="primary-button play-button" onClick={start} disabled={!availableCount}><span aria-hidden="true">▶</span> JOUER</button>
      {!availableCount && <p role="status">Aucun défi disponible pour le contenu autorisé.</p>}
      <p className="adventure-note">{availableCount} petits défis avec ton ami</p>
      <button className="collection-button" onClick={() => { gameAudio.stop(); setScreen('collection'); }}>MA COLLECTION</button>
      <div className="progress-pill"><span aria-hidden="true">●</span> {progress.completedSessions === 0 ? 'Ta première aventure t’attend !' : `${progress.completedSessions} aventure${progress.completedSessions > 1 ? 's' : ''} terminée${progress.completedSessions > 1 ? 's' : ''}`}</div>
      <button className="text-button parents-link" onClick={() => { gameAudio.stop(); setScreen('gate'); }}>Parents</button>
    </main>}

    {screen === 'collection' && <Collection hatches={progress.eggRewards?.hatches ?? []} onHome={() => setScreen('home')} />}
    {screen === 'characters' && canChooseCharacter && <CharacterPicker playerName={playerName} selected={character.id} onPreview={setPreviewCharacter} onSelect={selectCharacter} onClose={closeCharacters} />}
    {screen === 'game' && <CompleteWord audioSessionId={sessionId.current} playerName={playerName} onComplete={finish} sound={sound} challenges={session.challenges} chains={session.chains} characterId={character.id} />}
    {screen === 'gate' && <ParentGate onOpen={() => setScreen('parent')} onCancel={() => setScreen('home')} />}
    {screen === 'parent' && <ParentSpace baseProgram={baseProgram} playerName={playerName} data={parent.data} service={service} warning={parent.warning}
      onResetProgress={resetProgress}
      onDirtyChange={(dirty) => { parentDirty.current = dirty; }}
      onExit={() => { parentDirty.current = false; setScreen('home'); }} onChange={(data) => {
        const saved = parentStore.save(data);
        setParent({ data, warning: saved ? undefined : 'Sauvegarde locale indisponible. Ces changements sont actifs seulement jusqu’à la fermeture ou au rechargement de cette page.' });
        return saved;
      }} />}

    {screen === 'celebration' && <main className="celebration-screen">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${4 + i * 3.9}%`, animationDelay: `${i * 0.08}s`, background: ['#e4b454', '#81a879', '#de9984'][i % 3] }} />)}</div>
      <h1 ref={title} tabIndex={-1}>Bravo {playerName} !</h1>
      <p>{result.completedTargets} exercices terminés</p>
      <SessionProgress progress={result} characterId={character.id} />
      <Character id={character.id} happy />
      <button className="primary-button" onClick={showEgg}>{saved ? 'DÉCOUVRE TA SURPRISE' : 'RÉESSAYER LA SAUVEGARDE'}</button>
      {!saved && <p className="save-note" role="status">La partie est terminée. La sauvegarde est indisponible. Garde cette page ouverte pour réessayer.</p>}
    </main>}
    <footer>Un petit pas à la fois <span aria-hidden="true">✦</span></footer>
  </div>;
}
