import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProgram } from '../src/content/program.ts';
import type { LearningProgram, SpellActivity, Word, Letter } from '../src/content/model.ts';
import { letterPositions, newSpellActivity, validateSpellActivity } from '../src/content/spelling.ts';
import { activityCatalog } from '../src/content/activity-catalog.ts';
import { createContentRepository } from '../src/content/repository.ts';
import { createContentService } from '../src/content/service.ts';
import { activityToExercise } from '../src/game/completion-content.ts';
import { getCompleteWordChallenges } from '../src/game/complete-word-content.ts';
import { createAnswerBank, availableAnswers, placeOccurrence, removeOccurrence } from '../src/game/answer-bank.ts';
import { createChain } from '../src/game/chain.ts';
import { generateCompleteWordSession } from '../src/game/complete-word-session.ts';
import { validateChallenges } from '../src/game/complete-word.ts';
import { emptyParentData, effectiveProgram, saveActivity, duplicateActivity } from '../src/parent/model.ts';
import { createParentStore, parseParentData } from '../src/services/parent-store.ts';
const word=initialProgram.units.find((u):u is Word=>u.id==='word-lama'&&u.type==='word')!;
const make=()=>newSpellActivity(initialProgram,word,5,'parent-activity-spell');
const service=(program:LearningProgram)=>createContentService(createContentRepository(program),5);
function board(activity:SpellActivity) {const program={...initialProgram,activities:[activity]};const result=activityToExercise(service(program),activity);assert.deepEqual(result.issues,[]);return result.exercise!;}
const issues=(activity:SpellActivity,program:LearningProgram=initialProgram)=>validateSpellActivity({...program,activities:[activity]},activity,5);
function missing(indexes:number[]):SpellActivity {const a=make();return {...a,missingPositions:indexes,letterUnitIds:Object.fromEntries(indexes.map(i=>[i,a.letterUnitIds[i]]))};}
test('LAMA uses explicit letters, independent duplicates, supplied positions and no default distractors',()=>{
  const original=JSON.stringify(word.segmentations);
  const a=make();assert.deepEqual(a.missingPositions,[0,1,2,3]);assert.deepEqual(a.distractorUnitIds,[]);
  const bank=createAnswerBank(board(a));assert.deepEqual(bank.map(c=>c.text).sort(),['a','a','l','m']);assert.ok(bank.every(c=>c.kind==='letter'));
  const as=bank.filter(c=>c.text==='a');assert.notEqual(as[0].id,as[1].id);
  const placed=placeOccurrence(board(a),bank,{},3,as[0].id);assert.equal(placed.accepted,true);
  assert.equal(availableAnswers(bank,placed.placements).filter(c=>c.text==='a').length,1);
  assert.equal(availableAnswers(bank,removeOccurrence(placed.placements,3)).length,4);
  assert.deepEqual(createAnswerBank(board(missing([0,2,3]))).map(c=>c.text).sort(),['a','l','m']);
  assert.deepEqual(createAnswerBank(board(missing([1,3]))).map(c=>c.text),['a','a']);
  assert.equal(JSON.stringify(word.segmentations),original);
});
test('letters only, correct reference and availability are required; invalid positions are never repaired',()=>{
  const a=make();
  for(const bad of [{...a,missingPositions:[]},{...a,missingPositions:[9]}, {...a,missingPositions:[0,0]}, {...a,letterUnitIds:{...a.letterUnitIds,0:'syllable-la'}}, {...a,targetId:'syllable-la'}, {...a,targetText:'lama!'}])assert.ok(issues(bad).length);
  const disabled={...initialProgram,units:initialProgram.units.map(u=>u.id==='letter-l'?{...u,enabled:false}:u)};
  assert.ok(issues(a,disabled).some(i=>i.code==='invalid-spell-letter'));
  const future={...initialProgram,units:initialProgram.units.map(u=>u.id==='letter-l'?{...u,introducedInWeek:99}:u)};
  assert.ok(issues(a,future).some(i=>i.code==='invalid-spell-letter'));
});
test('Individual accepts letter distractors, rejects syllables; shared Chain has only needed occurrences',()=>{
  const a={...make(),distractorUnitIds:['letter-i','letter-o']};const spell=board(a);
  assert.equal(createAnswerBank(spell).length,6);
  assert.ok(issues({...a,distractorUnitIds:['syllable-li']}).some(i=>i.code==='invalid-spell-distractor'));
  const complete=getCompleteWordChallenges(service(initialProgram)).challenges.find(c=>c.wordId==='word-ami')!;
  const chain=createChain([spell,complete]);assert.equal(chain.bank.length,spell.slots.length+complete.slots.length);
  assert.deepEqual(chain.bank.slice(0,4).map(c=>c.text),['l','a','m','a']);
});
test('LAVAGE provided g/e never create LearningUnits or change construction',()=>{
  const lavage:Word={...word,id:'test-lavage',display:'lavage',text:'lavage',segmentations:[{id:'main',segments:[{unitId:'syllable-la'},{unitId:'syllable-va'},{literal:'ge',note:'visible'}]}]};
  const program={...initialProgram,units:[...initialProgram.units.map(u=>u.id==='letter-e'?{...u,enabled:false}:u),lavage]};
  const before=JSON.stringify(initialProgram);const a=newSpellActivity(program,lavage,5,'lavage-spell');
  assert.ok(!a.missingPositions.includes(4));assert.ok(!a.missingPositions.includes(5));
  assert.ok(issues({...a,missingPositions:[4],letterUnitIds:{4:'syllable-ge'}},program).length);
  assert.equal(JSON.stringify(initialProgram),before);
});
test('accented and decomposed letters keep their graphemes; A never authorizes Â',()=>{
  const w={...word,id:'accent-word',display:'ÂA',text:'ÂA'};
  const p={...initialProgram,units:[...initialProgram.units,w]};
  assert.deepEqual(newSpellActivity(p,w,5,'accent').missingPositions,[1]);
  const accent:Letter={id:'accent-letter',type:'letter',display:'â',grapheme:'â',audioText:'â',introducedInWeek:3,enabled:true};
  const p2={...p,units:[...p.units,accent]};assert.deepEqual(newSpellActivity(p2,w,5,'accent').missingPositions,[0,1]);
  assert.deepEqual(letterPositions('a\u0302mi'),['a\u0302','m','i']);
});
test('spell variants persist, duplicate and reload separately without changing older activities or generating spell',()=>{
  const before=getCompleteWordChallenges(service(initialProgram)).challenges;
  assert.ok(activityCatalog(initialProgram,5).every(a=>a.type==='complete-segments'));
  let data=saveActivity(emptyParentData(),missing([1,3]));data=saveActivity(data,{...missing([0,2,3]),id:'other'});
  const map=new Map<string,string>();const store=createParentStore(()=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);}}));
  assert.equal(store.save(data),true);assert.deepEqual(store.load().data.activities,data.activities);
  assert.equal(parseParentData(JSON.stringify(emptyParentData()))?.activities.length,0);
  const program=effectiveProgram(initialProgram,data);const all=getCompleteWordChallenges(service(program)).challenges;
  assert.deepEqual(all.filter(c=>c.activityType!=='spell'),before);
  assert.equal(all.filter(c=>c.activityType==='spell').length,2);
  const copied=duplicateActivity(data.activities[0]);assert.equal(copied.type,'spell');assert.notEqual(copied.id,data.activities[0].id);
  assert.ok(generateCompleteWordSession(service(initialProgram)).challenges.every(c=>c.activityType!=='spell'));
});
test('spell normal speech is the Word while pedagogical reading retains its construction',()=>{
  const a=make();const challenge=getCompleteWordChallenges(service({...initialProgram,activities:[a]})).challenges.find(c=>c.id===a.id)!;
  assert.equal(challenge.audioText,'lama');assert.equal(challenge.firstSegmentAudio,undefined);
  assert.deepEqual(challenge.pedagogicalReading?.segments,['la','ma']);
});
test('a single distinct letter remains a valid board, even with two required occurrences',()=>{
  const a=missing([1,3]);
  const challenge=getCompleteWordChallenges(service({...initialProgram,activities:[a]})).challenges.find(c=>c.id===a.id)!;
  assert.doesNotThrow(()=>validateChallenges([challenge],['a']));
});
