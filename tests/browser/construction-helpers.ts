import type { Page } from '@playwright/test';
export async function addBlock(page: Page, value: string, visible = false) {
  await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click();
  if (visible) {
    await page.getByLabel('Type de bloc', { exact: true }).selectOption('visible');
    await page.getByLabel('Texte visible', { exact: true }).fill(value);
  } else await page.getByLabel('Contenu appris', { exact: true }).selectOption(value);
  await page.getByRole('button', { name: 'Ajouter ce bloc', exact: true }).click();
}
