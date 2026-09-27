import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { addBlock } from './construction-helpers';
import { initialProgram } from '../../src/content/program';
import { effectiveProgram } from '../../src/parent/model';
import { parseParentData } from '../../src/services/parent-store';
import { createContentRepository } from '../../src/content/repository';
import { createContentService } from '../../src/content/service';
import { generateCompleteWordSession } from '../../src/game/complete-word-session';
import { seededRandom } from '../helpers/random';
const key = 'milo-apprend.parent.v1';
async function parents(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  for (let i = 1; i <= 3; i++) await page.getByLabel(`Chiffre ${i}`, { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
}
async function tab(page: Page, name: string) { await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name, exact: true }).click(); }
async function openFive(page: Page) {
  await tab(page, 'Programme'); const back = page.getByRole('button', { name: 'Toutes les semaines', exact: true });
  if (await back.isVisible()) await back.click(); await page.getByRole('button', { name: 'Ouvrir la semaine 5', exact: true }).click();
}
async function exercise(page: Page, id: string) {
  await tab(page, 'Exercices'); await page.getByRole('button', { name: '+ Nouvel exercice', exact: true }).click();
  await page.getByLabel('Cible de l’exercice', { exact: true }).selectOption(id);
}
async function stored(page: Page) { return parseParentData((await page.evaluate((key) => localStorage.getItem(key), key))!)!; }
async function widthCheck(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }

