import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ContentService } from '../../content/service';
import { blockText } from '../../content/construction';
import { getPedagogicalReading } from '../../content/segmented-reading';
import { gameAudio } from '../../services/audio';

export function AudioTest({ service }: { service: ContentService }) {
  const program = service.getProgram();
  const words = program.units.filter((unit) => unit.type === 'word');
  const [wordId, setWordId] = useState(words[0]?.id ?? '');
  const [constructionId, setConstructionId] = useState('');
  const word = words.find((unit) => unit.id === wordId) ?? words[0];
  const construction = word?.segmentations.find((item) => item.id === constructionId) ?? word?.segmentations[0];
  const reading = word ? getPedagogicalReading(program, word, construction, service.activeWeek) : null;
  const { muted, finalRate, lastText } = useSyncExternalStore(gameAudio.subscribe, gameAudio.getDiagnostics);
  const rates = gameAudio.getPlaybackRates();
  useEffect(() => () => gameAudio.stop(), []);

  return <section aria-label="Test audio"><h2>Test audio</h2>
    <p>Écoutez avec la voix de cet appareil et la vitesse choisie dans les réglages Parent.</p>
    {!word ? <p>Aucun mot dans le programme.</p> : <>
      <label>Mot du programme<select value={word.id} onChange={(event) => {
        gameAudio.stop(); setWordId(event.target.value); setConstructionId('');
      }}>{words.map((item) => <option key={item.id} value={item.id}>{item.display} — semaine {item.introducedInWeek}</option>)}</select></label>
      {word.segmentations.length > 1 && <label>Construction<select value={construction?.id} onChange={(event) => {
        gameAudio.stop(); setConstructionId(event.target.value);
      }}>{word.segmentations.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select></label>}
      <div className="parent-card">
        <h3>Construction</h3>
        <p data-testid="audio-test-construction">{construction
          ? `${word.display} = ${construction.segments.map((block) => blockText(program, block)).join(' + ')}`
          : 'Aucune construction définie.'}</p>
        <h3>Textes envoyés au TTS</h3>
        <p>Mode de lecture : {word.readingMode === 'whole' ? 'Mot complet lent' : 'Segmenté'}</p>
        <p data-testid="audio-test-rates">Vitesses demandées — Mot : {rates.normal.toFixed(2)}
          {word.readingMode === 'whole' ? ` · Lentement : ${rates.slowWhole.toFixed(2)}` : ` · Découpe : ${rates.slowWhole.toFixed(2)}`}</p>
        {finalRate !== undefined && <p data-testid="audio-test-final-rate">Dernier rate transmis au TTS : {finalRate.toFixed(2)} — « {lastText} »</p>}
        <p>Mot : <span data-testid="audio-test-whole">{word.audioText}</span></p>
        {reading ? <p data-testid="audio-test-segments">{reading.mode === 'whole' ? reading.whole : [...reading.segments, reading.whole].join(' → ')}</p>
          : <p>Découpe non disponible</p>}
        {!reading && <small>La découpe suit les critères du jeu : construction explicite valide, sans bloc littéral prononçable, et contenu disponible à la semaine active.</small>}
        {word.audioAsset && <p>Le fichier audio du mot est prioritaire ; le texte TTS sert de secours, comme dans le jeu.</p>}
        {muted && <p>Son coupé : activez le son avec le bouton haut-parleur en haut de l’écran.</p>}
        <div className="parent-actions">
          <button disabled={muted} onClick={() => { gameAudio.unlock(); void gameAudio.playWord(word.audioText, word.audioAsset ?? undefined); }}>🔊 Mot</button>
          <button disabled={muted || !reading} onClick={() => {
            if (reading) { gameAudio.unlock(); void gameAudio.playPedagogical(reading, word.audioAsset ?? undefined); }
          }}>🐢 {word.readingMode === 'whole' ? 'Lentement' : 'Découpe'}</button>
        </div>
      </div>
    </>}
  </section>;
}
