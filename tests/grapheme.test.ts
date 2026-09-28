import assert from 'node:assert/strict';
import test from 'node:test';
import type { Grapheme, LearningProgram, Word, CompletionActivity } from '../src/content/model.ts';
import { buildSeedProgram } from '../src/content/seed-bank.ts';
import { validateParentUnit } from '../src/parent/content.ts';
import { validateProgram } from '../src/content/validation.ts';
import { createContentService } from '../src/content/service.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { newSpellActivity, validateSpellActivity } from '../src/content/spelling.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { emptyParentData, effectiveProgram, saveParentUnit } from '../src/parent/model.ts';
import { createParentStore } from '../src/services/parent-store.ts';
const ch:Grapheme={id:'parent-grapheme-ch',type:'grapheme',display:'ch',audioText:'che',introducedInWeek:3,enabled:true,tags:['parent','practice']};
const ou:Grapheme={...ch,id:'parent-grapheme-ou',display:'ou',audioText:'ou'};
const word:Word={id:'test-word',type:'word',display:'cha',text:'cha',audioText:'cha',introducedInWeek:3,enabled:true,segmentations:[{id:'main',segments:[{unitId:ch.id},{unitId:'letter-a'}]}]};
const program:LearningProgram={id:'grapheme-test',weeks:[{number:3,label:'Test'},{number:4,label:'Later'}],units:[ch,ou,{id:'letter-a',type:'letter',display:'a',grapheme:'a',audioText:'a',introducedInWeek:3,enabled:true},word]};
const service=(p:LearningProgram)=>createContentService(createContentRepository(p),3);
test('grapheme validates as a LearningUnit, keeps audioText and can be introduced by optional seed field',()=>{
 assert.deepEqual(validateParentUnit(program,ch),[]);assert.deepEqual(validateProgram(program),[]);
 assert.ok(validateParentUnit(program,{...ch,display:''}).some(i=>i.code==='empty-content'));
 const seed=buildSeedProgram('test',[{number:3,label:'Test',letters:[],graphemes:['ch',{id:'grapheme-ou',display:'ou',audioText:'ou'}],syllables:[],words:[],sentences:[],toolWords:[]}]);
 assert.deepEqual(seed.units.map(u=>[u.id,u.type,u.audioText]),[['grapheme-ch','grapheme','ch'],['grapheme-ou','grapheme','ou']]);
 assert.equal(seed.units.filter(u=>u.type==='letter').length,0);
});
test('explicit grapheme construction becomes a generic answer with correct kind, never a generated unit',()=>{
 const a:CompletionActivity={id:'test-activity',type:'complete-segments',targetId:word.id,segmentationId:'main',missingSegmentIndexes:[0],distractorUnitIds:[ou.id]};
 const p={...program,activities:[a]};const before=JSON.stringify(p);const result=activityToExercise(service(p),a);
 assert.deepEqual(result.issues,[]);assert.deepEqual(result.exercise?.slots,[{segmentIndex:0,expected:'ch'}]);
 assert.deepEqual(result.exercise?.choices,[{text:'ch',kind:'grapheme'},{text:'ou',kind:'grapheme'}]);assert.equal(JSON.stringify(p),before);
});
test('availability and Parent storage/overrides treat graphemes like other units without changing older data',()=>{
 const seed={...program,units:program.units.filter(u=>u.type!=='grapheme')};
 let data=saveParentUnit(emptyParentData(),seed,ch);
 data={...data,unitEnabled:{[ch.id]:false}};
 const values=new Map<string,string>();const store=createParentStore(()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}}));
 assert.equal(store.save(data),true);assert.deepEqual(store.load().data,{...data,activeWeek:undefined});
 assert.deepEqual(service(effectiveProgram(seed,store.load().data)).getAvailableGraphemes(),[]);
 assert.equal(service(effectiveProgram(seed,{...data,unitEnabled:{[ch.id]:true}})).getAvailableGraphemes()[0].audioText,'che');
 assert.equal(service({...program,units:program.units.map(u=>u.id===ch.id?{...u,introducedInWeek:4}:u)}).getAvailableGraphemes().some(u=>u.id===ch.id),false);
 assert.equal(store.save(emptyParentData()),true);assert.deepEqual(store.load().data,{...emptyParentData(),activeWeek:undefined});
});
test('ch and ou cannot authorize individual C/H/O/U or act as spell answers/distractors',()=>{
 for(const text of ['chat','ou']) {
  const target={...word,text,display:text};const p={...program,units:[...program.units.filter(u=>u.id!==word.id),target]};
  const a=newSpellActivity(p,target,3,'spell');
  assert.deepEqual(a.missingPositions,text==='chat'?[2]:[]);
  const badAnswer={...a,missingPositions:[0],letterUnitIds:{0:ch.id}};
  assert.ok(validateSpellActivity({...p,activities:[badAnswer]},badAnswer,3).some(i=>i.code==='invalid-spell-letter'));
  const badDistractor={...a,distractorUnitIds:[ou.id]};
  assert.ok(validateSpellActivity({...p,activities:[badDistractor]},badDistractor,3).some(i=>i.code==='invalid-spell-distractor'));
  assert.deepEqual(service(p).getAvailableLetters().map(u=>u.id),['letter-a']);
 }
});
