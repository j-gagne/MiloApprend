import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentChallenge } from '../game/complete-word-content';
import { availableAnswers, createAnswerBank, placementTexts, placeOccurrence, removeOccurrence } from '../game/answer-bank';
import type { OccurrencePlacements } from '../game/answer-bank';
import { advanceChain, chainFinished, remainingChainBank } from '../game/chain';
import type { ChainState } from '../game/chain';
import { gameAudio } from '../services/audio';
import { AnswerTile } from './AnswerTile';
import { Character } from './Character';
import { DEFAULT_CHARACTER_ID, type CharacterId } from '../game/characters';
import { SessionProgress } from './SessionProgress';
import { createSessionProgress, completeTarget, incorrectAttempt, nextTarget } from '../game/session-progress';
import type { SessionProgress as Progress } from '../game/session-progress';
import { AudioDiagnostics } from './AudioDiagnostics';
import { WordImage } from './WordImage';
import { CompletionLine } from './CompletionLine';

export function CompleteWord({ onComplete, sound, challenges, chains, characterId = DEFAULT_CHARACTER_ID, playerName }: {
  onComplete: (progress: Progress) => void; sound: boolean; challenges: readonly ContentChallenge[]; chains?: readonly ChainState[];
  characterId?: CharacterId; playerName: string;
}) {
  const [chain, setChain] = useState(chains?.[0]);
  const [chainIndex, setChainIndex] = useState(0);
  const [performance, setPerformance] = useState(() => createSessionProgress(challenges.length));
  const performanceRef = useRef(performance);
  function updatePerformance(value: Progress) { performanceRef.current = value; setPerformance(value); }
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState<number>();
  const [placements, setPlacements] = useState<OccurrencePlacements>({});
  const placed = useRef<OccurrencePlacements>({});
  const [selectedSlot, setSelectedSlot] = useState<number>();
  const [replay, setReplay] = useState(0);
  const [wrongAnswer, setWrongAnswer] = useState<string>();
  const playback = useRef<Promise<void>>(Promise.resolve());
  const targets = useRef(new Map<number, HTMLDivElement>());
  const locked = useRef(false);
  const challenge = challenges[index];
  const individualBank = useMemo(() => chains ? [] : createAnswerBank(challenge), [challenge, chains]);
  const bank = useMemo(() => chain ? remainingChainBank(chain) : individualBank, [chain, individualBank]);
  const texts = placementTexts(bank, placements);
  const multiple = challenge.slots.length > 1;
  const sentence = challenge.targetType === 'sentence';
  const spelling = challenge.activityType === 'spell';
  // Les mots à trois segments gardent les mêmes blocs, ajustés à la largeur du téléphone.
  const segmentStyle = sentence ? { minWidth: 44, fontSize: 'clamp(24px, 6vw, 32px)', padding: '0 6px' } : challenge.segments.length > 2
    ? { minWidth: 0, flex: '0 1 94px', fontSize: 'clamp(26px, 7vw, 43px)', padding: '0 8px' }
    : undefined;
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => () => gameAudio.stop(), []);
  useEffect(() => {
    // Le premier mot est lancé directement depuis JOUER ; les suivants à l'affichage.
    if (index > 0) void gameAudio.playTarget(challenge.audioText ?? challenge.word, challenge.audioSrc, challenge.firstSegmentAudio);
  }, [index, challenge]);
  useEffect(() => {
    if (!solved) return;
    let cancelled = false;
    const currentPlayback = playback.current;
    let timer: number;
    const pause = new Promise<void>((resolve) => { timer = window.setTimeout(resolve, 1900); });
    void Promise.all([pause, currentPlayback]).then(() => {
      if (cancelled || playback.current !== currentPlayback) return;
      if (chain) {
        const next = advanceChain(chain, placed.current);
        if (next === chain) return;
        if (chainFinished(next) && chains?.[chainIndex + 1]) {
          setChain(chains[chainIndex + 1]); setChainIndex(chainIndex + 1);
        } else setChain(next);
      }
      gameAudio.stop();
      if (index === challenges.length - 1) onComplete(performanceRef.current);
      else { locked.current = false; setSolved(false); setAttempt(0); setWrongAnswer(undefined);
        updatePerformance(nextTarget(performanceRef.current));
        placed.current = {}; setPlacements({}); setSelectedSlot(undefined); setHover(undefined); setIndex(index + 1); }
    });
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [solved, index, onComplete, replay, challenges.length, chain, chains, chainIndex]);

  function findTarget(x: number, y: number): number | undefined {
    // La plus proche gagne si les marges tactiles de deux cases se chevauchent.
    return [...targets.current].map(([slotIndex, element]) => ({ slotIndex, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => x >= rect.left - 24 && x <= rect.right + 24 && y >= rect.top - 24 && y <= rect.bottom + 24)
      .sort((a, b) => Math.hypot(x - a.rect.left - a.rect.width / 2, y - a.rect.top - a.rect.height / 2)
        - Math.hypot(x - b.rect.left - b.rect.width / 2, y - b.rect.top - b.rect.height / 2))[0]?.slotIndex;
  }

  function remove(slotIndex: number) {
    if (locked.current) return;
    placed.current = removeOccurrence(placed.current, slotIndex);
    setPlacements(placed.current); setSelectedSlot(slotIndex);
  }

  function answer(id: string, slotIndex?: number, fromIndex?: number) {
    if (locked.current) return;
    const destination = slotIndex ?? selectedSlot ?? challenge.slots.find((slot) => !placed.current[slot.segmentIndex])?.segmentIndex;
    if (destination === undefined) return;
    gameAudio.unlock();
    const result = placeOccurrence(challenge, bank, placed.current, destination, id, fromIndex);
    if (result.accepted) {
      placed.current = result.placements;
      setPlacements(placed.current); setSelectedSlot(undefined); setWrongAnswer(undefined); setAttempt(0);
      if (result.complete) {
        locked.current = true;
        updatePerformance(completeTarget(performanceRef.current));
        setSolved(true);
        playback.current = gameAudio.playTarget(challenge.audioText ?? challenge.word, challenge.audioSrc, challenge.firstSegmentAudio);
        gameAudio.success();
      }
    } else {
      updatePerformance(incorrectAttempt(performanceRef.current));
      setWrongAnswer(id);
      setAttempt((count) => count + 1);
      void gameAudio.playTarget(challenge.audioText ?? challenge.word, challenge.audioSrc, challenge.firstSegmentAudio);
    }
  }

  return <main className={`game-screen${sentence ? ' sentence-game' : ''}${spelling ? ' spell-game' : ''}`}
    onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
    <SessionProgress progress={performance} characterId={characterId} local={chain ? { total: chain.targets.length, completed: chain.completed.length + Number(solved) } : undefined} />
    <h1 ref={heading} tabIndex={-1}>{spelling ? 'Écris le mot' : sentence ? 'Complète la phrase' : challenge.targetType === 'syllable' ? 'Retrouve la syllabe' : 'Complète le mot'}</h1>
    <p className="instruction">{spelling ? 'Glisse chaque lettre dans sa case.' : multiple ? 'Glisse chaque morceau dans sa case.' : 'Glisse le bon morceau dans la case.'}</p>
    <section className={`challenge-card ${solved ? 'is-solved' : ''}`} aria-label={`Défi ${index + 1}`}>
      <span className="card-sparkle sparkle-one" aria-hidden="true">✦</span>
      <span className="card-sparkle sparkle-two" aria-hidden="true">✦</span>
      {challenge.targetType !== 'syllable' && <WordImage key={challenge.id} image={challenge.image} />}
      {spelling && <p className="spell-model" aria-label="Mot modèle">{challenge.word}</p>}
      <CompletionLine board={challenge} sentence={sentence} label={solved ? challenge.word : sentence ? 'Phrase à compléter' : 'Mot à compléter'}
        render={(segmentIndex) => {
          const segment = challenge.segments[segmentIndex];
          if (!challenge.slots.some((slot) => slot.segmentIndex === segmentIndex)) {
            return <span className={sentence ? 'sentence-text' : 'word-segment'} style={sentence ? undefined : segmentStyle} key={segmentIndex}>{segment}</span>;
          }
          const filled = texts[segmentIndex];
          const className = `word-slot ${hover === segmentIndex ? 'over' : ''} ${filled ? 'filled' : ''} ${attempt && !solved ? 'retry' : ''}`;
          const innerStyle = segmentStyle ? { ...segmentStyle, width: '100%' } : undefined;
          return <div key={`${challenge.id}-${segmentIndex}`} style={segmentStyle}
            ref={(element) => { if (element) targets.current.set(segmentIndex, element); else targets.current.delete(segmentIndex); }}>
            {multiple && filled ? <AnswerTile text={filled} disabled={solved} retry={0} gestureKey={challenge.id}
              className={`${className} placed-tile`} style={innerStyle} label={`Retirer ${filled} de la case ${segmentIndex + 1}`}
              findTarget={findTarget} onHover={setHover} onTap={() => remove(segmentIndex)}
              onAnswer={(_, destination) => answer(placements[segmentIndex]!, destination, segmentIndex)} />
              : <div className={`${className} ${multiple && selectedSlot === segmentIndex ? 'selected-slot' : ''}`} style={innerStyle}
                role={multiple ? 'button' : undefined} tabIndex={multiple && !solved ? 0 : undefined}
                aria-label={filled ? segment : multiple ? `Case ${segmentIndex + 1} à compléter` : 'Case manquante'}
                aria-pressed={multiple ? selectedSlot === segmentIndex : undefined}
                onClick={() => { if (multiple && !locked.current) setSelectedSlot(segmentIndex); }}
                onKeyDown={(event) => { if (multiple && !locked.current && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelectedSlot(segmentIndex); } }}
              >{filled ?? '?'}</div>}
          </div>;
        }} />
      <div className="feedback" role="status" aria-live="polite" aria-atomic="true">
        {solved ? <>{performance.incorrectAttemptsForCurrentTarget === 0 && <span aria-label="Étoile gagnée">⭐</span>} Bravo ! <strong>{challenge.word}</strong></> : attempt > 0 ? 'Essaie un autre morceau !' : <span aria-hidden="true">À toi de jouer !</span>}
      </div>
      <div className={challenge.pedagogicalReading ? 'reading-actions' : undefined}>
      <button className="listen-button" disabled={!sound} aria-label={`Réécouter ${challenge.word}`} onClick={() => {
        playback.current = gameAudio.playTarget(challenge.audioText ?? challenge.word, challenge.audioSrc, challenge.firstSegmentAudio);
        setReplay((count) => count + 1);
      }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8q4 4 0 8M18 5q7 7 0 14" /></svg>{challenge.pedagogicalReading && <span>Mot</span>}</button>
      {challenge.pedagogicalReading && <button className="listen-button" disabled={!sound} aria-label={`${challenge.pedagogicalReading.mode === 'whole' ? 'Écouter lentement' : 'Découper'} ${challenge.word}`} onClick={() => {
        playback.current = gameAudio.playPedagogical(challenge.pedagogicalReading!, challenge.audioSrc);
        setReplay((count) => count + 1);
      }}><span aria-hidden="true">🐢</span> {challenge.pedagogicalReading.mode === 'whole' ? 'Lentement' : 'Découpe'}</button>}
      </div>
    </section>
    <div className={`answer-tray ${chain ? 'chain-bank ' : ''}${multiple || bank.length > 3 ? 'multiple-answers' : ''}`} aria-label="Morceaux disponibles" key={chain ? `chain-${chainIndex}` : challenge.id}>
      {availableAnswers(bank, placements).map((choice) => <AnswerTile key={choice.id} gestureKey={challenge.id} text={choice.text} retry={wrongAnswer === choice.id ? attempt : 0} disabled={solved} findTarget={findTarget} onAnswer={(_, destination) => answer(choice.id, destination)} onHover={setHover} />)}
    </div>
    <div className="game-companion"><Character id={characterId} happy={solved} /><p>{solved ? `Bien joué, ${playerName} !` : attempt ? 'Tu vas y arriver !' : 'On cherche ensemble !'}</p></div>
    <p className="tap-hint">{multiple ? 'Touche une case, puis un morceau. Touche un morceau placé pour le retirer.' : 'Tu peux aussi toucher un morceau.'}</p>
    {import.meta.env.DEV && new URLSearchParams(window.location.search).get('debugContent') === '1' &&
      <aside aria-label="Diagnostic contenu"><small>
        mot : {challenge.word}<br />
        source : {challenge.source}<br />
        introduit : semaine {challenge.introducedInWeek}<br />
        segmentation : {challenge.segments.join(' + ')}<br />
        segment{multiple ? 's' : ''} manquant{multiple ? 's' : ''} : {challenge.slots.map((slot) => slot.expected).join(' + ')}
      </small></aside>}
    {new URLSearchParams(window.location.search).get('debugAudio') === '1' && <AudioDiagnostics />}
  </main>;
}
