import { addBlock } from './construction-helpers';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
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
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [i, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${i + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
}
async function tab(page: Page, name: string) { await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name, exact: true }).click(); }
async function openSix(page: Page) {
  await tab(page, 'Programme');
  const back = page.getByRole('button', { name: 'Toutes les semaines', exact: true });
  if (await back.isVisible()) await back.click();
  await page.getByRole('button', { name: 'Ouvrir la semaine 6', exact: true }).click();
}
async function segment(page: Page, id: string) { await addBlock(page, id); }
async function word(page: Page, text: string, ids: string[], literal?: string) {
  await openSix(page); await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click();
  await page.getByLabel('Mot', { exact: true }).fill(text);
  for (const id of ids) await segment(page, id);
  if (literal) {
    await expect(page.getByRole('button', { name: 'Enregistrer le contenu' })).toBeDisabled();
    await addBlock(page, literal, true);
  }
  await expect(page.getByRole('status').filter({ hasText: 'Reconstruction' })).toContainText('✓');
  await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
}
async function exercise(page: Page, text: string) {
  await tab(page, 'Exercices'); await page.getByRole('button', { name: '+ Nouvel exercice' }).click();
  await page.getByLabel('Cible de l’exercice').selectOption({ label: `${text} · semaine 6` });
  await page.getByRole('button', { name: 'Configurer l’exercice' }).click();
}
async function distractors(page: Page) {
  for (const part of ['ra', 're']) await page.getByLabel(`Distracteur ${part.toUpperCase()} (syllable)`, { exact: true }).check();
}
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }

