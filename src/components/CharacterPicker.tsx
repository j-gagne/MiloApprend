import { useEffect, useRef, useState } from 'react';
import { MAX_PLAYER_NAME_LENGTH, normalizePlayerName } from '../services/progress';
import { characterCatalog, type CharacterId } from '../game/characters';
import { Character } from './Character';

export function CharacterPicker({ selected, playerName, onPreview, onSelect, onClose }: {
  selected: CharacterId; playerName: string; onPreview: (id: CharacterId) => void; onSelect: (id: CharacterId, name: string) => void; onClose: () => void;
}) {
  const [choice, setChoice] = useState(selected);
  const [name, setName] = useState(playerName);
  const validName = normalizePlayerName(name);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <main className="character-picker" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <h1 ref={heading} tabIndex={-1}>Choisis ton personnage</h1>
    <form onSubmit={(event) => { event.preventDefault(); if (validName) onSelect(choice, validName); }}>
    <div className="character-grid" aria-label="Personnages disponibles">
      {characterCatalog.map((character) => <button key={character.id} className="character-choice"
        type="button" aria-pressed={choice === character.id} onClick={() => { setChoice(character.id); onPreview(character.id); }}>
        <Character id={character.id} decorative />
        <strong>{character.name}</strong>
        <span className="character-selected" aria-hidden="true">{choice === character.id ? '✓ Ton ami' : '\u00a0'}</span>
      </button>)}
    </div>
    <label className="player-name">Ton prénom<input name="given-name" autoComplete="given-name" type="text"
      value={name} required aria-describedby="player-name-hint"
      onChange={(event) => setName(event.target.value)} /></label>
    <p id="player-name-hint">De 1 à {MAX_PLAYER_NAME_LENGTH} caractères.</p>
    <button className="primary-button" type="submit" disabled={!validName}>Continuer</button>
    </form>
    <button className="text-button" onClick={onClose}>Retour</button>
  </main>;
}
