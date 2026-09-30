import { useState } from 'react';
import { LionReveal, type LionRevealStage } from './LionReveal';
import { themes, themeVariables } from '../game/themes';
import './lion-reveal-preview.css';

const titles = ['Qui se cache ici ?', 'Ça bouge dans les feuilles…', 'Coucou, petit lion !', 'Le voilà presque sorti !', 'Bonjour, petit lion !'];

export function LionRevealPreview() {
  const [stage, setStage] = useState<LionRevealStage>(1);
  return <div className="app-shell lion-reveal-preview" style={themeVariables(themes.lion)}>
    <header className="topbar"><a className="brand" href={window.location.pathname}><span className="brand-icon">m.</span><span>milo <b>apprend</b></span></a><span className="lion-prototype-label">Aperçu visuel</span></header>
    <main className="lion-reveal-main">
      <p className="eyebrow">UNE SURPRISE DANS LA JUNGLE</p>
      <h1 aria-live="polite">{titles[stage - 1]}</h1>
      <LionReveal stage={stage} />
      <p className="lion-reveal-count" aria-label={`Révélation : ${stage} sur 5`}>{stage}<span> / 5</span></p>
      <fieldset className="lion-reveal-controls"><legend>Explorer les cinq étapes</legend>
        {([1, 2, 3, 4, 5] as const).map(value => <button key={value} type="button" aria-label={`Étape ${value}`} aria-pressed={stage === value} onClick={() => setStage(value)}>{value}</button>)}
      </fieldset>
      <p className="lion-reveal-note">Prototype visuel indépendant du jeu.</p>
    </main>
  </div>;
}