for (const width of [390, 1280]) test(`Programme et Exercices A–G, persistance et partie complète (${width}px)`, async ({ page }) => {
  test.setTimeout(120000);
  await mockSpeech(page); await page.setViewportSize({ width, height: 844 }); await page.goto('/'); await parents(page); await tab(page, 'Programme');
  await page.getByRole('button', { name: '+ Ajouter une semaine' }).click();
  await page.getByLabel('Numéro de semaine').fill('6'); await page.getByLabel('Libellé de la semaine').fill('Nouveautés de Milo');
  await page.getByRole('button', { name: 'Créer la semaine' }).click();
  for (const [type, text] of [['lettre', 'R'], ['syllabe', 'RA'], ['syllabe', 'RE']] as const) {
    if (text !== 'R') await openSix(page);
    await page.getByRole('button', { name: `+ Ajouter une ${type}`, exact: true }).click();
    await page.getByLabel(type === 'lettre' ? 'Lettre' : 'Syllabe', { exact: true }).fill(text);
    await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
  }
  await page.reload(); await parents(page); await openSix(page);
  for (const text of ['R', 'RA', 'RE']) await expect(page.getByRole('article', { name: `Contenu ${text}`, exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Contenu la', exact: true })).toHaveCount(0);
  await word(page, 'LILA', ['syllable-li', 'syllable-la']);
  await tab(page, 'Exercices'); await expect(page.getByRole('article', { name: /^Exercice LILA/ })).toHaveCount(3);
  await page.reload(); await parents(page); await openSix(page);
  await expect(page.getByRole('article', { name: 'Contenu LILA', exact: true })).toBeVisible();
  await word(page, 'LAVAGE', ['syllable-la', 'syllable-va'], 'ge');
  await openSix(page); await expect(page.getByRole('article', { name: 'Contenu ge', exact: true })).toHaveCount(0);
  await exercise(page, 'LILA'); await page.getByLabel('Trouver la (bloc 2)', { exact: true }).check(); await distractors(page);
  await page.getByRole('button', { name: 'Tester la', exact: true }).click();
  await expect(page.getByText('Exercice complété !', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tester le son', exact: true }).click();
  expect(await page.evaluate(() => window.speechProbe.calls.at(-1)?.text)).toBe('LILA');
  await noOverflow(page);
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await page.getByRole('article', { name: 'Exercice LILA variante 1', exact: true }).getByRole('button', { name: 'Dupliquer l’exercice' }).click();
  await page.getByLabel('Trouver li (bloc 1)', { exact: true }).check();
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await expect(page.getByRole('article', { name: /^Exercice LILA/ })).toHaveCount(3);
  await exercise(page, 'LAVAGE'); await expect(page.getByLabel('Trouver ge (bloc 3)', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Trouver la (bloc 1)', { exact: true })).toBeEnabled();
  await page.getByLabel('Trouver va (bloc 2)', { exact: true }).check(); await distractors(page);
  await expect(page.getByText('ge — Texte visible — non appris', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await tab(page, 'Réglages'); await page.getByRole('button', { name: 'Semaine 5', exact: true }).click();
  await tab(page, 'Exercices'); await expect(page.getByRole('article', { name: 'Exercice LILA variante 1', exact: true })).toContainText('Indisponible');
  await tab(page, 'Réglages'); await page.getByRole('button', { name: 'Semaine 6', exact: true }).click();
  await page.reload(); await parents(page); await tab(page, 'Exercices');
  await expect(page.getByRole('article', { name: 'Exercice LAVAGE variante 1', exact: true })).toContainText('Jouable');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/programme-${width}.png`, fullPage: true });
  const saved = parseParentData((await page.evaluate((key) => localStorage.getItem(key), key))!)!;
  expect(saved.customUnits.filter((unit) => unit.type === 'syllable')).toHaveLength(2);
  expect(saved.activities).toHaveLength(3); expect(new Set(saved.activities.map((item) => item.id)).size).toBe(3);
  expect(saved.activities.every((item) => item.segmentationId && !item.segmentation)).toBe(true);
  const service = createContentService(createContentRepository(effectiveProgram(initialProgram, saved)), 6);
  let seed = 1;
  while (seed < 2000 && !generateCompleteWordSession(service, { random: seededRandom(seed) }).challenges.some((challenge) => challenge.word === 'LILA' && challenge.slots.length === 2)) seed++;
  expect(seed).toBeLessThan(2000);
  const session = generateCompleteWordSession(service, { random: seededRandom(seed) }).challenges;
  expect(session).toHaveLength(5); expect(new Set(session.map((item) => item.word)).size).toBe(5);
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.evaluate((seed) => { let state = seed; Math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; }; }, seed);
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  for (const challenge of session) {
    await expect(page.getByRole('button', { name: `Réécouter ${challenge.word}`, exact: true })).toBeVisible();
    for (const slot of challenge.slots) await page.getByRole('button', { name: `Choisir ${slot.expected}`, exact: true }).click();
    await expect(page.getByRole('status')).toContainText(`Bravo ! ${challenge.word}`);
  }
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  await page.getByRole('button', { name: 'REJOUER', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Réécouter/ })).toBeVisible();
});

test('semaines : doublon refusé, suppression vide confirmée et semaine remplie protégée', async ({ page }) => {
  await mockSpeech(page); await page.goto('/'); await parents(page); await tab(page, 'Programme');
  await expect(page.getByRole('button', { name: 'Supprimer la semaine 5', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '+ Ajouter une semaine' }).click();
  await page.getByLabel('Numéro de semaine').fill('5'); await page.getByLabel('Libellé de la semaine').fill('Doublon');
  await page.getByRole('button', { name: 'Créer la semaine' }).click(); await expect(page.getByText('Cette semaine existe déjà.', { exact: true })).toBeVisible();
  await page.getByLabel('Numéro de semaine').fill('6'); await page.getByRole('button', { name: 'Créer la semaine' }).click();
  await page.getByRole('button', { name: 'Toutes les semaines', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss()); await page.getByRole('button', { name: 'Supprimer la semaine 6', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ouvrir la semaine 6', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Supprimer la semaine 6', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ouvrir la semaine 6', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '+ Ajouter une semaine' }).click();
  await page.getByRole('button', { name: 'Créer la semaine' }).click();
  await page.getByRole('button', { name: '+ Ajouter une phrase', exact: true }).click();
  await page.getByLabel('Phrase', { exact: true }).fill('Milo lit.'); await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
  await page.getByRole('button', { name: 'Supprimer la semaine 6', exact: true }).click();
  await expect(page.getByText(/Déplacez ou supprimez ces éléments/)).toBeVisible();
  await page.reload(); await parents(page); await openSix(page);
  await expect(page.getByRole('article', { name: 'Contenu Milo lit.', exact: true })).toBeVisible();
});

test('suppression d’une activité dupliquée conserve le mot et protège le seed', async ({ page }) => {
  await mockSpeech(page); await page.goto('/'); await parents(page); await tab(page, 'Exercices');
  const original = page.getByRole('article', { name: 'Exercice lama variante 1', exact: true });
  await expect(original.getByRole('button', { name: 'Supprimer l’exercice', exact: true })).toHaveCount(0);
  await original.getByRole('button', { name: 'Dupliquer l’exercice', exact: true }).click();
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  const copy = page.getByRole('article', { name: 'Exercice lama variante 3', exact: true });
  await expect(copy).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss()); await copy.getByRole('button', { name: 'Supprimer l’exercice' }).click(); await expect(copy).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept()); await copy.getByRole('button', { name: 'Supprimer l’exercice' }).click(); await expect(page.getByRole('button', { name: 'Supprimer l’exercice', exact: true })).toHaveCount(0);
  await page.reload(); await parents(page); await tab(page, 'Exercices');
  await expect(page.getByRole('article', { name: /^Exercice lama variante/ })).toHaveCount(3);
  await tab(page, 'Programme'); await page.getByRole('button', { name: 'Ouvrir la semaine 3', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Contenu lama', exact: true })).toBeVisible();
});
