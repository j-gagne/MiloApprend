import type { PronunciationSegment } from '../game/reading-session';

export type SilentRange = readonly [number, number];

/** Align only the explicit, ordered segmentation; never guess silence from spelling. */
export function silentRanges(display: string, segments: readonly PronunciationSegment[], sentence = false): SilentRange[] {
  if (!segments.some(segment => segment.silent)) return [];
  const ranges: SilentRange[] = [];
  let offset = 0;
  for (const segment of segments) {
    if (sentence && !display.startsWith(segment.text, offset)) offset += display.slice(offset).match(/^\s*/u)![0].length;
    if (!display.startsWith(segment.text, offset)) return [];
    if (segment.silent) ranges.push([offset, offset + segment.text.length]);
    offset += segment.text.length;
  }
  return /^[\s.!?…]*$/u.test(display.slice(offset)) ? ranges : [];
}

export function SilentText({ text, ranges, offset = 0 }: { text: string; ranges: readonly SilentRange[]; offset?: number }) {
  const parts = [];
  let cursor = 0;
  for (const [from, to] of ranges) {
    const start = Math.max(0, from - offset), end = Math.min(text.length, to - offset);
    if (end <= start) continue;
    parts.push(text.slice(cursor, start), <span className="silent-segment" key={from}>{text.slice(start, end)}</span>);
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
