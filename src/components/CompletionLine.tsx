import type { ReactNode } from 'react';
import type { CompletionBoard } from '../game/complete-word';

// Présentation commune Parent/enfant ; les gestes et la correction restent chez l'appelant.
export function CompletionLine({ board, sentence, render, label, className }: {
  board: Pick<CompletionBoard, 'segments' | 'gaps'>; sentence: boolean; render: (index: number) => ReactNode; label?: string; className?: string;
}) {
  if (!sentence) return <div className={className ?? 'word-segments'} aria-label={label}>{board.segments.map((_, i) => render(i))}</div>;
  const groups: { indexes: number[]; before: string }[] = [];
  let current: number[] = [], before = '';
  function flush() { if (current.length) { groups.push({ indexes: current, before }); current = []; before = ''; } }
  board.segments.forEach((text, i) => {
    const gap = board.gaps?.[i] ?? '';
    if (gap) { flush(); before += gap; }
    if (/^\s+$/u.test(text)) { flush(); before += text; }
    else current.push(i);
  });
  flush();
  return <div className="sentence-line" aria-label={label}>{groups.map((group, i) => <span key={i}>
    {group.before}<span className="sentence-group">{group.indexes.map(render)}</span>
  </span>)}{before}{board.gaps?.[board.segments.length]}</div>;
}
