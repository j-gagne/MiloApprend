import assert from 'node:assert/strict';
import test from 'node:test';
import { characterCatalog } from '../src/game/characters.ts';
import { dinosaurTheme, themes, themeVariables } from '../src/game/themes.ts';

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
test('dinosaur retains exact reference colors', () => {
  assert.equal(dinosaurTheme.text, '#284c43'); assert.equal(dinosaurTheme.background, '#f8f6eb');
  assert.equal(dinosaurTheme.primary, '#628859'); assert.equal(dinosaurTheme.accent, '#ebba58');
  assert.equal(dinosaurTheme.surface, '#fffef7'); assert.equal(dinosaurTheme['hill-back'], '#e5ebd3');
  assert.equal(dinosaurTheme['hill-front'], '#d9e4c9'); assert.equal(dinosaurTheme['tile-one'], '#f3d995');
});
test('each catalog character has a complete distinct palette with centralized CSS variables', () => {
  assert.equal(new Set(characterCatalog.map((c) => c.theme.primary)).size, 6);
  for (const character of characterCatalog) {
    assert.deepEqual(character.theme, themes[character.id]);
    assert.deepEqual(Object.keys(character.theme).sort(), Object.keys(dinosaurTheme).sort());
    assert.equal(themeVariables(character.theme)['--theme-text'], character.theme.text);
    assert.ok(Object.values(character.theme).every((color) => /^#[0-9a-f]{6}$/.test(color)));
  }
  assert.notDeepEqual(themes.lion, themes.tiger);
});
test('principal text, controls, answer tiles and existing focus retain readable contrast', () => {
  for (const [name, theme] of Object.entries(themes)) {
    for (const background of [theme.background, theme.surface, theme['surface-soft'], theme['control-soft']]) {
      assert.ok(contrast(theme.text, background) >= 4.5, `${name}: text ${background}`);
    }
    assert.ok(contrast(theme['accent-text'], theme.accent) >= 4.5, `${name}: button`);
    for (const background of [theme['tile-one'], theme['tile-two'], theme['tile-three']]) {
      assert.ok(contrast(theme['tile-text'], background) >= 4.5, `${name}: tiles`);
    }
    assert.ok(contrast('#26786c', theme.surface) >= 3, `${name}: focus`);
  }
});

test('rabbit has a pink palette distinct from lavender unicorn', () => {
  assert.equal(themes.rabbit.primary, '#b45b78');
  assert.equal(themes.rabbit.background, '#fff5f5');
  assert.equal(themes.rabbit.accent, '#eeadc3');
  assert.notDeepEqual(themes.rabbit, themes.unicorn);
});

test('success palettes are complete, readable and preserve Dinosaur exactly', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(dinosaurTheme).filter(([key]) => key.startsWith('success-'))), {
    'success-bg': '#dcecc8', 'success-border': '#95b472', 'success-text': '#365632',
    'success-surface': '#f0f7e6', 'success-surface-border': '#a8bd8a',
    'success-feedback': '#607753', 'success-word': '#284c43',
  });
  for (const { id, theme } of characterCatalog) {
    assert.equal(themeVariables(theme)['--theme-success-bg'], theme['success-bg']);
    assert.ok(contrast(theme['success-text'], theme['success-bg']) >= 4.5, id);
    // Preserve the approved Dinosaur baseline; new palettes meet 4.5:1.
    const feedbackMinimum = id === 'dinosaur' ? contrast('#607753', '#f0f7e6') : 4.5;
    assert.ok(contrast(theme['success-feedback'], theme['success-surface']) >= feedbackMinimum, id);
    assert.ok(contrast(theme['success-word'], theme['success-surface']) >= 4.5, id);
    if (id !== 'dinosaur') {
      assert.notEqual(theme['success-bg'], dinosaurTheme['success-bg']);
      assert.ok(contrast(theme['success-border'], theme['success-bg']) >= 3, id);
    }
  }
});
