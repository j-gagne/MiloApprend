import { useState } from 'react';
import { CharacterRewardReveal } from './CharacterRewardReveal';
import type { EggStage } from './HatchingPreview';
import { getCharacter } from '../game/characters';
import { themeVariables } from '../game/themes';

export function EnvironmentRevealPreview({ characterId }: { characterId: 'unicorn' | 'rabbit' | 'tiger' }) {
  const [stage, setStage] = useState<EggStage>(1);
  const titles = { unicorn: 'Une surprise dans les nuages', rabbit: 'Une surprise près du terrier', tiger: 'Une surprise dans les hautes herbes' };
  return <main className="app-shell lion-reveal-preview" style={themeVariables(getCharacter(characterId).theme)}>
    <div className="lion-reveal-main">
      <p className="eyebrow">APERÇU VISUEL</p><h1>{titles[characterId]}</h1>
      <CharacterRewardReveal characterId={characterId} stage={stage} />
      <p className="lion-reveal-count">{stage}<span> / 5</span></p>
      <fieldset className="lion-reveal-controls"><legend>Explorer les cinq étapes</legend>
        {([1, 2, 3, 4, 5] as const).map(value => <button key={value} aria-label={`Étape ${value}`} aria-pressed={stage === value} onClick={() => setStage(value)}>{value}</button>)}
      </fieldset>
    </div>
  </main>;
}
