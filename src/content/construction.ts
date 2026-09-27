import type { LearningProgram, LearningUnit, PedagogicalSegment, Segmentation, Word, Sentence } from './model.ts';
import { comparableText } from './text.ts';

export function blockText(program: LearningProgram, block: PedagogicalSegment): string {
  return 'unitId' in block ? program.units.find((unit) => unit.id === block.unitId)?.display ?? 'Unité absente'
    : 'literal' in block ? block.literal : block.separator;
}
export function primaryConstruction(unit: LearningUnit): Segmentation | undefined {
  const value = unit.type === 'word' || unit.type === 'sentence' ? unit.segmentations?.[0] : undefined;
  return value?.segments.length ? value : undefined;
}
export function constructionText(program: LearningProgram, construction: Segmentation): string {
  return construction.segments.map((part, i) => (construction.gaps?.[i] ?? '')
    + (construction.surface?.[i] ?? blockText(program, part))).join('') + (construction.gaps?.[construction.segments.length] ?? '');
}

// Aligne uniquement les blocs explicitement choisis. Aucun contenu n'est déduit.
// Les espaces viennent du texte original, pas de règles typographiques inventées.
export function sentenceConstruction(program: LearningProgram, text: string, construction: Segmentation): Segmentation {
  const gaps: string[] = [], surface: string[] = [];
  let cursor = 0;
  for (const block of construction.segments) {
    const gap = text.slice(cursor).match(/^\s*/u)![0];
    gaps.push(gap); cursor += gap.length;
    const value = blockText(program, block);
    let length = 0;
    for (let end = cursor + 1; end <= text.length; end++) {
      const candidate = text.slice(cursor, end);
      if (candidate.normalize('NFC').toLocaleLowerCase('fr') === value.normalize('NFC').toLocaleLowerCase('fr')) { length = end - cursor; break; }
    }
    if (length) { surface.push(text.slice(cursor, cursor + length)); cursor += length; }
    else { surface.push(value); cursor += value.length; }
  }
  const rest = text.slice(cursor);
  gaps.push(/^\s*$/u.test(rest) ? rest : '');
  return { ...construction, gaps, surface };
}

// Seul le suffixe terminal exact peut être fourni par le texte original.
export function terminalSuffix(text: string, reconstructed: string): string {
  if (!reconstructed || !text.startsWith(reconstructed)) return '';
  const rest = text.slice(reconstructed.length);
  return /^\s*[.!?…]+\s*$/u.test(rest) ? rest : '';
}
export function displayConstruction(program: LearningProgram, target: LearningUnit, construction: Segmentation): string {
  const text = constructionText(program, construction);
  return text + (target.type === 'sentence' ? terminalSuffix(target.display, text) : '');
}
export function unusedBlocks(units: readonly LearningUnit[], blocks: readonly PedagogicalSegment[], editing?: number, showUsed = false): readonly LearningUnit[] {
  const current = editing === undefined ? undefined : blocks[editing];
  return units.filter((unit) => showUsed || (current && 'unitId' in current && current.unitId === unit.id)
    || !blocks.some((block) => 'unitId' in block && block.unitId === unit.id));
}

export function replacePrimary<T extends Word | Sentence>(unit: T, construction?: Segmentation): T {
  const previous = unit.segmentations ?? [];
  return { ...unit, segmentations: construction ? [construction, ...previous.slice(1)]
    : previous.length > 1 ? [{ ...previous[0], segments: [], gaps: undefined, surface: undefined }, ...previous.slice(1)] : [] };
}

export function moveBlock(blocks: readonly PedagogicalSegment[], from: number, to: number): readonly PedagogicalSegment[] {
  if (from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks;
  const result = [...blocks]; const [block] = result.splice(from, 1); result.splice(to, 0, block); return result;
}

// Récupération proposée en brouillon seulement ; les anciennes alternatives restent stockées.
export function recoverPartialConstruction(program: LearningProgram, unit: Word | Sentence): Segmentation | undefined {
  const all = unit.segmentations ?? [];
  if (all.length < 2 || all.some((item) => comparableText(constructionText(program, item)) === comparableText(unit.display))) return undefined;
  const merged = { ...all[0], segments: all.flatMap((item) => item.segments) };
  return comparableText(constructionText(program, merged)) === comparableText(unit.display) ? merged : undefined;
}
