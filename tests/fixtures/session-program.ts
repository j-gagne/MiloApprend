import { chainParentData } from './chain-program.ts';
import { initialProgram } from '../../src/content/program.ts';
import { effectiveProgram } from '../../src/parent/model.ts';
import { automaticActivities } from '../../src/content/activity-catalog.ts';
import type { Word } from '../../src/content/model.ts';
import type { GameMode } from '../../src/game/play-settings.ts';

export function sessionParentData(gameMode: GameMode) {
  const previous = chainParentData();
  const extra = ['word-lune', 'word-nid', 'word-ami'].map((id) => {
    const original = initialProgram.units.find((unit): unit is Word => unit.id === id && unit.type === 'word')!;
    const { completeWord, ...word } = original;
    return { word: { ...word, id: `parent-${id}-session`, introducedInWeek: 6, tags: ['practice'] }, variant: completeWord![0] };
  });
  const data = { ...previous, gameMode, questionCount: 6,
    customUnits: [...previous.customUnits, ...extra.map((e) => e.word)],
    activities: [...previous.activities, ...extra.map(({ word, variant }) => ({ ...variant,
      id: `parent-activity-${word.id}`, type: 'complete-segments' as const, targetId: word.id }))] };
  return { ...data, activities: data.activities.map((activity, index) => ({ ...activity, order: index + 1 })),
    activityEnabled: Object.fromEntries(automaticActivities(effectiveProgram(initialProgram, data), 6).map((a) => [a.id, false])) };
}
