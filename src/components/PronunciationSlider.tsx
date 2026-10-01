import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

export function PronunciationSlider({ label, value, disabled = false, onChange }: {
  label: string; value: number; disabled?: boolean; onChange: (value: number) => void;
}) {
  const drag = useRef<{ id: number; x: number; value: number; distance: number } | undefined>(undefined);
  function move(event: PointerEvent<HTMLDivElement>) {
    const origin = drag.current;
    if (disabled || !origin || origin.id !== event.pointerId) return;
    onChange(Math.max(0, Math.min(100, origin.value + (event.clientX - origin.x) / origin.distance * 100)));
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const next = { ArrowRight: value + 10, ArrowUp: value + 10, ArrowLeft: value - 10,
      ArrowDown: value - 10, Home: 0, End: 100, PageUp: value + 20, PageDown: value - 20 }[event.key];
    if (disabled || next === undefined) return;
    event.preventDefault(); onChange(Math.max(0, Math.min(100, next)));
  }
  return <div className="pronunciation-slider" role="slider" tabIndex={disabled ? -1 : 0}
    aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-orientation="horizontal"
    aria-disabled={disabled} style={{ '--reading-fill': `${value}%`, '--reading-position': value / 100 } as CSSProperties} onKeyDown={key}
    onPointerDown={event => {
      if (disabled || drag.current || event.button !== 0 || !(event.target as HTMLElement).closest('.pronunciation-thumb')) return;
      event.preventDefault(); event.currentTarget.focus();
      const thumb = event.currentTarget.querySelector('.pronunciation-thumb')!.getBoundingClientRect();
      const capsule = getComputedStyle(event.currentTarget);
      drag.current = { id: event.pointerId, x: event.clientX, value,
        distance: Math.max(1, event.currentTarget.getBoundingClientRect().width - thumb.width
          - parseFloat(capsule.paddingLeft) - parseFloat(capsule.paddingRight)) };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={move} onPointerUp={event => {
      move(event); drag.current = undefined;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={() => { drag.current = undefined; }} onLostPointerCapture={() => { drag.current = undefined; }}>
    <span className="pronunciation-rail" aria-hidden="true"><span /></span>
    <span className="pronunciation-thumb" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg></span>
  </div>;
}
