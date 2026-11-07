import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

/** Hoe ver (px) de muis moet bewegen voor een klik een sleepbeweging wordt; touch wacht op een lange druk. */
const THRESHOLD = 5;
const LONG_PRESS_MS = 350;

export interface Drag {
  /** Index van het gesleepte akkoord. */
  from: number;
  /** De opening waar het terechtkomt: 0 = vooraan, n = achteraan; null = nog boven niets. */
  gap: number | null;
  /** Alt/Option ingedrukt: kopiëren in plaats van verplaatsen. */
  copy: boolean;
}

/**
 * Akkoorden in het schema verslepen met pointer events (muis, pen en touch).
 * Elke cel heeft data-idx (het akkoord) en data-start (de eerste cel van dat akkoord).
 * Met de muis start slepen na een kleine beweging. Met touch na een lange druk, zodat gewoon scrollen blijft werken.
 * onDrop krijgt de opening; een gewone klik blijft een klik.
 */
export function useChartDrag(chartRef: RefObject<HTMLElement>, onDrop: (from: number, to: number, copy: boolean) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const press = useRef<{ from: number; x: number; y: number; id: number; touch: boolean; timer?: number } | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  /** Na een sleepbeweging volgt nog een click-event: dat negeren we één keer. */
  const swallowClick = useRef(false);
  /** Het click-event volgt meteen op pointerup; komt het niet (losgelaten buiten de knop), dan vervalt de vlag. */
  const swallow = () => {
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
  };
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  /** Opening onder het punt: links van het midden van een cel = ervoor, rechts = erna. */
  const gapAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-idx]');
    if (!el || !chartRef.current?.contains(el)) return dragRef.current?.gap ?? null;
    const r = el.getBoundingClientRect();
    const idx = Number(el.dataset.idx);
    return x < r.left + r.width / 2 ? idx : idx + 1;
  };

  useEffect(() => {
    const begin = (x: number, y: number, copy: boolean) => {
      const p = press.current;
      if (!p) return;
      setDrag({ from: p.from, gap: gapAt(x, y), copy });
    };
    const move = (e: PointerEvent) => {
      const p = press.current;
      if (!p || e.pointerId !== p.id) return;
      if (dragRef.current) { setDrag({ ...dragRef.current, gap: gapAt(e.clientX, e.clientY), copy: e.altKey }); return; }
      const far = Math.hypot(e.clientX - p.x, e.clientY - p.y) > THRESHOLD;
      if (!far) return;
      // touch die beweegt voor de lange druk voorbij is: dat is scrollen, geen slepen
      if (p.touch) { clearTimeout(p.timer); press.current = null; return; }
      begin(e.clientX, e.clientY, e.altKey);
    };
    const up = (e: PointerEvent) => {
      const p = press.current;
      if (!p || e.pointerId !== p.id) return;
      clearTimeout(p.timer);
      press.current = null;
      const d = dragRef.current;
      if (!d) return;
      swallow();
      setDrag(null);
      if (d.gap !== null) onDropRef.current(d.from, d.gap, d.copy);
    };
    const cancel = () => {
      if (press.current) clearTimeout(press.current.timer);
      press.current = null;
      setDrag(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current) { swallow(); cancel(); }
      else if (e.key === 'Alt' && dragRef.current) setDrag({ ...dragRef.current, copy: e.type === 'keydown' });
    };
    // tijdens het slepen met touch mag de pagina niet scrollen; daarvoor moet deze listener niet-passief zijn
    const touchMove = (e: TouchEvent) => { if (dragRef.current) e.preventDefault(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    window.addEventListener('touchmove', touchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      window.removeEventListener('touchmove', touchMove);
    };
  }, []);

  /** Op de eerste cel van een akkoord: hier kan een sleepbeweging beginnen. */
  const onPointerDown = (index: number) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const touch = e.pointerType === 'touch';
    const p = { from: index, x: e.clientX, y: e.clientY, id: e.pointerId, touch, timer: undefined as number | undefined };
    if (touch) {
      const { clientX, clientY } = e;
      p.timer = window.setTimeout(() => {
        if (press.current === p) setDrag({ from: index, gap: gapAt(clientX, clientY), copy: false });
      }, LONG_PRESS_MS);
    }
    press.current = p;
  };

  /** true als deze klik het einde van een sleepbeweging was (en dus niet moet selecteren). */
  const consumeClick = () => {
    const s = swallowClick.current;
    swallowClick.current = false;
    return s;
  };

  return { drag, onPointerDown, consumeClick };
}
