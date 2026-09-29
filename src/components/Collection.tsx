import { useEffect, useRef } from 'react';
import type { HatchRecord } from '../game/egg-rewards';
import { getCharacter } from '../game/characters';
import { Character } from './Character';

export function Collection({ hatches, onHome }: { hatches: readonly HatchRecord[]; onHome(): void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  return <main className="collection-screen">
    <h1 ref={title} tabIndex={-1}>MA COLLECTION</h1>
    <button className="collection-button" onClick={onHome}>RETOUR À L’ACCUEIL</button>
    {hatches.length ? <ul className="collection-grid" aria-label="Animaux collectionnés">
      {hatches.map(hatch => <li key={hatch.id} data-hatch-id={hatch.id}>
        <Character id={getCharacter(hatch.animalId).id} />
      </li>)}
    </ul> : <p className="collection-empty">Fais éclore ton premier œuf pour commencer ta collection !</p>}
    <p className="collection-count">{hatches.length} {hatches.length === 1 ? 'animal collectionné' : 'animaux collectionnés'}</p>
  </main>;
}
