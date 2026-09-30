import type { ReactNode } from 'react';
import { HatchingEgg, HatchingScreen, type EggStage } from './HatchingPreview';
import { LionReveal } from './LionReveal';
import { MonkeyBananaReveal } from './MonkeyBananaReveal';
import { getCharacter } from '../game/characters';
import { themeVariables } from '../game/themes';
import './lion-reveal-preview.css';

export function CharacterRewardReveal({ characterId, stage }: { characterId: string; stage: EggStage }) {
  if (characterId === 'lion') return <LionReveal stage={stage} />;
  if (characterId === 'monkey') return <MonkeyBananaReveal stage={stage} />;
  return <HatchingEgg animalId={characterId} stage={stage} />;
}

export function CharacterRewardScreen({ animalId, stage, progress = stage, total = 5, onContinue, notice }: {
  animalId: string; stage: EggStage; progress?: number; total?: number; onContinue: () => void; notice?: ReactNode;
}) {
  if (animalId !== 'lion' && animalId !== 'monkey') return <HatchingScreen {...{ animalId, stage, progress, total, onContinue, notice }} />;
  const name = animalId === 'lion' ? 'lion' : 'singe';
  const titles = ['Qui se cache ici ?', animalId === 'lion' ? 'Ça bouge dans les feuilles…' : 'Ça bouge dans les bananes…', `Coucou, petit ${name} !`, 'Le voilà presque sorti !', `Bonjour, petit ${name} !`];
  return <div className="app-shell lion-reveal-preview" style={themeVariables(getCharacter(animalId).theme)}>
    <header className="topbar"><a className="brand" href={window.location.pathname}><span className="brand-icon">m.</span><span>milo <b>apprend</b></span></a></header>
    <main className="lion-reveal-main">
      <p className="eyebrow">UNE PETITE SURPRISE</p>
      <h1 aria-live="polite">{titles[stage - 1]}</h1>
      <CharacterRewardReveal characterId={animalId} stage={stage} />
      <p className="lion-reveal-count" aria-label={`Découverte : ${progress} sur ${total}`}>{progress}<span> / {total}</span></p>
      <button className="primary-button" onClick={onContinue}>CONTINUER <span aria-hidden="true">→</span></button>
      {notice}
    </main>
  </div>;
}
