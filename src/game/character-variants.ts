import { getCharacter } from './characters.ts';

export const variantIds = ['normal', 'sleeping', 'celebrating', 'waving'] as const;
export type VariantId = typeof variantIds[number];
export const characterVariants = {
  dinosaur: variantIds, lion: variantIds, monkey: variantIds,
  unicorn: variantIds, rabbit: variantIds, tiger: variantIds,
};
export function isVariantId(value: unknown): value is VariantId {
  return variantIds.some(id => id === value);
}
export function variantCandidates(animalId: string, hatches: readonly { animalId: string; variantId?: VariantId }[]): readonly VariantId[] {
  const available = characterVariants[getCharacter(animalId).id];
  const owned = new Set(hatches.filter(hatch => hatch.animalId === animalId).map(hatch => hatch.variantId ?? 'normal'));
  const missing = available.filter(id => !owned.has(id));
  return missing.length ? missing : available;
}
export function selectVariant(animalId: string, hatches: readonly { animalId: string; variantId?: VariantId }[], rng: () => number = Math.random): VariantId {
  const candidates = variantCandidates(animalId, hatches);
  return candidates[Math.floor(rng() * candidates.length)];
}
