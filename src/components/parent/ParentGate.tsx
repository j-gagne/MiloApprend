import { useRef, useState } from 'react';
import { checkGate, createGate } from '../../parent/gate';

export function ParentGate({ onOpen, onCancel }: { onOpen: () => void; onCancel: () => void }) {
  const [challenge, setChallenge] = useState(createGate);
  const [digits, setDigits] = useState(['', '', '']);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  return <main className="parent-screen gate-screen">
    <h1>Espace parents</h1>
    <p>Entre les chiffres suivants :</p>
    <p className="gate-prompt" data-testid="gate-prompt">{challenge.prompt}</p>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (checkGate(challenge, digits.join(''))) onOpen();
      else { setDigits(['', '', '']); setChallenge(createGate()); setError('Essaie avec ces nouveaux chiffres.'); inputs.current[0]?.focus(); }
    }}>
      <div className="gate-digits">{digits.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }}
        autoFocus={index === 0} type="text" inputMode="numeric" pattern="[1-9]" autoComplete="off" maxLength={1}
        aria-label={`Chiffre ${index + 1}`} value={digit} onChange={(event) => {
          const value = event.target.value.replace(/[^1-9]/g, '').slice(-1);
          setDigits((current) => current.map((item, i) => i === index ? value : item));
          if (value) inputs.current[index + 1]?.focus();
        }} onKeyDown={(event) => { if (event.key === 'Backspace' && !digit) inputs.current[index - 1]?.focus(); }} />)}</div>
      <p role="status">{error}</p>
      <div className="parent-actions"><button type="submit" className="parent-primary">Valider</button>
        <button type="button" onClick={onCancel}>Annuler</button></div>
    </form>
    <small>Un petit défi pour réserver les réglages aux parents.</small>
  </main>;
}
