import { addBlock } from './construction-helpers';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { legacyData } from './legacy-speech-mock';
import { initialProgram } from '../../src/content/program';
import { createContentRepository } from '../../src/content/repository';
import { createContentService } from '../../src/content/service';
import { effectiveProgram, effectiveWeek, emptyParentData } from '../../src/parent/model';
import { parseParentData } from '../../src/services/parent-store';
import { generateCompleteWordSession } from '../../src/game/complete-word-session';
import { seededRandom } from '../helpers/random';
import { sentenceActivity } from '../fixtures/sentence-activity';

const key = 'milo-apprend.parent.v1';
async function enterParents(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  await solveGate(page);
}
async function solveGate(page: Page) {
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [index, name] of prompt.split(' — ').entries()) await page.getByLabel(`Chiffre ${index + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Sections parents' })).toBeVisible();
}
async function section(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name, exact: true }).click();
}
async function addMaman(page: Page) {
  await section(page, 'Programme');
  await page.getByRole('button', { name: 'Ouvrir la semaine 5', exact: true }).click();
  await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click();
  await page.getByLabel('Mot', { exact: true }).fill('maman');
  await page.getByLabel('Emoji', { exact: true }).fill('👩');
  for (const id of ['syllable-ma', 'syllable-ma', 'letter-n']) {
    await addBlock(page, id);
  }
  await page.getByRole('button', { name: 'Enregistrer le contenu' }).click();
  await section(page, 'Exercices');
  await page.getByRole('button', { name: '+ Nouvel exercice' }).click();
  await page.getByLabel('Cible de l’exercice').selectOption({ label: 'maman · semaine 5' });
  await page.getByRole('button', { name: 'Configurer l’exercice' }).click();
  await expect(page.getByRole('button', { name: 'Sauvegarder l’exercice' })).toBeDisabled();
  await page.getByLabel('Trouver ma (bloc 1)', { exact: true }).check();
  await page.getByLabel('Trouver ma (bloc 2)', { exact: true }).check();
  await page.getByLabel('Distracteur li (syllable)', { exact: true }).check();
  await page.getByLabel('Distracteur mu (syllable)', { exact: true }).check();
  await page.getByRole('button', { name: 'Tester ma', exact: true }).click();
  await page.getByRole('button', { name: 'Tester ma', exact: true }).click();
  await expect(page.getByText('Exercice complété !', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await expect(page.getByRole('article', { name: 'Exercice maman variante 1' })).toBeVisible();
}

test.beforeEach(async ({ page }) => { await mockSpeech(page); });

test('gate, quatre sections, semaine et activations changent immédiatement les parties', async ({ page }) => {
  await page.addInitScript((data) => { if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)); }, legacyData);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  for (let i = 1; i <= 3; i++) await page.getByLabel(`Chiffre ${i}`, { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await expect(page.getByText('Essaie avec ces nouveaux chiffres.')).toBeVisible();
  await expect(page.getByLabel('Chiffre 1', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await enterParents(page);
  await expect(page.locator('dl > div').filter({ hasText: 'Mots jouables' }).locator('dd')).toHaveText('20');
  await expect(page.locator('dl > div').filter({ hasText: 'Variantes d’exercices' }).locator('dd')).toHaveText('22');
  await section(page, 'Réglages');
  await page.getByRole('button', { name: 'Semaine 3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Semaine 3' })).toHaveAttribute('aria-pressed', 'true');
  await section(page, 'Programme');
  await page.getByRole('button', { name: 'Ouvrir la semaine 3', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Activer lama', exact: true }).uncheck();
  await section(page, 'Exercices');
  await expect(page.getByRole('article', { name: 'Exercice lama variante 2' })).toContainText('Indisponible');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.getByText('1 petits défis avec ton ami dino')).toBeVisible();
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Réécouter ami' })).toBeVisible();
  await page.getByRole('button', { name: 'Choisir a', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bravo Milo !' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.progress-pill')).toContainText('1 aventure terminée');
  await enterParents(page);
  await section(page, 'Réglages');
  await expect(page.getByRole('button', { name: 'Semaine 3' })).toHaveAttribute('aria-pressed', 'true');
  await section(page, 'Exercices');
  await page.getByRole('checkbox', { name: 'Activer l’exercice ami variante 1', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeDisabled();
});

test('édition LAMA, aperçu multi-case et désactivation persistante sans doublon', async ({ page }) => {
  await page.goto('/'); await enterParents(page); await section(page, 'Exercices');
  const first = page.getByRole('article', { name: 'Exercice lama variante 1', exact: true });
  await first.getByRole('button', { name: 'Modifier l’exercice' }).click();
  await page.getByLabel('Trouver ma (bloc 2)', { exact: true }).check();
  const preview = page.getByRole('region', { name: 'Aperçu interactif' });
  await preview.getByRole('button', { name: 'Case aperçu 2' }).click();
  await preview.getByRole('button', { name: 'Tester la', exact: true }).click();
  await expect(preview.getByRole('status')).toContainText('ne correspond pas');
  await preview.getByRole('button', { name: 'Tester ma', exact: true }).click();
  await preview.getByRole('button', { name: 'Tester la', exact: true }).click();
  await expect(preview.getByRole('status')).toHaveText('Exercice complété !');
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await first.getByRole('checkbox').uncheck();
  await page.reload(); await enterParents(page); await section(page, 'Exercices');
  await expect(first).toContainText('Parties à trouver : la + ma');
  await expect(first.getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByRole('article', { name: /^Exercice lama variante/ })).toHaveCount(4);
  await page.screenshot({ path: 'test-results/parent-exercises.png', fullPage: true });
});

test('créer un mot, sauvegarder, refresh, jouer son activité et reset sans effacer la progression', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('milo-apprend.progress.v1', '{"completedSessions":7}'));
  await page.reload(); await enterParents(page); await addMaman(page);
  const raw = await page.evaluate((key) => localStorage.getItem(key), key);
  const saved = parseParentData(raw!);
  expect(saved?.customUnits[0].audioText).toBe('maman');
  await page.reload(); await enterParents(page);
  await section(page, 'Aperçu');
  await expect(page.locator('dl > div').filter({ hasText: 'Mots jouables' }).locator('dd')).toHaveText('21');
  await expect(page.locator('dl > div').filter({ hasText: 'Variantes d’exercices' }).locator('dd')).toHaveText('103');
  await section(page, 'Programme');
  await page.getByRole('button', { name: 'Ouvrir la semaine 5', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Contenu maman', exact: true })).toContainText('Parent / personnalisé');
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  if (!saved) throw new Error('Sauvegarde manquante');
  const service = createContentService(createContentRepository(effectiveProgram(initialProgram, saved)), effectiveWeek(initialProgram, saved, 5));
  let seed = 1;
  while (seed < 2000 && generateCompleteWordSession(service, { random: seededRandom(seed) }).challenges[0].id !== saved.activities[0].id) seed++;
  expect(seed).toBeLessThan(2000);
  await page.evaluate((seed) => { let state = seed; Math.random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; }; }, seed);
  await page.getByRole('button', { name: 'JOUER', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Réécouter maman' })).toBeVisible();
  await page.getByRole('button', { name: 'Choisir ma', exact: true }).click();
  await page.getByRole('button', { name: 'Choisir ma', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Bravo ! maman');
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await enterParents(page); await section(page, 'Réglages');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Réinitialiser les personnalisations' }).click();
  expect(parseParentData((await page.evaluate((key) => localStorage.getItem(key), key))!)?.customUnits.length).toBe(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Réinitialiser les personnalisations' }).click();
  await section(page, 'Aperçu');
  await expect(page.locator('dl > div').filter({ hasText: 'Mots jouables' }).locator('dd')).toHaveText('20');
  await expect(page.locator('dl > div').filter({ hasText: 'Variantes d’exercices' }).locator('dd')).toHaveText('98');
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.locator('.progress-pill')).toContainText('7 aventures terminées');
  await page.reload(); await expect(page.locator('.progress-pill')).toContainText('7 aventures terminées');
});

test('suppression confirmée des seuls mots créés par le parent', async ({ page }) => {
  await page.goto('/'); await enterParents(page); await addMaman(page); await section(page, 'Programme');
  await page.getByRole('button', { name: 'Ouvrir la semaine 5', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Supprimer menu', exact: true })).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Supprimer maman', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Contenu maman', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Supprimer maman', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Contenu maman', exact: true })).toHaveCount(0);
  await page.reload(); await enterParents(page); await section(page, 'Exercices');
  await expect(page.getByRole('article', { name: 'Exercice maman variante 1' })).toHaveCount(0);
});

test('stockage refusé : message explicite et choix en mémoire utilisables par le jeu', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Indisponible'); }; });
  await page.goto('/'); await enterParents(page); await section(page, 'Réglages');
  await page.getByRole('button', { name: 'Semaine 2', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sauvegarde locale indisponible');
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeDisabled();
  await page.reload(); await expect(page.getByRole('button', { name: 'JOUER', exact: true })).toBeEnabled();
});

test('éditeur mobile : aucun segment futur, littéral visible uniquement et validation bloquante', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/'); await enterParents(page); await section(page, 'Programme');
  await page.getByRole('button', { name: 'Ouvrir la semaine 3', exact: true }).click();
  await page.getByRole('button', { name: '+ Ajouter un mot', exact: true }).click();
  await page.getByLabel('Mot', { exact: true }).fill('maman');
  await page.getByLabel('Semaine d’introduction').selectOption('3');
  await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click();
  await expect(page.getByLabel('Contenu appris', { exact: true }).locator('option[value="letter-n"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler le bloc', exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await addBlock(page, 'syllable-ma');
  }
  await expect(page.getByRole('button', { name: 'Enregistrer le contenu' })).toBeDisabled();
  await addBlock(page, 'n', true);
  await expect(page.getByRole('button', { name: 'Enregistrer le contenu' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/parent-editor-mobile.png', fullPage: true });
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Éditeur de contenu' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Contenu maman', exact: true })).toHaveCount(0);
});

test('une activité Sentence utilise le même éditeur et rejoint les sessions enfant', async ({ page }) => {
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key, data: { ...emptyParentData(), activities: [sentenceActivity] } });
  await page.goto('/'); await enterParents(page); await section(page, 'Exercices');
  const article = page.getByRole('article', { name: 'Exercice Il a lu. variante 1', exact: true });
  await expect(article).toContainText('Phrase');
  await article.getByRole('button', { name: 'Modifier l’exercice' }).click();
  await expect(page.getByLabel('Trouver Il (bloc 1)', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Trouver lu (bloc 5)', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Tester Il', exact: true }).click();
  await page.getByRole('button', { name: 'Tester lu', exact: true }).click();
  await expect(page.getByText('Exercice complété !', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sauvegarder l’exercice' }).click();
  await section(page, 'Aperçu');
  await expect(page.locator('dl > div').filter({ hasText: 'Variantes d’exercices' }).locator('dd')).toHaveText('99');
});
