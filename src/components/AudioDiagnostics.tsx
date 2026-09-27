import { useEffect, useSyncExternalStore } from 'react';
import { gameAudio } from '../services/audio';

export function AudioDiagnostics() {
  const state = useSyncExternalStore(gameAudio.subscribe, gameAudio.getDiagnostics);
  useEffect(() => { gameAudio.prepareSpeech(); }, []);
  const french = state.voices.filter((voice) => voice.lang.toLowerCase().startsWith('fr'));

  return <section className="audio-diagnostics" aria-label="Diagnostic audio">
    <h2>Diagnostic audio temporaire</h2>
    <div className="audio-test-buttons">
      <button onClick={() => gameAudio.testSpeech(false)}>TEST AUDIO</button>
      <button onClick={() => gameAudio.testSpeech(true)}>TEST VOIX FR</button>
    </div>
    <p>Tests : « Bonjour Milo ». Le bouton son reste prioritaire.</p>
    <dl>
      <dt>speechSynthesis disponible</dt><dd>{state.available ? 'oui' : 'non'}</dd>
      <dt>Nombre de voix disponibles</dt><dd>{state.voices.length}</dd>
      <dt>Voix françaises (name / lang)</dt><dd>{french.length ? <ul>{french.map((voice, index) => <li key={index}>{voice.name || '(sans nom)'} — {voice.lang}</li>)}</ul> : 'Aucune'}</dd>
      <dt>Chargement / sélection</dt><dd>{state.voiceStatus}</dd>
      <dt>Voix de la dernière tentative</dt><dd>{state.selected}</dd>
      <dt>Muted</dt><dd>{state.muted ? 'oui' : 'non'}</dd>
      <dt>Dernier texte demandé</dt><dd>{state.lastText}</dd>
      <dt>Dernière tentative de lecture</dt><dd>{state.lastAttempt}</dd>
      <dt>Activation utilisateur à la demande</dt><dd>{state.gesture}</dd>
      <dt>Dernier code / message d’erreur</dt><dd>{state.lastError}</dd>
    </dl>
    <h3>Événements onstart / onend / onerror</h3>
    <p>Un appel speak() ne prouve pas qu’un son a été émis.</p>
    <ol>{state.events.map((event, index) => <li key={`${index}-${event}`}>{event}</li>)}</ol>
  </section>;
}
