// Exact decorative colors from the original dinosaur UI. Feedback/focus colors stay in CSS.
export const dinosaurTheme = {
  text: '#284c43', background: '#f8f6eb', primary: '#628859',
  surface: '#fffef7', 'surface-soft': '#eef0e3', 'brand-soft': '#e1e9cc',
  border: '#dce2cd', 'card-border': '#e6e7d7', 'bubble-border': '#e5e7d7',
  'sound-surface': '#fffdf5', 'sound-border': '#dce0d0',
  muted: '#677b6d', eyebrow: '#607b61', note: '#6c7c66', 'pill-text': '#62775b',
  footer: '#597254', 'footer-accent': '#8da46c', hint: '#697b63', 'celebration-text': '#64795c',
  accent: '#ebba58', 'accent-text': '#354633', 'accent-edge': '#c8963c',
  'accent-small': '#bb872b', 'title-dot': '#d8a648', sparkle: '#d7a33b',
  'hill-back': '#e5ebd3', 'hill-front': '#d9e4c9', plant: '#8ca981', 'plant-soft': '#adbc91', stone: '#b9be9a',
  'control-soft': '#dcecc8', 'control-border': '#a8bf8c', 'selection-border': '#bacfa6', 'selection-surface': '#eef4e5',
  progress: '#6d9866', 'progress-strong': '#456f40',
  'tile-one': '#f3d995', 'tile-one-border': '#e4c474', 'tile-one-edge': '#cfb06b', 'tile-text': '#4a5033',
  'tile-two': '#dfebcf', 'tile-two-edge': '#9db487',
  'tile-three': '#f2d8c9', 'tile-three-border': '#e1bbaa', 'tile-three-edge': '#c69f8e',
  'drag-surface': '#f5dc9f',
} as const;
export type ThemePalette = { readonly [K in keyof typeof dinosaurTheme]: string };
interface ThemeColors {
  text: string; background: string; primary: string; soft: string; border: string; muted: string;
  accent: string; edge: string; surface: string; back: string; front: string; plant: string;
  tile: string; tileBorder: string; tileEdge: string; third: string; thirdBorder: string; thirdEdge: string;
}
function palette(c: ThemeColors): ThemePalette {
  return { ...dinosaurTheme,
    text: c.text, background: c.background, primary: c.primary, surface: c.surface, 'surface-soft': c.soft,
    'brand-soft': c.soft, border: c.border, 'card-border': c.border, 'bubble-border': c.border,
    'sound-surface': c.surface, 'sound-border': c.border, muted: c.muted, eyebrow: c.muted,
    note: c.muted, 'pill-text': c.muted, footer: c.muted, 'footer-accent': c.primary, hint: c.muted, 'celebration-text': c.muted,
    accent: c.accent, 'accent-text': c.text, 'accent-edge': c.edge, 'accent-small': c.edge, 'title-dot': c.edge, sparkle: c.edge,
    'hill-back': c.back, 'hill-front': c.front, plant: c.plant, 'plant-soft': c.border, stone: c.border,
    'control-soft': c.soft, 'control-border': c.border, 'selection-border': c.border, 'selection-surface': c.soft,
    progress: c.primary, 'progress-strong': c.text,
    'tile-one': c.tile, 'tile-one-border': c.tileBorder, 'tile-one-edge': c.tileEdge, 'tile-text': c.text,
    'tile-two': c.soft, 'tile-two-edge': c.plant,
    'tile-three': c.third, 'tile-three-border': c.thirdBorder, 'tile-three-edge': c.thirdEdge, 'drag-surface': c.tile,
  };
}
export const themes = {
  rabbit: palette({ text: '#53313c', background: '#fff5f5', primary: '#b45b78', soft: '#f8dfe6', border: '#d9acbb', muted: '#795662',
    accent: '#eeadc3', edge: '#b77289', surface: '#fffbf7', back: '#f9e3e8', front: '#efc6d3', plant: '#bf8197',
    tile: '#f6c9d8', tileBorder: '#dda5b8', tileEdge: '#bd8096', third: '#f9dfd2', thirdBorder: '#dfb7a5', thirdEdge: '#bf927d' }),
  dinosaur: dinosaurTheme,
  lion: palette({ text: '#513c24', background: '#fff8e9', primary: '#a26727', soft: '#f8e8c2', border: '#d9bf8b', muted: '#766044',
    accent: '#efbd60', edge: '#b47e30', surface: '#fffdf4', back: '#f4e8c9', front: '#eed6a6', plant: '#c29b5b',
    tile: '#f6dba0', tileBorder: '#dfbb73', tileEdge: '#c59c58', third: '#f5dfcc', thirdBorder: '#dfb99a', thirdEdge: '#bf9474' }),
  monkey: palette({ text: '#49382d', background: '#faf4eb', primary: '#876248', soft: '#eee0cb', border: '#cbb498', muted: '#716151',
    accent: '#dcb582', edge: '#a37a4c', surface: '#fffaf3', back: '#eee3d3', front: '#e3cdb3', plant: '#af8d68',
    tile: '#ebcfaa', tileBorder: '#cfac7f', tileEdge: '#b18b5d', third: '#f1dcd1', thirdBorder: '#d6b6a6', thirdEdge: '#b99581' }),
  tiger: palette({ text: '#4d302b', background: '#fff3ea', primary: '#ad5535', soft: '#f8ddcc', border: '#d9ad92', muted: '#78584d',
    accent: '#eea06b', edge: '#b46a40', surface: '#fffaf3', back: '#f5dece', front: '#edc5a8', plant: '#bb835f',
    tile: '#f5c8a1', tileBorder: '#dfa97b', tileEdge: '#bd8155', third: '#efd6c5', thirdBorder: '#d6b299', thirdEdge: '#b68a6e' }),
  unicorn: palette({ text: '#473652', background: '#f9f3fc', primary: '#825a9b', soft: '#eadff4', border: '#c7b1d7', muted: '#705e7c',
    accent: '#dfb6da', edge: '#aa7ca8', surface: '#fffaff', back: '#eee1f5', front: '#dfccea', plant: '#aa87bd',
    tile: '#ecd0e6', tileBorder: '#d3add0', tileEdge: '#b78fb4', third: '#f7dfe9', thirdBorder: '#dfbacb', thirdEdge: '#c297ac' }),
} as const;

export function themeVariables(theme: ThemePalette): Record<string, string> {
  return Object.fromEntries(Object.entries(theme).map(([key, value]) => [`--theme-${key}`, value]));
}
