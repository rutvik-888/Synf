import { useEffect } from 'react';

/**
 * Applies a magnetic hover effect to every element matching the selector.
 * Elements gently pull toward the cursor on hover and snap back on leave.
 * Respects pointer:coarse and prefers-reduced-motion.
 */
export function useMagneticHover(selector = '[data-magnetic], .btn-primary, .btn-acid, .nav-link-magnetic a') {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const handlers: Array<{ el: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = [];

    els.forEach((el) => {
      const strength = parseFloat(el.dataset.magneticStrength || '0.25');
      const move = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      };
      const leave = () => {
        el.style.transform = 'translate(0, 0)';
      };
      el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.willChange = 'transform';
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', leave);
      handlers.push({ el, move, leave });
    });

    return () => {
      handlers.forEach(({ el, move, leave }) => {
        el.removeEventListener('mousemove', move);
        el.removeEventListener('mouseleave', leave);
      });
    };
  }, [selector]);
}
