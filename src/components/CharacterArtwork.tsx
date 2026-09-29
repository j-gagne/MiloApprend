import { Dinosaur } from './Dinosaur';
import { Rabbit } from './Rabbit';
import { getCharacter, type ChildCharacter } from '../game/characters';

// React stays in the visual adapter; domain/storage/audio use the plain-data catalogue.
type SvgKey = Extract<ChildCharacter['visual'], { kind: 'svg' }>['component'];
const svgCharacters = { dinosaur: Dinosaur, rabbit: Rabbit } satisfies Record<SvgKey, typeof Dinosaur>;
export function CharacterArtwork({ id, happy = false }: { id: string; happy?: boolean }) {
  const { visual } = getCharacter(id);
  if (visual.kind === 'svg') { const Artwork = svgCharacters[visual.component]; return <Artwork happy={happy} />; }
  return <svg viewBox="0 0 340 300" aria-hidden="true"><text x="170" y="235" textAnchor="middle" fontSize="190">{visual.value}</text></svg>;
}
