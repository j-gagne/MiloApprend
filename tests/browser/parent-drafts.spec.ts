import { test, expect, type Page } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { addBlock } from './construction-helpers';
const savedKey='milo-apprend.parent.v1';
const drafts=(page: Page)=>page.evaluate(()=>Object.keys(sessionStorage).filter(key=>key.startsWith('milo-apprend.parent-draft.v1:')));
async function parents(page: Page) {
  await page.getByRole('button',{name:'Parents',exact:true}).click();
  const names=['un','deux','trois','quatre','cinq','six','sept','huit','neuf'];
  for(const [i,name] of (await page.getByTestId('gate-prompt').innerText()).split(' — ').entries()) await page.getByLabel(`Chiffre ${i+1}`,{exact:true}).fill(String(names.indexOf(name)+1));
  await page.getByRole('button',{name:'Valider',exact:true}).click();
}
async function tab(page: Page,name:string) { await page.getByRole('navigation',{name:'Sections parents'}).getByRole('button',{name,exact:true}).click(); }
async function newWord(page: Page) {
  await tab(page,'Programme');
  await page.getByRole('button',{name:'Ouvrir la semaine 5',exact:true}).click();
  await page.getByRole('button',{name:'+ Ajouter un mot',exact:true}).click();
}
test.beforeEach(async({page})=>{await mockSpeech(page);page.on('dialog',dialog=>dialog.accept());await page.goto('/');await parents(page);});
test('new word restores raw text, audio, partial construction and custom sequence; Save clears only the draft',async({page})=>{
  const before=await page.evaluate(key=>localStorage.getItem(key),savedKey);
  await newWord(page);
  await page.getByLabel('Mot',{exact:true}).fill('maman');
  await page.getByLabel('Prononciation audio',{exact:true}).fill('ma man');
  await addBlock(page,'syllable-ma');
  await page.getByRole('combobox',{name:'Lecture du mot',exact:true}).selectOption('custom');
  await page.getByRole('button',{name:'Ajouter un morceau audio',exact:true}).click();
  await page.getByLabel('Texte du morceau 1',{exact:true}).fill('ma');
  await page.getByRole('button',{name:'Ajouter un morceau audio',exact:true}).click();
  await page.getByLabel('Texte du morceau 2',{exact:true}).fill('man');
  expect(await drafts(page)).toHaveLength(1);
  expect(await page.evaluate(key=>localStorage.getItem(key),savedKey)).toBe(before);
  await page.reload();
  await expect(page.getByRole('button',{name:'Programme',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.getByText('Brouillon restauré',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Mot',{exact:true})).toHaveValue('maman');
  await expect(page.getByLabel('Prononciation audio',{exact:true})).toHaveValue('ma man');
  await expect(page.getByRole('article',{name:'Bloc 1',exact:true})).toContainText('ma');
  await expect(page.getByRole('combobox',{name:'Lecture du mot',exact:true})).toHaveValue('custom');
  await expect(page.getByLabel('Texte du morceau 2',{exact:true})).toHaveValue('man');
  await addBlock(page,'syllable-ma');await addBlock(page,'letter-n');
  await page.getByRole('button',{name:'Enregistrer le contenu',exact:true}).click();
  expect(await drafts(page)).toHaveLength(0);
  await page.reload();
  await expect(page.getByRole('region',{name:'Éditeur de contenu'})).toHaveCount(0);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),savedKey);
  const word=saved.customUnits.find((unit:{display:string})=>unit.display==='maman');
  expect(word.audioText).toBe('ma man');expect(word.readingMode).toBe('segmented');
  expect(word.readingSequence).toEqual([{text:'ma'},{text:'man'}]);
});
test('uncommitted block and whole reading mode survive reload; cancel discards',async({page})=>{
  await newWord(page);await page.getByLabel('Mot',{exact:true}).fill('test');
  await page.getByRole('combobox',{name:'Lecture du mot',exact:true}).selectOption('whole');
  await page.getByRole('button',{name:'+ Ajouter un bloc',exact:true}).click();
  await page.getByLabel('Type de bloc',{exact:true}).selectOption('visible');
  await page.getByLabel('Texte visible',{exact:true}).fill('te');
  await page.reload();
  await expect(page.getByRole('combobox',{name:'Lecture du mot',exact:true})).toHaveValue('whole');
  await expect(page.getByLabel('Texte visible',{exact:true})).toHaveValue('te');
  await page.getByRole('button',{name:'Annuler',exact:true}).click();
  expect(await drafts(page)).toHaveLength(0);await page.reload();
  await expect(page.getByRole('region',{name:'Éditeur de contenu'})).toHaveCount(0);
});
test('new exercise restores its configuration and saves normally',async({page})=>{
  await tab(page,'Exercices');
  await page.getByRole('button',{name:'+ Nouvel exercice',exact:true}).click();
  await page.getByLabel('Cible de l’exercice',{exact:true}).selectOption('word-lama');
  await page.getByRole('button',{name:'Configurer l’exercice',exact:true}).click();
  await page.getByLabel('Nom administratif (facultatif)').fill('Mon brouillon');
  await page.getByLabel('Trouver la (bloc 1)',{exact:true}).check();
  await page.getByLabel('Distracteur li (syllable)',{exact:true}).check();
  await page.reload();
  await expect(page.getByLabel('Nom administratif (facultatif)')).toHaveValue('Mon brouillon');
  await expect(page.getByLabel('Trouver la (bloc 1)',{exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Sauvegarder l’exercice',exact:true}).click();
  expect(await drafts(page)).toHaveLength(0);
});
test('LAMA draft is isolated from ÂNE, survives unmount, and never affects saved content or child game',async({page})=>{
  await tab(page,'Programme');await page.getByRole('button',{name:'Ouvrir la semaine 3',exact:true}).click();
  await page.getByRole('article',{name:'Contenu lama',exact:true}).getByRole('button',{name:'Modifier la prononciation',exact:true}).click();
  await page.getByLabel('Prononciation audio',{exact:true}).fill('Brouillon secret');
  const before=await page.evaluate(key=>localStorage.getItem(key),savedKey);
  await tab(page,'Programme');
  await page.getByRole('button',{name:'Ouvrir la semaine 5',exact:true}).click();
  await page.getByRole('article',{name:'Contenu âne',exact:true}).getByRole('button',{name:'Modifier la prononciation',exact:true}).click();
  await expect(page.getByLabel('Prononciation audio',{exact:true})).not.toHaveValue('Brouillon secret');
  expect(await drafts(page)).toHaveLength(1);
  await page.getByRole('button',{name:'Retour au jeu',exact:true}).click();
  await page.getByRole('button',{name:'JOUER',exact:true}).click();
  expect(await page.evaluate(key=>localStorage.getItem(key),savedKey)).toBe(before);
  expect(await page.evaluate(()=>window.speechProbe.calls.some(c=>c.text==='Brouillon secret'))).toBe(false);
  await page.reload();await expect(page.getByRole('button',{name:'JOUER',exact:true})).toBeVisible();
});
test('main Parent sections restore and mobile document remains scrollable without horizontal overflow',async({page})=>{
  for(const name of ['Programme','Exercices','Réglages','Test audio','Aperçu']) {
    await tab(page,name);await page.reload();
    await expect(page.getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page');
  }
  await tab(page,'Programme');
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe('none');
  await page.evaluate(()=>window.scrollTo(0,0));
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:375,y:650}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:375,y:250}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('failed Save retains editor and draft for retry',async({page})=>{
  await newWord(page);await page.getByLabel('Mot',{exact:true}).fill('essai');
  await page.evaluate(()=>{ const original=Storage.prototype.setItem; Storage.prototype.setItem=function(key,value){if(key==='milo-apprend.parent.v1')throw new Error('quota');original.call(this,key,value);}; });
  await page.getByRole('button',{name:'Enregistrer le contenu',exact:true}).click();
  await expect(page.getByText('Sauvegarde impossible : le brouillon est conservé.',{exact:true})).toBeVisible();
  expect(await drafts(page)).toHaveLength(1);
  await page.reload();await expect(page.getByLabel('Mot',{exact:true})).toHaveValue('essai');
  await page.getByRole('button',{name:'Enregistrer le contenu',exact:true}).click();
  expect(await drafts(page)).toHaveLength(0);
});
test('week creation uses the same draft mechanism',async({page})=>{
  await tab(page,'Programme');await page.getByRole('button',{name:'+ Ajouter une semaine',exact:true}).click();
  await page.getByLabel('Libellé de la semaine',{exact:true}).fill('Nouvelle semaine');
  await page.reload();await expect(page.getByLabel('Libellé de la semaine',{exact:true})).toHaveValue('Nouvelle semaine');
  await page.getByRole('button',{name:'Annuler',exact:true}).click();expect(await drafts(page)).toHaveLength(0);
});
for(const [action,label,text] of [['une lettre','Lettre','é'],['une syllabe','Syllabe','mé'],['une phrase','Phrase','Il a lu.']]) test(`restore ${label} fields`,async({page})=>{
  await tab(page,'Programme');await page.getByRole('button',{name:'Ouvrir la semaine 5',exact:true}).click();
  await page.getByRole('button',{name:`+ Ajouter ${action}`,exact:true}).click();
  await page.getByLabel(label,{exact:true}).fill(text);
  await page.getByLabel('Prononciation audio',{exact:true}).fill('Essai audio');
  await page.reload();await expect(page.getByLabel(label,{exact:true})).toHaveValue(text);
  await expect(page.getByLabel('Prononciation audio',{exact:true})).toHaveValue('Essai audio');
  await page.getByRole('button',{name:'Annuler',exact:true}).click();expect(await drafts(page)).toHaveLength(0);
});

test('beforeunload is only active for unsaved Parent forms, never a child session',async({page})=>{
  const protectedForm=()=>page.evaluate(()=>!window.dispatchEvent(new Event('beforeunload',{cancelable:true})));
  expect(await protectedForm()).toBe(false);
  await newWord(page);expect(await protectedForm()).toBe(false);
  await page.getByLabel('Mot',{exact:true}).fill('essai');expect(await protectedForm()).toBe(true);
  await page.getByRole('button',{name:'Annuler',exact:true}).click();expect(await protectedForm()).toBe(false);
  await page.getByRole('button',{name:'Retour au jeu',exact:true}).click();
  await page.getByRole('button',{name:'JOUER',exact:true}).click();expect(await protectedForm()).toBe(false);
});

test('existing exercise draft has edit identity and restores independently',async({page})=>{
  await tab(page,'Exercices');
  await page.getByRole('article',{name:'Exercice lama variante 1',exact:true}).getByRole('button',{name:'Modifier l’exercice',exact:true}).click();
  await page.getByLabel('Nom administratif (facultatif)').fill('Exercice existant');
  expect((await drafts(page))[0]).toContain('exercise:edit:');
  await page.reload();await expect(page.getByLabel('Nom administratif (facultatif)')).toHaveValue('Exercice existant');
  await page.getByRole('button',{name:'Annuler',exact:true}).click();expect(await drafts(page)).toHaveLength(0);
});
test('unavailable session storage warns without blocking a Parent form',async({page})=>{
  await newWord(page);
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('milo-apprend.parent-draft'))throw new Error('quota');original.call(this,key,value);};});
  await page.getByLabel('Mot',{exact:true}).fill('essai');
  await expect(page.getByText('Brouillon non protégé : stockage de cet onglet indisponible.',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Mot',{exact:true})).toHaveValue('essai');
  await page.getByRole('button',{name:'Enregistrer le contenu',exact:true}).click();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).customUnits.some((unit:{display:string})=>unit.display==='essai'),savedKey)).toBe(true);
});
