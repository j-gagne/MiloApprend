import { chainParentData } from './chain-program.ts';
import { initialProgram } from '../../src/content/program.ts';
import { effectiveProgram } from '../../src/parent/model.ts';
import { newSpellActivity } from '../../src/content/spelling.ts';
import type { Word } from '../../src/content/model.ts';
export function spellParentData(mode: 'individual'|'chain'='individual', missing=[0,1,2,3]) {
  const data=chainParentData(mode==='chain'?2:1);
  const program=effectiveProgram(initialProgram,data);
  const word=program.units.find((u):u is Word=>u.id==='parent-word-chain-lama'&&u.type==='word')!;
  const all=newSpellActivity(program,word,6,'parent-activity-spell-lama');
  const spell={...all,missingPositions:missing,letterUnitIds:Object.fromEntries(missing.map(i=>[i,all.letterUnitIds[i]])),distractorUnitIds:['letter-i','letter-o']};
  return {...data,gameMode:mode,activities:[spell,...data.activities.slice(1)]};
}
