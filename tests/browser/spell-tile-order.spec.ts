import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { spellParentData } from '../fixtures/spell-program';
async function parents(page: Page) {
  await page.getByRole('button', { name: 'Parents', exact: true }).click();
  const names = ['un','deux','trois','quatre','cinq','six','sept','huit','neuf'];
  for (const [i, name] of (await page.getByTestId('gate-prompt').innerText()).split(' — ').entries()) await page.getByLabel(`Chiffre ${i+1}`, { exact: true }).fill(String(names.indexOf(name)+1));
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('navigation', { name: 'Sections parents' }).getByRole('button', { name: 'Exercices', exact: true }).click();
  await page.getByRole('article').filter({ hasText: 'Écris le mot : l | a | m | a' }).getByRole('button', { name: 'Modifier l’exercice', exact: true }).click();
}
test('Parent arrows, preview, reconciliation, save, refresh and child exact order', async ({ page }) => {
  await mockSpeech(page);
  const data = spellParentData();
  await page.addInitScript(data => { if (!localStorage.getItem('milo-apprend.parent.v1')) localStorage.setItem('milo-apprend.parent.v1', JSON.stringify(data)); }, {
    ...data, activities: [{ ...data.activities[0], distractorUnitIds: [] }],
  });
  await page.goto('/'); await parents(page);
  const order = page.getByRole('group', { name: 'Ordre des lettres proposées' });
  const preview = page.getByRole('region', { name: 'Aperçu interactif' }).locator('.parent-answer');
  // Legacy order L A M A -> M A L A.
  for (const name of ['Déplacer m (3) à gauche','Déplacer m (2) à gauche','Déplacer a (3) à gauche']) await order.getByRole('button', { name, exact: true }).tap();
  await expect(preview).toHaveText(['m','a','l','a']);
  await page.getByLabel('Distracteur v (letter)', { exact: true }).check();
  for (const i of [5,4,3]) await order.getByRole('button', { name: `Déplacer v (${i}) à gauche`, exact: true }).tap();
  await expect(preview).toHaveText(['m','v','a','l','a']);
  await page.getByLabel('Trouver a (lettre 2)', { exact: true }).uncheck();
  await expect(preview).toHaveText(['m','v','l','a']);
  await page.getByLabel('Trouver a (lettre 2)', { exact: true }).check();
  await expect(preview).toHaveText(['m','v','l','a','a']);
  await order.getByRole('button', { name: 'Déplacer a (5) à gauche', exact: true }).tap();
  await order.getByRole('button', { name: 'Déplacer a (4) à gauche', exact: true }).tap();
  await expect(preview).toHaveText(['m','v','a','l','a']);
  await page.getByRole('button', { name: 'Sauvegarder l’exercice', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('milo-apprend.parent.v1')!).activities[0].tileOrder);
  expect(saved).toEqual(['answer:2','distractor:letter-v','answer:1','answer:0','answer:3']);
  await page.getByRole('button', { name: 'Milo apprend, accueil' }).click();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  const bank = page.getByLabel('Morceaux disponibles').getByRole('button');
  await expect(bank).toHaveText(['m','v','a','l','a']);
  await page.getByRole('button', { name: 'Choisir v', exact: true }).tap();
  await expect(bank).toHaveText(['m','v','a','l','a']);
  await page.getByRole('button', { name: 'Case 2 à compléter', exact: true }).tap();
  await page.getByRole('button', { name: 'Choisir a', exact: true }).first().tap();
  await expect(bank).toHaveText(['m','v','l','a']);
  await page.getByRole('button', { name: 'Retirer a de la case 2', exact: true }).tap();
  await expect(bank).toHaveText(['m','v','a','l','a']);
  await page.reload();
  await page.getByRole('button', { name: 'JOUER', exact: true }).tap();
  await expect(bank).toHaveText(['m','v','a','l','a']);
});

