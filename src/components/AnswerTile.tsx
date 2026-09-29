import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface Props {
  text: string;
  disabled: boolean;
  retry: number;
  gestureKey?: string;
  findTarget: (x: number, y: number) => number | undefined;
  onAnswer: (answer: string, slotIndex?: number) => void;
  onHover: (slotIndex: number | undefined) => void;
  onTap?: () => void;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

export function AnswerTile({ text, disabled, retry, gestureKey, findTarget, onAnswer, onHover, onTap, className, style, label }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean; element: HTMLButtonElement } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const latest = useRef({ text, disabled, findTarget, onAnswer, onHover, onTap });
  useLayoutEffect(() => { latest.current = { text, disabled, findTarget, onAnswer, onHover, onTap }; });

  const clear = useCallback(() => {
    const current = drag.current;
    // Clear before releasing capture: lostpointercapture can re-enter this handler.
    drag.current = null;
    setPosition(null);
    if (!current) return;
    latest.current.onHover(undefined);
    try {
      if (current.element.hasPointerCapture(current.id)) current.element.releasePointerCapture(current.id);
    } catch { /* The browser may already have invalidated the interrupted pointer. */ }
  }, []);

  useLayoutEffect(() => { clear(); return clear; }, [disabled, gestureKey, clear]);
  useEffect(() => {
    function move(event: PointerEvent) {
      const current = drag.current;
      if (!current || current.id !== event.pointerId) return;
      current.moved ||= Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8;
      if (current.moved) {
        setPosition({ x: event.clientX, y: event.clientY });
        latest.current.onHover(latest.current.findTarget(event.clientX, event.clientY));
      }
    }
    function finish(event: PointerEvent) {
      const current = drag.current;
      if (!current || current.id !== event.pointerId) return;
      clear();
      const props = latest.current;
      if (props.disabled) return;
      if (!current.moved) { if (props.onTap) props.onTap(); else props.onAnswer(props.text); }
      else {
        const slot = props.findTarget(event.clientX, event.clientY);
        if (slot !== undefined) props.onAnswer(props.text, slot);
      }
    }
    function cancel(event: PointerEvent) { if (drag.current?.id === event.pointerId) clear(); }
    function visibility() { if (document.visibilityState !== 'visible') clear(); }
    // Window listeners also receive a release outside the tile if capture is interrupted.
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('blur', clear);
    window.addEventListener('pagehide', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', finish, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('blur', clear);
      window.removeEventListener('pagehide', clear);
      document.removeEventListener('visibilitychange', visibility);
      clear();
    };
  }, [clear]);

  useEffect(() => {
    if (!retry || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = button.current?.animate([
      { transform: 'translateY(0)' }, { transform: 'translateY(-9px) rotate(-4deg)' },
      { transform: 'translateY(0) rotate(3deg)' }, { transform: 'translateY(0)' },
    ], { duration: 340, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [retry]);

  return <>
    <button type="button" ref={button} className={`${className ?? 'answer-tile'} ${position ? 'dragging' : ''}`} style={style} disabled={disabled}
      aria-label={label ?? `Choisir ${text}`} onContextMenu={(event) => { event.preventDefault(); clear(); }}
      onDragStart={(event) => { event.preventDefault(); clear(); }}
      onPointerDown={(event) => {
        if (disabled || !event.isPrimary || event.button !== 0) return;
        clear();
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, element: event.currentTarget };
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { clear(); }
      }}
      onLostPointerCapture={(event) => { if (drag.current?.id === event.pointerId) clear(); }}
      onClick={(event) => {
        // PointerUp already submits mouse/touch. Only keyboard/accessibility clicks submit here.
        if (!disabled && event.detail === 0) { clear(); if (onTap) onTap(); else onAnswer(text); }
      }}
    >{text}</button>
    {position && <div className="drag-ghost" aria-hidden="true" style={{ left: position.x, top: position.y }}>{text}</div>}
  </>;
}
