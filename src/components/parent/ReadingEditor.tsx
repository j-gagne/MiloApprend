import { useEffect, useSyncExternalStore } from 'react';
import type { LearningProgram, Word } from '../../content/model';
import { primaryConstruction } from '../../content/construction';
import { getPedagogicalReading } from '../../content/segmented-reading';
import { gameAudio } from '../../services/audio';

export type ReadingConfig = Pick<Word, 'readingMode' | 'readingSequence'>;
export function ReadingEditor({ program, word, week, onChange }: {
  program: LearningProgram; word: Word; week: number; onChange: (value: ReadingConfig) => void;
}) {
  const mode = word.readingMode === 'whole' ? 'whole' : word.readingSequence !== undefined ? 'custom' : 'auto';
  const sequence = word.readingSequence ?? [];
  const previewProgram = { ...program, units: [...program.units.filter((u) => u.id !== word.id), word] };
  const reading = getPedagogicalReading(previewProgram, { ...word,
    readingSequence: word.readingSequence?.map((step) => 'text' in step ? { text: step.text.trim() } : step) }, primaryConstruction(word), week);
  const { muted } = useSyncExternalStore(gameAudio.subscribe, gameAudio.getDiagnostics);
  useEffect(() => () => gameAudio.stop(), []);
  function change(value: ReadingConfig) { gameAudio.stop(); onChange(value); }
  function steps(value: NonNullable<Word['readingSequence']>) { change({ readingMode: 'segmented', readingSequence: value }); }
  return <fieldset><legend>Lecture audio</legend>
    <label>Lecture du mot<select value={mode} onChange={(event) => {
      change(event.target.value === 'custom' ? { readingMode: 'segmented', readingSequence: [] }
        : { readingMode: event.target.value === 'whole' ? 'whole' : 'segmented', readingSequence: undefined });
    }}><option value="auto">Automatique</option><option value="whole">Mot complet lentement</option><option value="custom">Séquence personnalisée</option></select></label>
    {mode === 'custom' && <>
      <p>Ajoutez les morceaux à entendre. Le mot complet est lu automatiquement à la fin. Ces morceaux audio ne changent pas les exercices.</p>
      {sequence.map((step, index) => <div className="parent-card" key={index}>
        <label>Type du morceau {index + 1}<select value={'unitId' in step ? 'unit' : 'text'} onChange={(event) => {
          steps(sequence.map((item, i) => i === index ? event.target.value === 'unit' ? { unitId: '' } : { text: '' } : item));
        }}><option value="text">Texte à prononcer</option><option value="unit">Contenu existant</option></select></label>
        {'unitId' in step ? <label>Contenu du morceau {index + 1}<select value={step.unitId} onChange={(event) => steps(sequence.map((item, i) => i === index ? { unitId: event.target.value } : item))}>
          <option value="">Choisir un contenu</option>{program.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.display} · {unit.type} · semaine {unit.introducedInWeek}</option>)}
        </select></label> : <label>Texte du morceau {index + 1}<input value={step.text} maxLength={500}
          onChange={(event) => steps(sequence.map((item, i) => i === index ? { text: event.target.value } : item))} /></label>}
        <div className="parent-actions">
          <button type="button" aria-label={`Monter le morceau ${index + 1}`} disabled={index === 0} onClick={() => {
            const next = [...sequence]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; steps(next);
          }}>Monter</button>
          <button type="button" aria-label={`Descendre le morceau ${index + 1}`} disabled={index === sequence.length - 1} onClick={() => {
            const next = [...sequence]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; steps(next);
          }}>Descendre</button>
          <button type="button" aria-label={`Supprimer le morceau ${index + 1}`} onClick={() => steps(sequence.filter((_, i) => i !== index))}>Supprimer</button>
        </div>
      </div>)}
      <button type="button" onClick={() => steps([...sequence, { text: '' }])}>Ajouter un morceau audio</button>
    </>}
    <p data-testid="reading-editor-preview">{reading ? reading.mode === 'whole' ? reading.whole : [...reading.segments, reading.whole].join(' → ') : 'Découpe non disponible'}</p>
    <div className="parent-actions">
      <button type="button" disabled={muted || !word.audioText.trim()} onClick={() => { gameAudio.unlock(); void gameAudio.playWord(word.audioText, word.audioAsset ?? undefined); }}>🔊 Mot</button>
      <button type="button" disabled={muted || !reading} onClick={() => { if (reading) { gameAudio.unlock(); void gameAudio.playPedagogical(reading, word.audioAsset ?? undefined); } }}>🐢 {mode === 'whole' ? 'Lentement' : 'Découpe'}</button>
    </div>
  </fieldset>;
}
