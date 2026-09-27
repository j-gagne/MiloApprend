import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

interface Props {
  text: string;
  disabled: boolean;
  retry: number;
  findTarget: (x: number, y: number) => number | undefined;
  onAnswer: (answer: string, slotIndex?: number) => void;
  onHover: (slotIndex: number | undefined) => void;
  onTap?: () => void;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

export function AnswerTile({ text, disabled, retry, findTarget, onAnswer, onHover, onTap, className, style, label }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!retry || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = button.current?.animate([
      { transform: 'translateY(0)' }, { transform: 'translateY(-9px) rotate(-4deg)' },
      { transform: 'translateY(0) rotate(3deg)' }, { transform: 'translateY(0)' },
    ], { duration: 340, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [retry]);

  function clear() { drag.current = null; setPosition(null); onHover(undefined); }
  function tap() { if (onTap) onTap(); else onAnswer(text); }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    current.moved ||= Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8;
    if (current.moved) {
      setPosition({ x: event.clientX, y: event.clientY });
      onHover(findTarget(event.clientX, event.clientY));
    }
  }

  return <>
    <button type="button" ref={button} className={`${className ?? 'answer-tile'} ${position ? 'dragging' : ''}`} style={style} disabled={disabled}
      aria-label={label ?? `Choisir ${text}`} onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (disabled || !event.isPrimary || event.button !== 0) return;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const slotIndex = findTarget(event.clientX, event.clientY);
        clear();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (!current.moved) tap();
        else if (slotIndex !== undefined) onAnswer(text, slotIndex);
      }}
      onPointerCancel={clear}
      onLostPointerCapture={clear}
      onClick={(event) => {
        // PointerUp already submits mouse/touch. A synthetic click can land on a
        // different tile after consumption; only keyboard/accessibility clicks submit here.
        if (event.detail === 0) tap();
      }}
    >{text}</button>
    {position && <div className="drag-ghost" aria-hidden="true" style={{ left: position.x, top: position.y }}>{text}</div>}
  </>;
}
