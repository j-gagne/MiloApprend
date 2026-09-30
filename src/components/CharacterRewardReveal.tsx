import type { ReactNode } from 'react';
import type { VariantId } from '../game/character-variants';
import { HatchingEgg, HatchingScreen, type EggStage } from './HatchingPreview';
import { LionReveal } from './LionReveal';
import { MonkeyBananaReveal } from './MonkeyBananaReveal';
import { UnicornReveal } from './UnicornReveal';
import { RabbitReveal } from './RabbitReveal';
import { TigerReveal } from './TigerReveal';
import { getCharacter } from '../game/characters';
import { themeVariables } from '../game/themes';
import './lion-reveal-preview.css';

export function CharacterRewardReveal({ characterId, stage, variantId }: { characterId: string; stage: EggStage; variantId?: VariantId }) {
  if (characterId === 'lion') return <LionReveal stage={stage} variantId={variantId} />;
  if (characterId === 'monkey') return <MonkeyBananaReveal stage={stage} variantId={variantId} />;
  if (characterId === 'unicorn') return <UnicornReveal stage={stage} variantId={variantId} />;
  if (characterId === 'rabbit') return <RabbitReveal stage={stage} variantId={variantId} />;
  if (characterId === 'tiger') return <TigerReveal stage={stage} variantId={variantId} />;
  return <HatchingEgg animalId={characterId} stage={stage} variantId={variantId} />;
}

export function CharacterRewardScreen({ animalId, variantId, stage, progress = stage, total = 5, onContinue, notice }: {
  animalId: string; variantId?: VariantId; stage: EggStage; progress?: number; total?: number; onContinue: () => void; notice?: ReactNode;
}) {
  if (!['lion', 'monkey', 'unicorn', 'rabbit', 'tiger'].includes(animalId)) return <HatchingScreen {...{ animalId, variantId, stage, progress, total, onContinue, notice }} />;
  const names: Record<string, string> = { lion: 'petit lion', monkey: 'petit singe', unicorn: 'petite licorne', rabbit: 'petit lapin', tiger: 'petit tigre' };
  const places: Record<string, string> = { lion: 'dans les feuilles', monkey: 'dans les bananes', unicorn: 'dans les nuages', rabbit: 'près du terrier', tiger: 'dans les hautes herbes' };
  const titles = ['Qui se cache ici ?', `Ça bouge ${places[animalId]}…`, `Coucou, ${names[animalId]} !`, animalId === 'unicorn' ? 'La voilà presque sortie !' : 'Le voilà presque sorti !', `Bonjour, ${names[animalId]} !`];
  return <div className="app-shell lion-reveal-preview" style={themeVariables(getCharacter(animalId).theme)}>
    <header className="topbar"><a className="brand" href={window.location.pathname}><span className="brand-icon">m.</span><span>milo <b>apprend</b></span></a></header>
    <main className="lion-reveal-main">
      <p className="eyebrow">UNE PETITE SURPRISE</p>
      <h1 aria-live="polite">{titles[stage - 1]}</h1>
      <CharacterRewardReveal characterId={animalId} variantId={variantId} stage={stage} />
      <p className="lion-reveal-count" aria-label={`Découverte : ${progress} sur ${total}`}>{progress}<span> / {total}</span></p>
      <button className="primary-button" onClick={onContinue}>CONTINUER <span aria-hidden="true">→</span></button>
      {notice}
    </main>
  </div>;
}
