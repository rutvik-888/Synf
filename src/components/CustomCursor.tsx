import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let visible = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) { visible = true; setHidden(false); }
      const t = e.target as HTMLElement;
      setHovering(!!t.closest('a, button, [role="button"], [data-cursor="hover"]'));
    };
    const onLeave = () => setHidden(true);
    const onDown = () => setHovering(true);
    const onUp = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setHovering(!!t.closest('a, button, [role="button"], [data-cursor="hover"]'));
    };

    const loop = () => {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[90] hidden md:block transition-opacity duration-300 ${hidden ? 'opacity-0' : 'opacity-100'}`}
    >
      <div
        ref={ringRef}
        className={`fixed left-0 top-0 rounded-full border-2 transition-[width,height,background-color,border-color] duration-200 ${
          hovering
            ? 'h-10 w-10 border-acid-400/70 bg-acid-400/10'
            : 'h-7 w-7 border-synf-500/60'
        }`}
      />
    </div>
  );
}
