import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { addBlock } from './construction-helpers';
import { initialProgram } from '../../src/content/program';
import { emptyParentData, effectiveProgram } from '../../src/parent/model';
import { parseParentData } from '../../src/services/parent-store';
import { createContentService } from '../../src/content/service';
import { createContentRepository } from '../../src/content/repository';
import { generateCompleteWordSession } from '../../src/game/complete-word-session';
import { seededRandom } from '../helpers/random';
const key = 'milo-apprend.parent.v1';
async function parents(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [i, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
}
async function tab(page: Page, name: string) { await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name, exact: true }).click(); }
async function openWeek(page: Page, week = 5) { await tab(page, 'Programme'); await page.getByRole('button', { name: `Ouvrir la semaine ${week}`, exact: true }).click(); }
async function widthCheck(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
for (const width of [390, 1280]) {
  test(`V1.3 automatique, overrides, duplication explicite et contenu seul (${width}px)`, async ({ page }) => {
    test.setTimeout(90000); await mockSpeech(page); await page.setViewportSize({ width, height: 844 }); await page.goto('/'); await parents(page);
    await openWeek(page); await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click();
    await page.getByLabel('Mot', { exact: true }).fill('LAVAGE');
    await addBlock(page, 'syllable-la'); await addBlock(page, 'syllable-va'); await addBlock(page, 'ge', true);
    await page.getByRole('button', { name: 'Enregistrer le contenu' }).click(); await tab(page, 'Exercices');
    const group = page.getByRole('region', { name: 'Exercices du mot LAVAGE', exact: true });
    await expect(group.getByRole('article')).toHaveCount(3); await expect(group).toContainText('Exercices automatiques');
    const multi = group.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Construire le mot', exact: true }) });
    await multi.getByRole('checkbox').uncheck();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).activities.length, key)).toBe(0);
    await page.reload(); await parents(page); await tab(page, 'Exercices'); await expect(multi.getByRole('checkbox')).not.toBeChecked();
    await widthCheck(page); await page.screenshot({ path: `test-results/v13-exercises-${width}.png` });
    await openWeek(page); await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click(); await page.getByLabel('Mot', { exact: true }).fill('LALA');
    await addBlock(page, 'syllable-la'); await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click();
    await expect(page.getByLabel('Contenu appris', { exact: true }).locator('option[value="syllable-la"]')).toHaveCount(0);
    await expect(page.getByLabel('Contenu appris', { exact: true }).locator('option[value="syllable-va"]')).toHaveCount(1);
    await page.getByLabel('Afficher les éléments déjà utilisés').check(); await page.getByLabel('Contenu appris', { exact: true }).selectOption('syllable-la');
    await page.getByRole('button', { name: 'Ajouter ce bloc', exact: true }).click(); await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
    await tab(page, 'Exercices'); await expect(page.getByRole('region', { name: 'Exercices du mot LALA', exact: true }).getByRole('article')).toHaveCount(3);
    await openWeek(page); await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click(); await page.getByLabel('Mot', { exact: true }).fill('SOLEIL');
    await page.getByRole('button', { name: 'Enregistrer le contenu' }).click(); await tab(page, 'Exercices'); await page.getByLabel('Rechercher un exercice').fill('SOLEIL');
    await expect(page.getByText('Aucun exercice automatique : construction non définie.', { exact: true })).toBeVisible();
  });
  test(`V1.3 semaines, vitesse persistante et session complète (${width}px)`, async ({ page }) => {
    test.setTimeout(90000); await mockSpeech(page); await page.setViewportSize({ width, height: 844 }); await page.goto('/'); await parents(page); await tab(page, 'Réglages');
    await expect(page.getByLabel('Révision complète', { exact: true })).toBeChecked(); await page.getByLabel('Semaines sélectionnées', { exact: true }).check();
    await expect(page.getByRole('checkbox', { name: 'Semaine 5', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Rapide', exact: true }).click(); await page.reload(); await parents(page); await tab(page, 'Réglages');
    await expect(page.getByRole('button', { name: 'Rapide', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('checkbox', { name: 'Semaine 5', exact: true })).toBeChecked();
    await page.evaluate(() => { const original = speechSynthesis.speak.bind(speechSynthesis); Object.assign(window, { rates: [] }); speechSynthesis.speak = (u) => { (window as unknown as { rates: number[] }).rates.push(u.rate); original(u); }; });
    await page.getByRole('button', { name: 'Écouter un exemple', exact: true }).click();
    const data = parseParentData((await page.evaluate((key) => localStorage.getItem(key), key))!)!;
    const svc = createContentService(createContentRepository(effectiveProgram(initialProgram, data)), 5, data.exerciseScope);
    const expected = generateCompleteWordSession(svc, { random: seededRandom(13) }).challenges;
    expect(expected).toHaveLength(5); expect(expected.every((item) => item.introducedInWeek === 5)).toBe(true);
    expect(expected.some((item) => item.slots.some((slot) => initialProgram.units.some((u) => u.display === slot.expected && u.introducedInWeek < 5)))).toBe(true);
    await widthCheck(page); await page.screenshot({ path: `test-results/v13-settings-${width}.png` });
    await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
    await page.evaluate(() => { let state = 13; Math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; }; });
    await page.clock.install(); await page.getByRole('button', { name: 'JOUER', exact: true }).click();
    for (const challenge of expected) {
      await expect(page.getByRole('button', { name: `Réécouter ${challenge.word}`, exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Réécouter ${challenge.word}`, exact: true }).click();
      for (const slot of challenge.slots) await page.getByRole('button', { name: `Choisir ${slot.expected}`, exact: true }).click();
      await expect(page.getByRole('status')).toContainText(`Bravo ! ${challenge.word}`); await widthCheck(page); await page.clock.runFor(2100);
    }
    await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { rates: number[] }).rates.every((rate) => rate === 0.78))).toBe(true);
    await page.getByRole('button', { name: 'REJOUER', exact: true }).click(); await expect(page.getByLabel('0 œuf éclos sur 5')).toBeVisible();
  });
  test(`V1.3 phrase sans point, média, aperçu et enfant (${width}px)`, async ({ page }) => {
    test.setTimeout(90000); await mockSpeech(page); await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key, data: { ...emptyParentData(), activeWeek: 6,
      customWeeks: [{ id: 'parent-week-six', number: 6, label: 'Nouvelle phrase' }], exerciseScope: { mode: 'selected-weeks', selectedWeeks: [6] } } });
    await page.goto('/'); await parents(page); await openWeek(page, 6); await page.getByRole('button', { name: '+ Ajouter une phrase', exact: true }).click();
    await page.getByLabel('Phrase', { exact: true }).fill('Il a lu!'); await page.getByLabel('Emoji', { exact: true }).fill('📚');
    for (const id of ['tool-word-Il', 'letter-a', 'syllable-lu']) await addBlock(page, id);
    await expect(page.getByRole('status').filter({ hasText: 'Reconstruction' })).toContainText('Il a lu!');
    await page.getByRole('button', { name: 'Enregistrer le contenu' }).click(); await tab(page, 'Exercices');
    const group = page.getByRole('region', { name: 'Exercices du mot Il a lu!', exact: true }); await expect(group.getByRole('article')).toHaveCount(4);
    await group.getByRole('button', { name: 'Personnaliser l’exercice' }).first().click();
    await expect(page.getByRole('region', { name: 'Aperçu interactif' }).getByRole('img', { name: 'Il a lu!' })).toBeVisible();
    await expect(page.locator('.sentence-line')).toHaveText('? a lu!'); await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    const data = parseParentData((await page.evaluate((key) => localStorage.getItem(key), key))!)!;
    const svc = createContentService(createContentRepository(effectiveProgram(initialProgram, data)), 6, data.exerciseScope);
    const expected = generateCompleteWordSession(svc, { random: () => 0.999 }).challenges;
    expect(expected).toHaveLength(1); await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
    await page.clock.install(); await page.getByRole('button', { name: 'JOUER', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Il a lu!' })).toBeVisible(); await widthCheck(page);
    for (const slot of expected[0].slots) await page.getByRole('button', { name: `Choisir ${slot.expected}`, exact: true }).click();
    await expect(page.locator('.sentence-line')).toHaveText('Il a lu!');
    await page.screenshot({ path: `test-results/v13-sentence-${width}.png` });
    expect(await page.evaluate(() => window.speechProbe.calls.map((call) => call.text))).toEqual(['Il a lu!', 'Il a lu!']);
    await page.clock.runFor(2100); await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  });
}
