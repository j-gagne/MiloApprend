import { getCharacter, type CharacterId } from '../game/characters';
import { CharacterArtwork } from './CharacterArtwork';

export function Character({ id, happy = false, decorative = false }: { id: CharacterId; happy?: boolean; decorative?: boolean }) {
  const character = getCharacter(id);
  return <span className={`child-character${happy ? ' character-happy' : ''}`} role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : character.name} aria-hidden={decorative || undefined} data-character={character.id}>
    {character.visual.kind === 'svg' ? <CharacterArtwork id={character.id} happy={character.visual.happyExpression && happy} /> : <span className="character-emoji" aria-hidden="true">{character.visual.value}</span>}
  </span>;
}
