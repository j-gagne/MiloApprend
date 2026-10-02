import { test, expect, type Page } from '@playwright/test';
import { emptyParentData } from '../../src/parent/model';
import type { ParentData } from '../../src/parent/model';
import { mockSpeech } from './speech-mock';

const key = 'milo-apprend.parent.v1';
const remote = { schemaVersion: 1, programId: 'parent-reading-test', weeks: [
  { number: 1, label: '1', letters: ['m', 'a'], syllables: ['ma', 'sa', 'va', 'ne'], toolWords: [], sentences: [],
    words: [{ id: 'word-savane', display: 'savane', segmentations: [{ id: 'parts',
      segments: ['sa', 'va', 'ne'].map(text => ({ unitId: `syllable-${text}` })) }] }],
  },
], readingExercises: [
      { id: 'reading-w3-m-a-ma', displayedUnits: [{ unitId: 'letter-m' }, { unitId: 'letter-a' }, { unitId: 'syllable-ma' }] },
      { id: 'reading:segmented', targetId: 'word-savane', displayedUnits: [
        { unitId: 'word-savane', segmentUnitIds: ['syllable-sa', 'syllable-va', 'syllable-ne'] }] },
    ] };

async function parents(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const prompt = await page.getByTestId('gate-prompt').innerText();
  for (const [index, name] of prompt.split(' — ').entries()) {
    await page.getByLabel(`Chiffre ${index + 1}`, { exact: true }).fill(String(names.indexOf(name) + 1));
  }
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name: 'Exercices', exact: true }).click();
}

test('Parent pages toggle independently, persist across navigation/reload and control new child sessions', async ({ page }) => {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: remote }));
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, { key, data: { ...emptyParentData(), activeWeek: 1, questionCount: 3 } });
  await page.goto('/');
  await parents(page);
  const tabs = page.getByRole('navigation', { name: 'Types d’exercices' });
  const complete = tabs.getByRole('button', { name: 'COMPLÈTE', exact: true });
  const reading = tabs.getByRole('button', { name: 'JE LIS', exact: true });
  const section = page.getByRole('region', { name: 'Exercices Je lis', exact: true });
  const completeExercises = page.getByRole('region', { name: 'Exercices du mot savane', exact: true });
  await expect(complete).toHaveAttribute('aria-current', 'page');
  await expect(section).toBeHidden();
  await expect(page.getByRole('article', { name: /^Je lis :/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ Nouvel exercice', exact: true })).toBeVisible();
  const originalExercises = await completeExercises.innerText();
  await reading.click();
  await expect(reading).toHaveAttribute('aria-current', 'page');
  await expect(completeExercises).toBeHidden();
  await expect(page.getByRole('button', { name: '+ Nouvel exercice', exact: true })).toBeHidden();
  await expect(section.getByRole('article')).toHaveCount(3);
  await expect(section.getByRole('article', { name: 'Je lis : m | a | ma', exact: true })).toHaveCount(1);
  const segmented = section.getByRole('checkbox', { name: 'Activer la page savane — sa + va + ne', exact: true });
  const whole = section.getByRole('checkbox', { name: 'Activer la page savane — savane', exact: true });
  await segmented.uncheck();
  await expect(whole).toBeChecked();
  await complete.click();
  await expect(section).toBeHidden();
  await expect(completeExercises).toHaveText(originalExercises, { useInnerText: true });
  await expect(page.getByRole('button', { name: '+ Nouvel exercice', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name: 'Programme', exact: true }).click();
  await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name: 'Exercices', exact: true }).click();
  await expect(complete).toHaveAttribute('aria-current', 'page');
  await reading.click();
  await expect(segmented).not.toBeChecked();
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.reload();
  await parents(page);
  await expect(complete).toHaveAttribute('aria-current', 'page');
  await reading.click();
  await expect(segmented).not.toBeChecked();
  await whole.uncheck();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(saved.activityEnabled).toEqual({ 'reading:segmented': false, 'reading:whole:word-savane': false });
  expect(saved.unitEnabled).toEqual({});
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'COMPLÈTE', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  await expect(page.locator('.reading-dot')).toHaveCount(1);
  await expect(page.locator('.reading-text')).toHaveText(['m', 'a', 'ma']);
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await parents(page);
  await reading.click();
  await whole.check();
  await segmented.check();
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  await expect(page.locator('.reading-dot')).toHaveCount(3);
});

