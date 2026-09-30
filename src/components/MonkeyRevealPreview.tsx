import { useState } from 'react';
import type { EggStage } from './HatchingPreview';
import { MonkeyBananaReveal } from './MonkeyBananaReveal';
import { themes, themeVariables } from '../game/themes';
import './lion-reveal-preview.css';

export function MonkeyRevealPreview() {
  const [stage, setStage] = useState<EggStage>(1);
  return <main className="app-shell lion-reveal-preview" style={themeVariables(themes.monkey)}>
    <div className="lion-reveal-main">
      <p className="eyebrow">APERÇU VISUEL</p><h1>Une surprise dans les bananes</h1>
      <MonkeyBananaReveal stage={stage} />
      <p className="lion-reveal-count">{stage}<span> / 5</span></p>
      <fieldset className="lion-reveal-controls"><legend>Explorer les cinq étapes</legend>
        {([1, 2, 3, 4, 5] as const).map(value => <button key={value} aria-label={`Étape ${value}`} aria-pressed={stage === value} onClick={() => setStage(value)}>{value}</button>)}
      </fieldset>
    </div>
  </main>;
}
