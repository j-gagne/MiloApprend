import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { emptyParentData } from '../../src/parent/model';
import { buildSeedProgram } from '../../src/content/seed-bank';
import { mathCatalog } from '../../src/content/math-catalog';
import type { MathExerciseDefinition } from '../../src/content/math-model';

async function setup(page: Page, definitions: MathExerciseDefinition[], numbers: number[]) {
  await mockSpeech(page);
  const weeks = [{ number: 10, label: '10', letters: [], syllables: [], toolWords: [], words: [], sentences: [], mathematics: { numbers } }];
  const automatic = mathCatalog(buildSeedProgram('test', weeks), 10, { mode: 'all', selectedWeeks: [] });
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: { schemaVersion: 1, programId: 'test', weeks, mathExercises: definitions } }));
  await page.addInitScript(parent => localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(parent)),
    { ...emptyParentData(), activeWeek: 10, questionCount: 9, activityEnabled: Object.fromEntries(automatic.exercises.map(item => [item.definition.id, false])) });
  await page.goto('/?activity=math');
  await page.getByRole('button', { name: 'JOUER AUX NOMBRES' }).click();
}

for (const width of [320, 375, 390, 430]) {
  for (const length of [3, 5, 7, 10]) test(`missing sequence: ${length} cells on one row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const numbers = Array.from({ length }, (_, i) => 11 + i);
    const missingIndex = length === 3 ? 0 : length === 7 ? length - 1 : Math.floor(length / 2);
    await setup(page, [{ id: 'math:layout', type: 'MISSING_NUMBER', sequence: numbers, missingIndex,
      distractors: numbers.filter(n => n !== numbers[missingIndex]).slice(0, 2) }], numbers);
    const check = async () => {
      const boxes = await page.locator('.math-sequence > *').evaluateAll(elements => elements.map(el => {
        const r = el.getBoundingClientRect(); return { top: r.top, width: r.width, height: r.height, fits: el.scrollWidth <= el.clientWidth + 1 };
      }));
      expect(boxes).toHaveLength(length);
      expect(new Set(boxes.map(box => box.top)).size).toBe(1);
      expect(Math.max(...boxes.map(box => box.width)) - Math.min(...boxes.map(box => box.width))).toBeLessThan(1);
      expect(new Set(boxes.map(box => box.height)).size).toBe(1);
      expect(boxes.every(box => box.fits)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const targets = await page.locator('.math-bank button').evaluateAll(elements => elements.map(el => el.getBoundingClientRect()));
      expect(targets.every(box => box.width >= 44 && box.height >= 44)).toBe(true);
    };
    await check();
    await page.getByRole('button', { name: `Choisir ${numbers[missingIndex]}`, exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Bravo');
    await check();
  });
}

for (const type of ['MISSING_NUMBER', 'HEAR_NUMBER'] as const) {
  const definitions: MathExerciseDefinition[] = [13, 14].map((answer, i) => type === 'HEAR_NUMBER'
    ? { id: `math:timed-${i}`, type, target: answer, distractors: [11, 15] }
    : { id: `math:timed-${i}`, type, sequence: [11, 12, 13, 14, 15], missingIndex: answer - 11, distractors: [11, 15] });
  test(`${type}: retry, 900ms feedback, one advance, final reward stays open`, async ({ page }) => {
    await setup(page, definitions, [11, 12, 13, 14, 15]);
    await page.clock.install(); await page.clock.pauseAt(new Date());
    await page.getByRole('button', { name: 'Choisir 11', exact: true }).click();
    await page.clock.runFor(1200);
    await expect(page.getByRole('region', { name: 'Exercice 1', exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Essaie encore');
    await page.getByRole('button', { name: 'Choisir 13', exact: true }).dblclick();
    await expect(page.getByRole('status')).toContainText('Bravo');
    await expect(page.getByRole('button', { name: 'CONTINUER', exact: true })).toHaveCount(0);
    await page.clock.runFor(899);
    await expect(page.getByRole('region', { name: 'Exercice 1', exact: true })).toBeVisible();
    await page.clock.runFor(1);
    await expect(page.getByRole('region', { name: 'Exercice 2', exact: true })).toBeVisible();
    await page.clock.runFor(2000);
    await expect(page.getByRole('region', { name: 'Exercice 2', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Choisir 14', exact: true }).click();
    await page.clock.runFor(900);
    await expect(page.getByRole('heading', { name: /Bravo/ })).toBeVisible();
    await page.clock.runFor(5000);
    await expect(page.getByRole('heading', { name: /Bravo/ })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!));
    expect(stored.completedSessions).toBe(1);
    expect(stored.eggRewards.completedSessionIds).toHaveLength(1);
  });

  test(`${type}: leaving and restarting cancels pending advance`, async ({ page }) => {
    await setup(page, definitions, [11, 12, 13, 14, 15]);
    await page.clock.install(); await page.clock.pauseAt(new Date());
    await page.getByRole('button', { name: 'Choisir 13', exact: true }).click();
    await page.clock.runFor(400);
    await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
    await page.getByRole('button', { name: /MATHS/ }).click();
    await page.getByRole('button', { name: type === 'MISSING_NUMBER' ? 'NOMBRE MANQUANT' : "J'ÉCOUTE", exact: true }).click();
    await page.clock.runFor(2000);
    await expect(page.getByRole('region', { name: 'Exercice 1', exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.progress.v1')!).completedSessions)).toBe(0);
  });
}

test('Je range waits for manual CONTINUER after the success delay', async ({ page }) => {
  await setup(page, [{ id: 'math:manual', type: 'ORDER_NUMBERS', sequence: [11, 12, 13] }], [11, 12, 13]);
  await page.clock.install(); await page.clock.pauseAt(new Date());
  for (const [i, number] of [11, 12, 13].entries()) {
    await page.getByRole('button', { name: `Choisir ${number}`, exact: true }).click();
    await page.getByRole('button', { name: `Case ${i + 1}`, exact: true }).click();
  }
  await expect(page.getByRole('status')).toContainText('Bravo');
  await expect(page.getByRole('button', { name: 'CONTINUER', exact: true })).toBeDisabled();
  await page.clock.runFor(3000);
  await expect(page.getByRole('region', { name: 'Exercice 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'CONTINUER', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Bravo/ })).toBeVisible();
});

test('replacing exercises with reused IDs cancels the old timer and resets progress', async ({ page }) => {
  await mockSpeech(page);
  await page.route('**/math-component-test', route => route.fulfill({ contentType: 'text/html', body: `
    <div id="root"></div><script type="module">
      import RefreshRuntime from '/MiloApprend/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script><script type="module">
      import React from '/MiloApprend/node_modules/.vite/deps/react.js';
      import ReactDOM from '/MiloApprend/node_modules/.vite/deps/react-dom_client.js';
      import { Mathematics } from '/MiloApprend/src/components/Mathematics.tsx';
      const make = answer => [{ id: 'math:reused', introducedInWeek: 10, type: 'HEAR_NUMBER', answer, choices: [11,13,15], prompt: {text: String(answer)} }];
      function Harness() {
        const [exercises, replace] = React.useState(() => make(13));
        return React.createElement(React.Fragment, null,
          React.createElement('button', {onClick: () => replace(make(15))}, 'Replace session'),
          React.createElement(Mathematics, {exercises, characterId: 'dinosaur', onComplete: () => {window.completions = (window.completions || 0) + 1;}}));
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Harness)));
    </script>` }));
  await page.goto('/math-component-test');
  await expect(page.getByRole('button', { name: 'Choisir 13', exact: true })).toBeVisible();
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.getByRole('button', { name: 'Choisir 13', exact: true }).click();
  // Replace while the old success timer is pending, with the same exercise ID.
  await page.getByRole('button', { name: 'Replace session' }).click();
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: 'Choisir 15', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { completions?: number }).completions ?? 0)).toBe(0);
  await page.getByRole('button', { name: 'Choisir 15', exact: true }).click();
  await page.clock.runFor(900);
  expect(await page.evaluate(() => (window as unknown as { completions?: number }).completions)).toBe(1);
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => (window as unknown as { completions?: number }).completions)).toBe(1);
});