test('Parent creates whole, segmented and multi-unit pages from shared content and keeps them after reload', async ({ page }) => {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: { ...remote,
    readingExercises: [] } }));
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, { key, data: { ...emptyParentData(), activeWeek: 1, questionCount: 9 } });
  await page.goto('/');
  await parents(page);
  await page.getByRole('navigation', { name: 'Types d’exercices' }).getByRole('button', { name: 'JE LIS' }).click();
  const section = page.getByRole('region', { name: 'Exercices Je lis', exact: true });
  const creator = page.getByRole('form', { name: 'Nouvel exercice Je lis' });
  const open = () => section.getByRole('button', { name: '+ Ajouter un exercice', exact: true }).click();
  const save = () => creator.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const saved = () => page.evaluate<ParentData, string>(key => JSON.parse(localStorage.getItem(key)!), key);

  await open();
  await expect(creator).toBeVisible();
  await expect(creator.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled();
  await creator.getByRole('button', { name: 'Annuler', exact: true }).click();
  expect((await saved()).readingExercises).toBeUndefined();
  await open();
  await creator.getByLabel('Contenu affiché 1', { exact: true }).selectOption('word-savane');
  await page.evaluate(key => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (storageKey, value) {
      if (storageKey === key) {
        Storage.prototype.setItem = setItem;
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return setItem.call(this, storageKey, value);
    };
  }, key);
  await save();
  await expect(creator.getByRole('alert')).toContainText('Sauvegarde impossible');
  await expect(creator.getByLabel('Contenu affiché 1', { exact: true })).toHaveValue('word-savane');
  expect((await saved()).readingExercises).toBeUndefined();
  await save();
  await expect(creator).toBeHidden();
  const custom = section.getByRole('article').filter({ hasText: 'Personnalisé' });
  await expect(custom).toHaveCount(1);
  await expect(custom.getByRole('checkbox')).toBeChecked();

  await open();
  await creator.getByLabel('Contenu affiché 1', { exact: true }).selectOption('word-savane');
  await creator.getByLabel('Prononciation du contenu 1', { exact: true }).selectOption('segments');
  await creator.getByLabel('Morceau 1 du contenu 1', { exact: true }).selectOption('syllable-sa');
  await expect(creator.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled();
  for (const [index, id] of ['syllable-va', 'syllable-ne'].entries()) {
    await creator.getByRole('button', { name: '+ Ajouter un morceau', exact: true }).click();
    await creator.getByLabel(`Morceau ${index + 2} du contenu 1`, { exact: true }).selectOption(id);
  }
  await save();
  await expect(custom).toHaveCount(2);

  await open();
  await creator.getByLabel('Contenu affiché 1', { exact: true }).selectOption('letter-a');
  await creator.getByRole('button', { name: '+ Ajouter un contenu', exact: true }).click();
  await creator.getByLabel('Contenu affiché 2', { exact: true }).selectOption('letter-m');
  await creator.getByRole('button', { name: 'Déplacer le contenu 2 à gauche', exact: true }).click();
  await expect(creator.getByLabel('Contenu affiché 1', { exact: true })).toHaveValue('letter-m');
  await creator.getByRole('button', { name: '+ Ajouter un contenu', exact: true }).click();
  await creator.getByLabel('Contenu affiché 3', { exact: true }).selectOption('syllable-ma');
  await creator.getByRole('button', { name: '+ Ajouter un contenu', exact: true }).click();
  await creator.getByRole('button', { name: 'Retirer le contenu 4', exact: true }).click();
  await save();
  const multi = section.getByRole('article', { name: 'Je lis : m | a | ma', exact: true });
  await expect(multi).toHaveCount(1);
  await expect(multi.getByRole('checkbox')).toBeChecked();
  await expect(section.getByRole('article').filter({ hasText: 'Automatique' })).toHaveCount(1);
  const before = await saved();
  expect(before.customUnits).toEqual([]);
  expect(before.readingExercises).toHaveLength(3);
  expect(new Set(before.readingExercises!.map(exercise => exercise.id)).size).toBe(3);
  expect(before.readingExercises!.every(exercise => exercise.id.startsWith('reading:parent-activity-') && exercise.enabled)).toBe(true);
  expect(before.readingExercises!.map(exercise => exercise.displayedUnits)).toEqual([
    [{ unitId: 'word-savane' }],
    [{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa', 'syllable-va', 'syllable-ne'] }],
    [{ unitId: 'letter-m' }, { unitId: 'letter-a' }, { unitId: 'syllable-ma' }],
  ]);
  await multi.getByRole('checkbox').uncheck();
  expect((await saved()).unitEnabled).toEqual({});
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.reload();
  await parents(page);
  await page.getByRole('navigation', { name: 'Types d’exercices' }).getByRole('button', { name: 'JE LIS' }).click();
  await expect(custom).toHaveCount(3);
  await expect(multi.getByRole('checkbox')).not.toBeChecked();
  expect((await saved()).readingExercises).toEqual(before.readingExercises);
  await multi.getByRole('checkbox').check();
  // Leave only the multi-unit page enabled to verify it renders as one child page.
  for (const card of await section.getByRole('article', { name: 'Je lis : savane', exact: true }).all()) {
    await card.getByRole('checkbox').uncheck();
  }
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  await expect(page.locator('.reading-dot')).toHaveCount(1);
  await expect(page.locator('.reading-text')).toHaveText(['m', 'a', 'ma']);
});

test('only custom pages can be edited in the shared creator, cancelled and deleted without changing content', async ({ page }) => {
  await mockSpeech(page);
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: remote }));
  const multiId = 'reading:parent-activity-edit-multi';
  const wordId = 'reading:parent-activity-edit-word';
  const initial: ParentData = { ...emptyParentData(), activeWeek: 1, readingExercises: [
    { id: multiId, enabled: true, displayedUnits: [{ unitId: 'letter-m' }, { unitId: 'letter-a' }, { unitId: 'syllable-ma' }] },
    { id: wordId, enabled: true, displayedUnits: [{ unitId: 'word-savane' }] },
  ], activityEnabled: { [multiId]: false, [wordId]: true } };
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, { key, data: initial });
  await page.goto('/');
  await parents(page);
  const readingTab = page.getByRole('navigation', { name: 'Types d’exercices' }).getByRole('button', { name: 'JE LIS' });
  await readingTab.click();
  const section = page.getByRole('region', { name: 'Exercices Je lis', exact: true });
  const custom = section.getByRole('article').filter({ hasText: 'Personnalisé' });
  const multi = custom.filter({ has: page.getByRole('heading', { name: 'm | a | ma', exact: true }) });
  const word = custom.filter({ has: page.getByRole('heading', { name: 'savane', exact: true }) });
  const editor = page.getByRole('form', { name: 'Modifier un exercice Je lis' });
  const saved = () => page.evaluate<ParentData, string>(key => JSON.parse(localStorage.getItem(key)!), key);
  await expect(custom.getByRole('button', { name: 'Modifier', exact: true })).toHaveCount(2);
  await expect(section.getByRole('article').filter({ hasText: 'Programme' })).toHaveCount(2);
  await expect(section.getByRole('article').filter({ hasText: 'Automatique' })).toHaveCount(1);
  await expect(section.getByRole('article').filter({ hasText: 'Automatique' }).getByRole('button')).toHaveCount(0);
  await expect(section.getByRole('article').filter({ hasText: 'Programme' }).getByRole('button')).toHaveCount(0);
  await multi.getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(editor.getByLabel('Contenu affiché 1', { exact: true })).toBeFocused();
  await expect(editor.getByLabel('Contenu affiché 1', { exact: true })).toHaveValue('letter-m');
  await expect(editor.getByLabel('Contenu affiché 2', { exact: true })).toHaveValue('letter-a');
  await expect(editor.getByLabel('Contenu affiché 3', { exact: true })).toHaveValue('syllable-ma');
  await expect(editor.getByLabel('Prononciation du contenu 1', { exact: true })).toHaveValue('whole');
  await editor.getByRole('button', { name: 'Retirer le contenu 2', exact: true }).click();
  expect(await saved()).toEqual(initial);
  await editor.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(multi).toHaveCount(1);
  expect(await saved()).toEqual(initial);

  await multi.getByRole('button', { name: 'Modifier', exact: true }).click();
  await editor.getByRole('button', { name: 'Retirer le contenu 2', exact: true }).click();
  await editor.getByLabel('Contenu affiché 1', { exact: true }).selectOption('letter-a');
  await editor.getByRole('button', { name: '+ Ajouter un contenu', exact: true }).click();
  await expect(editor.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled();
  await editor.getByLabel('Contenu affiché 3', { exact: true }).selectOption('syllable-sa');
  await editor.getByRole('button', { name: 'Déplacer le contenu 3 à gauche', exact: true }).click();
  await editor.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(editor).toBeHidden();
  const changedMulti = custom.filter({ has: page.getByRole('heading', { name: 'a | sa | ma', exact: true }) });
  await expect(changedMulti).toHaveCount(1);
  await expect(changedMulti.getByRole('checkbox')).not.toBeChecked();

  await word.getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(editor.getByLabel('Contenu affiché 1', { exact: true })).toHaveValue('word-savane');
  await editor.getByLabel('Prononciation du contenu 1', { exact: true }).selectOption('segments');
  for (const [index, id] of ['syllable-sa', 'syllable-va', 'syllable-ne'].entries()) {
    if (index) await editor.getByRole('button', { name: '+ Ajouter un morceau', exact: true }).click();
    await editor.getByLabel(`Morceau ${index + 1} du contenu 1`, { exact: true }).selectOption(id);
  }
  await editor.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(word).toContainText('Segments : sa + va + ne');
  await expect(word.getByRole('checkbox')).toBeChecked();
  const edited = await saved();
  expect(edited).toEqual({ ...initial, readingExercises: [
    { ...initial.readingExercises![0], displayedUnits: [{ unitId: 'letter-a' }, { unitId: 'syllable-sa' }, { unitId: 'syllable-ma' }] },
    { ...initial.readingExercises![1], displayedUnits: [{ unitId: 'word-savane', segmentUnitIds: ['syllable-sa', 'syllable-va', 'syllable-ne'] }] },
  ] });
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.reload();
  await parents(page);
  await readingTab.click();
  expect(await saved()).toEqual(edited);
  await expect(changedMulti).toHaveCount(1);
  await word.getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(editor.getByLabel('Prononciation du contenu 1', { exact: true })).toHaveValue('segments');
  for (const [index, id] of ['syllable-sa', 'syllable-va', 'syllable-ne'].entries()) {
    await expect(editor.getByLabel(`Morceau ${index + 1} du contenu 1`, { exact: true })).toHaveValue(id);
  }
  page.once('dialog', dialog => dialog.dismiss());
  await editor.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(editor).toBeVisible();
  expect(await saved()).toEqual(edited);
  page.once('dialog', dialog => dialog.accept());
  await editor.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(word).toHaveCount(0);
  await expect(custom).toHaveCount(1);
  expect(await saved()).toEqual({ ...edited, readingExercises: [edited.readingExercises![0]], activityEnabled: { [multiId]: false } });
  await expect(section.getByRole('article').filter({ hasText: 'Automatique' })).toHaveCount(1);
  await expect(section.getByRole('article').filter({ hasText: 'Programme' })).toHaveCount(2);
});

