import { useEffect, useRef, useState } from 'react';
import type { CompletionExercise } from '../../game/completion-content';
import { createAnswerBank, availableAnswers, placementTexts, placeOccurrence, type OccurrencePlacements } from '../../game/answer-bank';
import { gameAudio } from '../../services/audio';
import { AnswerTile } from '../AnswerTile';
import { CompletionLine } from '../CompletionLine';
import { WordImage } from '../WordImage';

export function ActivityPreview({ exercise }: { exercise: CompletionExercise }) {
  const [placements, setPlacements] = useState<OccurrencePlacements>({});
  const bank = createAnswerBank(exercise);
  const texts = placementTexts(bank, placements);
  const [selected, setSelected] = useState(exercise.slots[0]?.segmentIndex);
  const [message, setMessage] = useState('Choisissez une case, puis une réponse pour tester.');
  const slots = useRef(new Map<number, HTMLButtonElement>());
  useEffect(() => () => gameAudio.stop(), []);
  function answer(id: string, slot = selected) {
    const result = placeOccurrence(exercise, bank, placements, slot, id);
    setPlacements(result.placements);
    setMessage(result.complete ? 'Exercice complété !' : result.accepted ? 'Case correcte.' : 'Ce morceau ne correspond pas à cette case.');
    if (result.accepted) setSelected(exercise.slots.find((item) => !result.placements[item.segmentIndex])?.segmentIndex ?? selected);
  }
  return <section className="parent-preview" aria-label="Aperçu interactif">
    <h3>Aperçu interactif</h3>
    {exercise.activityType === 'spell' && <p className="spell-model">{exercise.target.text}</p>}
    {exercise.target.imageAsset && <WordImage image={'emoji' in exercise.target.imageAsset ? exercise.target.imageAsset
      : { ...exercise.target.imageAsset, emoji: '🖼️' }} />}
    <button type="button" onClick={() => { gameAudio.unlock(); void gameAudio.playWord(exercise.target.audioText); }}>Tester le son</button>
    <CompletionLine board={exercise} sentence={exercise.target.type === 'sentence'} className="parent-tokens" render={(index) => exercise.slots.some((slot) => slot.segmentIndex === index)
      ? <button ref={(element) => { if (element) slots.current.set(index, element); else slots.current.delete(index); }} type="button" key={index} aria-label={`Case aperçu ${index + 1}`} aria-pressed={selected === index}
          onClick={() => setSelected(index)}>{texts[index] ?? '?'}</button>
      : <span key={index}>{exercise.segments[index]}</span>} />
    <div className="parent-tokens">{availableAnswers(bank, placements).map((choice) => <AnswerTile key={choice.id} text={choice.text}
      label={`Tester ${choice.text}`} disabled={false} retry={0} className="parent-answer" onAnswer={(_, slot) => answer(choice.id, slot)} onHover={() => {}}
      findTarget={(x, y) => { for (const [index, element] of slots.current) { const rect = element.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return index; } }} />)}</div>
    <p role="status">{message}</p>
    <button type="button" onClick={() => { setPlacements({}); setSelected(exercise.slots[0].segmentIndex); setMessage('Aperçu réinitialisé.'); }}>Recommencer le test</button>
  </section>;
}
