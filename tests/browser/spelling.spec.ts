import { test, expect, type Page, type Locator } from '@playwright/test';
import { mockSpeech } from './speech-mock';
import { spellParentData } from '../fixtures/spell-program';
import { chainParentData } from '../fixtures/chain-program';
async function parents(page:Page) {
 await page.getByRole('button',{name:'Parents',exact:true}).click();
 const names=['un','deux','trois','quatre','cinq','six','sept','huit','neuf'];
 for(const [i,name] of (await page.getByTestId('gate-prompt').innerText()).split(' — ').entries())await page.getByLabel(`Chiffre ${i+1}`,{exact:true}).fill(String(names.indexOf(name)+1));
 await page.getByRole('button',{name:'Valider',exact:true}).click();
 await page.getByRole('navigation',{name:'Sections parents'}).getByRole('button',{name:'Exercices',exact:true}).click();
}
async function place(page:Page,source:Locator,target:Locator,input:'mouse'|'touch'|'keyboard') {
 if(input==='keyboard'){await target.focus();await page.keyboard.press('Enter');await source.focus();await page.keyboard.press('Space');return;}
 await source.scrollIntoViewIfNeeded();const a=(await source.boundingBox())!,b=(await target.boundingBox())!;
 const from={x:a.x+a.width/2,y:a.y+a.height/2},to={x:b.x+b.width/2,y:b.y+b.height/2};
 if(input==='mouse'){await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
 else {const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
}
async function setup(page:Page,mode:'individual'|'chain'='individual',missing=[0,1,2,3]) {
 await mockSpeech(page);await page.addInitScript(data=>{if(!localStorage.getItem('milo-apprend.parent.v1'))localStorage.setItem('milo-apprend.parent.v1',JSON.stringify(data));},spellParentData(mode,missing));
 await page.goto('/');await page.clock.install();await page.getByRole('button',{name:'JOUER',exact:true}).click();
}
for(const input of ['mouse','touch','keyboard'] as const)test(`spell ${input}: independent letters, arbitrary order, removal, one star and Word audio`,async({page})=>{
 await setup(page);
 await expect(page.getByRole('heading',{name:'Écris le mot',exact:true})).toBeVisible();
 await expect(page.getByLabel('Mot modèle',{exact:true})).toHaveText('lama');
 const bank=page.getByLabel('Morceaux disponibles');
 const choose=(text:string)=>bank.getByRole('button',{name:`Choisir ${text}`,exact:true}).first();
 const slot=(n:number)=>page.getByRole('button',{name:`Case ${n} à compléter`,exact:true});
 await expect(bank.getByRole('button',{name:'Choisir a',exact:true})).toHaveCount(2);
 await place(page,choose('a'),slot(4),input);
 await expect(bank.getByRole('button',{name:'Choisir a',exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Retirer a de la case 4',exact:true}).click();
 await expect(bank.getByRole('button',{name:'Choisir a',exact:true})).toHaveCount(2);
 for(const [n,text] of [[4,'a'],[3,'m'],[1,'l'],[2,'a']] as const)await place(page,choose(text),slot(n),input);
 await expect(page.getByLabel('Étoiles : 1 sur 1')).toBeVisible();
 await expect(bank.getByRole('button')).toHaveCount(2);
 expect(await page.evaluate(()=>window.speechProbe.calls.map(c=>c.text))).toEqual(['lama','lama']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/spell-${input}.png`,fullPage:true});
 await page.clock.runFor(2300);await expect(page.getByRole('heading',{name:'Bravo Milo !'})).toBeVisible();
});
test('provided A consumes no answer; an error keeps the bank and forfeits only the existing target star',async({page})=>{
 await setup(page,'individual',[0,2,3]);const bank=page.getByLabel('Morceaux disponibles');
 await expect(bank.getByRole('button')).toHaveCount(5);
 await expect(bank.getByRole('button',{name:'Choisir a',exact:true})).toHaveCount(1);
 await expect(page.locator('.word-segment')).toHaveText('a');
 await bank.getByRole('button',{name:'Choisir i',exact:true}).click();await expect(bank.getByRole('button')).toHaveCount(5);
 for(const text of ['l','m','a'])await bank.getByRole('button',{name:`Choisir ${text}`,exact:true}).click();
 await expect(page.getByLabel('Étoiles : 0 sur 1')).toBeVisible();
});
test('mixed chain shares exactly the required occurrences and excludes configured distractors',async({page})=>{
 await setup(page,'chain',[0,2,3]);const bank=page.getByLabel('Morceaux disponibles');
 await expect(bank.getByRole('button')).toHaveCount(5);
 await expect(bank.getByRole('button',{name:'Choisir i',exact:true})).toHaveCount(0);
 await expect(bank.getByRole('button',{name:'Choisir li',exact:true})).toHaveCount(0);
 for(const text of ['l','m','a'])await bank.getByRole('button',{name:`Choisir ${text}`,exact:true}).click();
 await page.clock.runFor(2300);await expect(page.getByRole('heading',{name:'Complète le mot',exact:true})).toBeVisible();
 await expect(bank.getByRole('button')).toHaveCount(2);
 for(const text of ['la','va'])await bank.getByRole('button',{name:`Choisir ${text}`,exact:true}).click();
 await page.clock.runFor(2300);await expect(page.getByLabel('Étoiles : 2 sur 2')).toBeVisible();
});
test('Parents explicit creation, defaults, preview, drafts, Save and Cancel',async({page})=>{
 await mockSpeech(page);page.on('dialog',d=>d.accept());
 await page.addInitScript(data=>{if(!localStorage.getItem('milo-apprend.parent.v1'))localStorage.setItem('milo-apprend.parent.v1',JSON.stringify(data));},chainParentData(2));
 await page.goto('/');await parents(page);
 await page.getByRole('button',{name:'+ Nouvel exercice',exact:true}).click();
 await page.getByLabel('Type de défi',{exact:true}).selectOption('spell');
 await page.getByLabel('Cible de l’exercice',{exact:true}).selectOption('parent-word-chain-lama');
 await page.getByRole('button',{name:'Configurer l’exercice',exact:true}).click();
 await page.reload();
 await expect(page.getByLabel('Type de défi',{exact:true})).toHaveValue('spell');
 for(let i=1;i<=4;i++)await expect(page.getByLabel(new RegExp(`\\(lettre ${i}\\)$`))).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Distracteur/}).filter({visible:true}).first()).not.toBeChecked();
 const preview=page.getByRole('region',{name:'Aperçu interactif'});
 await expect(preview.getByRole('button',{name:'Tester a',exact:true})).toHaveCount(2);
 await page.getByLabel('Trouver a (lettre 2)',{exact:true}).uncheck();
 await page.getByLabel('Distracteur i (letter)',{exact:true}).check();
 await page.reload();await expect(page.getByLabel('Type de défi',{exact:true})).toHaveValue('spell');
 await expect(page.getByRole('heading',{name:'Exercice : lama',exact:true})).toBeVisible();
 await expect(page.getByLabel('Trouver a (lettre 2)',{exact:true})).not.toBeChecked();
 await expect(page.getByLabel('Distracteur i (letter)',{exact:true})).toBeChecked();
 await page.getByRole('button',{name:'Sauvegarder l’exercice',exact:true}).click();
 expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('milo-apprend.parent-draft.v1:')))).toHaveLength(0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('milo-apprend.parent.v1')!).activities.find((a:{type:string})=>a.type==='spell'));
 expect(saved.missingPositions).toEqual([0,2,3]);expect(saved.distractorUnitIds).toEqual(['letter-i']);
 await page.getByRole('article').filter({hasText:'Écris le mot : l | a | m | a'}).getByRole('button',{name:'Modifier l’exercice',exact:true}).click();
 await page.getByLabel('Trouver a (lettre 2)',{exact:true}).check();
 await page.getByRole('button',{name:'Annuler',exact:true}).click();
 expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('milo-apprend.parent-draft.v1:')))).toHaveLength(0);
});
test('LAVAGE offers only authorized letters and leaves g/e provided',async({page})=>{
 await mockSpeech(page);await page.addInitScript(data=>localStorage.setItem('milo-apprend.parent.v1',JSON.stringify(data)),{...chainParentData(2),unitEnabled:{'letter-e':false}});
 await page.goto('/');await parents(page);await page.getByRole('button',{name:'+ Nouvel exercice',exact:true}).click();
 await page.getByLabel('Type de défi',{exact:true}).selectOption('spell');await page.getByLabel('Cible de l’exercice',{exact:true}).selectOption('parent-word-chain-lavage');
 await page.getByRole('button',{name:'Configurer l’exercice',exact:true}).click();
 for(const name of ['Trouver g (lettre 5)','Trouver e (lettre 6)']){await expect(page.getByLabel(name,{exact:true})).toBeDisabled();await expect(page.getByLabel(name,{exact:true})).not.toBeChecked();}
 await expect(page.getByRole('checkbox',{name:/Distracteur.*syllable/})).toHaveCount(0);
});