test('Parent saves sentence pieces without punctuation and the child sees the full phrase with six sliders', async ({ page }) => {
  await mockSpeech(page);
  const display = 'Il a vu le lila.';
  await page.route('**/MiloApprend-Content/**', route => route.fulfill({ json: {
    schemaVersion: 1, programId: 'reading-punctuation', weeks: [{ number: 1, label: '1', letters: ['a'],
      syllables: ['vu', 'le', 'li', 'la'], toolWords: ['Il'], words: [],
      sentences: [{ id: 'sentence-lila', display }] }],
  } }));
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key, data: { ...emptyParentData(), activeWeek: 1 } });
  await page.goto('/');
  await parents(page);
  await page.getByRole('navigation', { name: 'Types d’exercices' }).getByRole('button', { name: 'JE LIS' }).click();
  await page.getByRole('button', { name: '+ Ajouter un exercice', exact: true }).click();
  const editor = page.getByRole('form', { name: 'Nouvel exercice Je lis' });
  await editor.getByLabel('Contenu affiché 1', { exact: true }).selectOption('sentence-lila');
  await editor.getByLabel('Prononciation du contenu 1', { exact: true }).selectOption('segments');
  for (const [index, id] of ['tool-word-Il', 'letter-a', 'syllable-vu', 'syllable-le', 'syllable-li', 'syllable-la'].entries()) {
    if (index) await editor.getByRole('button', { name: '+ Ajouter un morceau', exact: true }).click();
    await editor.getByLabel(`Morceau ${index + 1} du contenu 1`, { exact: true }).selectOption(id);
  }
  await editor.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole('article', { name: `Je lis : ${display}`, exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Retour au jeu', exact: true }).click();
  await page.getByRole('button', { name: 'JE LIS', exact: true }).click();
  await expect(page.locator('.reading-text')).toHaveText(display);
  await expect(page.getByRole('slider')).toHaveCount(6);
  for (const [index, text] of ['Il', 'a', 'vu', 'le', 'li', 'la'].entries()) {
    await expect(page.getByRole('slider', { name: `Prononcer ${text}, morceau ${index + 1}`, exact: true })).toBeVisible();
  }
});
