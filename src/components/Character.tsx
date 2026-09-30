import { getCharacter, type CharacterId } from '../game/characters';
import { CharacterArtwork } from './CharacterArtwork';
import type { VariantId } from '../game/character-variants';

export function Character({ id, happy = false, decorative = false, variantId = 'normal' }: { id: CharacterId; happy?: boolean; decorative?: boolean; variantId?: VariantId }) {
  const character = getCharacter(id);
  return <span className={`child-character${happy ? ' character-happy' : ''}`} role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : `${character.name}${variantId === 'sleeping' ? ' — Dodo' : ''}`} aria-hidden={decorative || undefined} data-character={character.id}>
    <CharacterArtwork id={character.id} variantId={variantId} happy={character.visual.happyExpression && happy} />
  </span>;
}