for (const width of [390, 1280]) test(`V1.2 blocs, construction facultative et phrase jouable (${width}px)`, async ({ page }) => {
  test.setTimeout(120000); page.setDefaultTimeout(10000); await mockSpeech(page); await page.setViewportSize({ width, height: 844 }); await page.goto('/'); await parents(page);
  await openFive(page); await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click();
  await page.getByLabel('Mot', { exact: true }).fill('LAVAGE');
  for (const id of ['syllable-la', 'syllable-va']) await addBlock(page, id);
  await expect(page.getByRole('alert').locator('li')).toHaveCount(1);
  await addBlock(page, 'ge', true); await expect(page.getByRole('status').filter({ hasText: 'Reconstruction' })).toHaveText('Reconstruction : lavage ✓');
  await expect(page.getByText(/découpage/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Retirer le bloc 2', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Construction incomplète');
  await addBlock(page, 'syllable-va'); await page.getByRole('button', { name: 'Monter le bloc 3', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Monter le bloc 2', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Construction incomplète');
  await page.getByRole('button', { name: 'Descendre le bloc 1', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier le bloc 3', exact: true }).click();
  await page.getByLabel('Texte visible', { exact: true }).fill('ga'); await page.getByRole('button', { name: 'Appliquer au bloc', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Construction incomplète');
  await page.getByRole('button', { name: 'Modifier le bloc 3', exact: true }).click();
  await page.getByLabel('Texte visible', { exact: true }).fill('ge'); await page.getByRole('button', { name: 'Appliquer au bloc', exact: true }).click();
  await widthCheck(page); await page.screenshot({ path: `test-results/construction-${width}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
  await page.reload(); await parents(page); await openFive(page);
  await expect(page.getByRole('article', { name: 'Contenu LAVAGE', exact: true })).toContainText('Construction définie');
  await page.getByRole('button', { name: 'Modifier LAVAGE', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Reconstruction' })).toHaveText('Reconstruction : lavage ✓');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await openFive(page); await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click(); await page.getByLabel('Mot', { exact: true }).fill('SOLEIL');
  await page.getByRole('button', { name: 'Enregistrer le contenu' }).click(); await openFive(page);
  await expect(page.getByRole('article', { name: 'Contenu SOLEIL', exact: true })).toContainText('Aucune construction');
  let data = await stored(page); const soleil = data.customUnits.find((unit) => unit.display === 'SOLEIL')!;
  await exercise(page, soleil.id); await expect(page.getByText("Ce mot n'a pas encore de construction.", { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Définir la construction', exact: true }).click();
  await addBlock(page, 'solei', true); await addBlock(page, 'letter-l'); await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
  await expect(page.getByRole('region', { name: 'Éditeur d’exercice' })).toBeVisible();
  await page.getByLabel('Trouver l (bloc 2)', { exact: true }).check(); await page.getByLabel('Distracteur a (letter)', { exact: true }).check();
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await openFive(page); await page.getByRole('button', { name: '+ Ajouter une phrase', exact: true }).click();
  await page.getByLabel('Phrase', { exact: true }).fill('Milo a vu la lune.'); await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
  data = await stored(page); const noConstruction = data.customUnits.find((unit) => unit.display === 'Milo a vu la lune.')!;
  await exercise(page, noConstruction.id); await expect(page.getByText("Cette phrase n'a pas encore de construction.", { exact: true })).toBeVisible();
  await page.getByLabel('Cible de l’exercice', { exact: true }).selectOption('sentence-il-a-lu');
  await page.getByRole('button', { name: 'Définir la construction', exact: true }).click();
  for (const id of ['tool-word-Il', 'letter-a', 'syllable-lu']) await addBlock(page, id);
  await addBlock(page, '.', true);
  await expect(page.getByRole('status').filter({ hasText: 'Reconstruction' })).toHaveText('Reconstruction : Il a lu. ✓');
  await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
  await page.getByLabel('Trouver lu (bloc 3)', { exact: true }).check();
  await expect(page.getByLabel('Trouver . (bloc 4)', { exact: true })).toBeDisabled();
  await page.getByLabel('Distracteur ma (syllable)', { exact: true }).check();
  const preview = page.getByRole('region', { name: 'Aperçu interactif' });
  await expect(preview.locator('.sentence-line')).toHaveText('Il a ?.');
  await preview.getByRole('button', { name: 'Tester le son', exact: true }).click();
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.text)).toBe('Il a lu.');
  await preview.getByRole('button', { name: 'Tester lu', exact: true }).click(); await expect(preview.getByRole('status')).toHaveText('Exercice complété !');
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await page.getByRole('article', { name: 'Exercice Il a lu. variante 1', exact: true }).getByRole('button', { name: 'Dupliquer l’exercice' }).click();
  await page.getByLabel('Trouver a (bloc 2)', { exact: true }).check(); await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await page.reload(); await parents(page); await tab(page, 'Exercices');
  await expect(page.getByRole('article', { name: /^Exercice Il a lu. variante/ })).toHaveCount(5);
  data = await stored(page); expect(data.constructions?.['sentence-il-a-lu'][0].gaps).toEqual(['', ' ', ' ', '', '']);
  const service = createContentService(createContentRepository(effectiveProgram(initialProgram, data)), 5);
  const second = data.activities.find((item) => item.targetId === 'sentence-il-a-lu' && item.missingSegmentIndexes?.length === 2)!;
  let seed = 1;
  while (seed < 10000 && generateCompleteWordSession(service, { random: seededRandom(seed) }).challenges[0].id !== second.id) seed++;
  expect(seed).toBeLessThan(10000); const session = generateCompleteWordSession(service, { random: seededRandom(seed) }).challenges;
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.evaluate((seed) => { let state = seed; Math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; }; }, seed);
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Complète la phrase', exact: true })).toBeVisible();
  await expect(page.locator('.sentence-line')).toHaveText('Il ? ?.'); await widthCheck(page);
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.text)).toBe('Il a lu.');
  await page.getByRole('button', { name: 'Choisir ma', exact: true }).click();
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.text)).toBe('Il a lu.');
  await page.getByRole('button', { name: 'Réécouter Il a lu.', exact: true }).click();
  await page.getByRole('button', { name: 'Choisir a', exact: true }).click();
  await expect(page.getByRole('status')).not.toContainText('Bravo');
  await page.screenshot({ path: `test-results/sentence-${width}.png` });
  await page.getByRole('button', { name: 'Choisir lu', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Bravo ! Il a lu.');
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.text)).toBe('Il a lu.');
  for (const challenge of session.slice(1)) {
    await expect(page.getByRole('button', { name: `Réécouter ${challenge.word}`, exact: true })).toBeVisible();
    for (const slot of challenge.slots) await page.getByRole('button', { name: `Choisir ${slot.expected}`, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  await page.getByRole('button', { name: 'REJOUER', exact: true }).click(); await expect(page.getByRole('button', { name: /^Réécouter/ })).toBeVisible();
});

for (const mode of ['tactile', 'souris', 'clavier', 'simple'] as const) test(`phrase enfant : ${mode}, correction et audio complet`, async ({ page }) => {
  await mockSpeech(page); await page.setViewportSize({ width: mode === 'souris' ? 1280 : 390, height: 844 });
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key, data: {
    version: 2, activeWeek: 6, customWeeks: [{ id: 'parent-week-six', number: 6, label: 'Phrase isolée' }], exerciseScope: { mode: 'selected-weeks', selectedWeeks: [6] }, activityEnabled: {},
    unitEnabled: Object.fromEntries(initialProgram.units.filter((unit) => unit.type === 'word').map((unit) => [unit.id, false])),
    customUnits: [{ id: 'parent-sentence-test', type: 'sentence', display: 'Il a lu.', audioText: 'Il a lu.', introducedInWeek: 6, enabled: true, tags: ['practice'],
      segmentations: [{ id: 'main', segments: [{ unitId: 'tool-word-Il' }, { unitId: 'letter-a' }, { unitId: 'syllable-lu' }, { literal: '.', note: 'Visible' }], gaps: ['', ' ', ' ', '', ''], surface: ['Il', 'a', 'lu', '.'] }] }],
    activities: [{ id: 'parent-activity-test', type: 'complete-segments', targetId: 'parent-sentence-test', segmentationId: 'main', missingSegmentIndexes: mode === 'simple' ? [2] : [1, 2], distractorUnitIds: ['syllable-ma'] }],
  } });
  await page.goto('/'); await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Complète la phrase' })).toBeVisible(); await widthCheck(page);
  const choice = page.getByRole('button', { name: 'Choisir lu', exact: true });
  if (mode === 'tactile' || mode === 'souris') {
    const destination = page.getByRole('button', { name: 'Case 3 à compléter', exact: true });
    await choice.scrollIntoViewIfNeeded(); const from = (await choice.boundingBox())!, to = (await destination.boundingBox())!;
    const x = from.x + from.width / 2, y = from.y + from.height / 2, tx = to.x + to.width / 2, ty = to.y + to.height / 2;
    if (mode === 'tactile') {
      const cdp = await page.context().newCDPSession(page); const scroll = await page.evaluate(() => scrollY);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty }] });
      expect(await page.evaluate(() => scrollY)).toBe(scroll);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 8 }); await page.mouse.up(); }
  } else if (mode === 'clavier') {
    await page.getByRole('button', { name: 'Case 3 à compléter', exact: true }).focus(); await page.keyboard.press('Enter');
    await choice.focus(); await page.keyboard.press('Space');
  } else {
    await page.getByRole('button', { name: 'Choisir ma', exact: true }).click(); await choice.click();
  }
  if (mode !== 'simple') {
    await expect(page.getByRole('status')).not.toContainText('Bravo');
    expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(['Il a lu.']);
    await page.getByRole('button', { name: 'Choisir ma', exact: true }).click();
    await page.getByRole('button', { name: 'Couper le son', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Réécouter Il a lu.', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Activer le son', exact: true }).click();
    await page.getByRole('button', { name: 'Réécouter Il a lu.', exact: true }).click();
    await page.getByRole('button', { name: 'Choisir a', exact: true }).click();
  }
  await expect(page.getByRole('status')).toContainText('Bravo ! Il a lu.');
  await expect(page.locator('.sentence-line')).toHaveText('Il a lu.');
  const calls = await page.evaluate(() => window.speechProbe.calls.map((call) => call.text));
  expect(calls).toHaveLength(mode === 'simple' ? 3 : 4); expect(calls.every((text) => text === 'Il a lu.')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
});
