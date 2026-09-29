import { test, expect } from '@playwright/test';
for(const width of [390,820,1280]) test(`hatching preview ${width}: five states, layers, controls and isolated data`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(()=>{localStorage.setItem('preview-sentinel','unchanged');sessionStorage.setItem('preview-sentinel','unchanged');});
 await page.goto('/?preview=hatching');
 const before=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
 const egg=page.getByRole('img');
 let base:string|null=null;
 for(const stage of [1,2,3,4,5]) {
  await page.getByRole('button',{name:`État ${stage}`,exact:true}).click();
  await expect(egg).toHaveAttribute('data-stage',String(stage));
  await expect(page.getByLabel(`Éclosion : ${stage} sur 5`,{exact:true})).toBeVisible();
  await expect(page.getByTestId('hatching-animal').locator('svg.dinosaur')).toHaveCount(1);
  const reveal=stage===5?'full':stage===4?'large':stage===3?'small':'hidden';
  await expect(egg.locator(`[data-reveal="${reveal}"]`)).toHaveCount(1);
  if(stage<5){const path=await page.getByTestId('egg-shell').locator(':scope > path').first().getAttribute('d');if(base===null)base=path;expect(path).toBe(base);}
  if(stage<3)await expect(egg.locator('clipPath').nth(1).locator('rect')).toHaveAttribute('width','0');
  if(stage===3||stage===4){const area=await egg.locator('clipPath').nth(1).locator('path').evaluate(el=>{const r=(el as SVGGraphicsElement).getBBox();return r.width*r.height;});expect(area).toBeGreaterThan(stage===3?2000:10000);expect(area).toBeLessThan(stage===3?4000:20000);}
  if(stage===5)await expect(page.getByTestId('broken-shell')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await egg.locator('.egg-motion').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.screenshot({path:`test-results/hatching-${width}-${stage}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'État 1',exact:true}).focus();await page.keyboard.press('Enter');await expect(egg).toHaveAttribute('data-stage','1');
 expect(await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}))).toEqual(before);
 await page.reload();await expect(egg).toHaveAttribute('data-stage','1');
});
test('motion is subtle and available unless reduced motion is requested',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?preview=hatching');
 await page.getByRole('button',{name:'État 5',exact:true}).click();
 expect(await page.locator('.hatching-animal').evaluate(el=>getComputedStyle(el).animationName)).toBe('animal-rise');
 await expect(page.getByRole('button',{name:'CONTINUER',exact:false})).toHaveAttribute('aria-disabled','true');
});
