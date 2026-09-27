import { useEffect, useRef } from 'react';
import { characterCatalog, type CharacterId } from '../game/characters';
import { Character } from './Character';

export function CharacterPicker({ selected, onSelect, onClose }: {
  selected: CharacterId; onSelect: (id: CharacterId) => void; onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <main className="character-picker" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <h1 ref={heading} tabIndex={-1}>Choisis ton personnage</h1>
    <div className="character-grid" aria-label="Personnages disponibles">
      {characterCatalog.map((character) => <button key={character.id} className="character-choice"
        aria-pressed={selected === character.id} onClick={() => onSelect(character.id)}>
        <Character id={character.id} decorative />
        <strong>{character.name}</strong>
        <span className="character-selected" aria-hidden="true">{selected === character.id ? '✓ Ton ami' : '\u00a0'}</span>
      </button>)}
    </div>
    <button className="text-button" onClick={onClose}>Retour</button>
  </main>;
}
