import { useLayoutEffect, useRef, useState } from 'react';
import { READING_THRESHOLD } from '../game/reading-session';
import { PronunciationSlider } from './PronunciationSlider';

export interface SentenceProgress {
  values: number[];
  reached: boolean[];
}
interface Line { start: number; end: number; scale: number }

/** Visual lines only: neither the shared sentence nor its pronunciation configuration is edited. */
export function ReadingSentence({ display, ready, progress, onProgress, onComplete }: {
  display: string; ready: boolean; progress?: SentenceProgress;
  onProgress: (progress: SentenceProgress) => void; onComplete: () => void;
}) {
  const words = display.match(/\s*\S+\s*/gu) ?? [display];
  // A word per line is a usable fallback when layout measurement is unavailable.
  const [lines, setLines] = useState<Line[]>(() => words.map((_, i) => ({ start: i, end: i + 1, scale: 1 })));
  const [state, setState] = useState<SentenceProgress>(() => progress ?? {
    values: words.map(() => 0), reached: words.map(() => false),
  });
  const current = useRef(state);
  const container = useRef<HTMLDivElement>(null);
  const sample = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    let disposed = false;
    function measure() {
      if (disposed || !container.current || !sample.current?.firstChild) return;
      const available = container.current.clientWidth;
      if (available <= 0) return;
      const tokens = display.match(/\s*\S+\s*/gu) ?? [display];
      const offsets = [0];
      for (const token of tokens) offsets.push(offsets[offsets.length - 1] + token.length);
      const range = document.createRange();
      function width(start: number, end: number) {
        range.setStart(sample.current!.firstChild!, offsets[start]);
        // Spaces remain in the DOM, but trailing whitespace need not occupy the line.
        const trailing = tokens[end - 1].match(/\s+$/u)?.[0].length ?? 0;
        range.setEnd(sample.current!.firstChild!, offsets[end] - trailing);
        return range.getBoundingClientRect().width;
      }
      try {
        if (!(width(0, tokens.length) > 0)) return;
        const next: Line[] = [];
        let start = 0;
        for (let end = 1; end <= tokens.length; end++) {
          if (end > start + 1 && width(start, end) > available) {
            next.push({ start, end: end - 1, scale: Math.min(1, available / width(start, end - 1)) });
            start = end - 1;
          }
        }
        next.push({ start, end: tokens.length, scale: Math.min(1, available / width(start, tokens.length)) });
        setLines(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      } catch { /* Keep independent word lines if DOM measurement is unavailable. */ }
    }
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(container.current!);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => {
      disposed = true; observer?.disconnect(); window.removeEventListener('resize', measure);
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [display]);

  function move(line: Line, value: number) {
    if (!ready) return;
    const before = current.current;
    const next = {
      values: before.values.map((old, i) => i >= line.start && i < line.end ? value : old),
      reached: before.reached.map((old, i) => old || (i >= line.start && i < line.end && value >= READING_THRESHOLD)),
    };
    current.current = next; setState(next); onProgress(next);
    if (!before.reached.every(Boolean) && next.reached.every(Boolean)) onComplete();
  }

  return <div className="reading-sentence-lines" ref={container}>
    <span className="reading-line-measure-box" aria-hidden="true"><span ref={sample} className="reading-text reading-line-measure">{display}</span></span>
    {lines.map((line, lineIndex) => {
      const value = Math.min(...state.values.slice(line.start, line.end));
      const text = words.slice(line.start, line.end).join('');
      return <div className="reading-line" key={`${line.start}:${line.end}`}>
        <span className="reading-text" style={{ fontSize: `${line.scale}em` }}>
          {words.slice(line.start, line.end).map((word, i) => <span key={line.start + i}
            className={`reading-line-word${value > 0 && i < (line.end - line.start) * value / 100 ? ' is-read' : ''}`}>{i === line.end - line.start - 1 ? word.trimEnd() : word}</span>)}
        </span>
        <PronunciationSlider label={`Prononcer ${text.trim()}, ligne ${lineIndex + 1}`}
          value={value} disabled={!ready} onChange={value => move(line, value)} />
      </div>;
    })}
  </div>;
}
