import { Dinosaur } from './Dinosaur';
import { Rabbit } from './Rabbit';
import { Lion } from './Lion';
import { Unicorn } from './Unicorn';
import { Monkey } from './Monkey';
import { Tiger } from './Tiger';
import { getCharacter, type ChildCharacter } from '../game/characters';
import type { VariantId } from '../game/character-variants';

// React stays in the visual adapter; domain/storage/audio use the plain-data catalogue.
type SvgKey = Extract<ChildCharacter['visual'], { kind: 'svg' }>['component'];
const svgCharacters = { dinosaur: Dinosaur, rabbit: Rabbit, lion: Lion, unicorn: Unicorn, monkey: Monkey, tiger: Tiger } satisfies Record<SvgKey, typeof Dinosaur>;
export function CharacterArtwork({ id, happy = false, variantId = 'normal' }: { id: string; happy?: boolean; variantId?: VariantId }) {
  const { visual } = getCharacter(id);
  const Artwork = svgCharacters[visual.component];
  return <Artwork happy={variantId === 'normal' && happy} sleeping={variantId === 'sleeping'} celebrating={variantId === 'celebrating'} waving={variantId === 'waving'} />;
}
