import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkle: number;
  hue: number;
};

type ParticleFieldProps = {
  density?: 'low' | 'medium' | 'high';
  interactive?: boolean;
  className?: string;
  colorPalette?: 'synf' | 'mono' | 'mixed';
};

const PALETTES: Record<string, string[]> = {
  synf: ['255,45,111', '168,85,247', '34,184,255'],
  mono: ['255,255,255', '200,200,220'],
  mixed: ['255,45,111', '168,85,247', '212,255,63', '34,184,255'],
};

const DENSITY_COUNT: Record<string, (area: number) => number> = {
  low: (a) => Math.min(40, Math.floor(a / 28000)),
  medium: (a) => Math.min(80, Math.floor(a / 16000)),
  high: (a) => Math.min(140, Math.floor(a / 9000)),
};

// Cached glow sprites per color — avoids creating radial gradients every frame
const glowCache = new Map<string, HTMLCanvasElement>();

function getGlowSprite(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}_${radius}`;
  const cached = glowCache.get(key);
  if (cached) return cached;
  const size = Math.ceil(radius * 2);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const cx = c.getContext('2d');
  if (cx) {
    const grad = cx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grad.addColorStop(0, `rgba(${color},1)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    cx.fillStyle = grad;
    cx.fillRect(0, 0, size, size);
  }
  glowCache.set(key, c);
  return c;
}

/**
 * Canvas-based atmospheric particle field.
 * Renders drifting luminous dust that responds subtly to pointer movement.
 * Degrades gracefully — if canvas is unsupported, renders nothing.
 */
export function ParticleField({
  density = 'medium',
  interactive = true,
  className = '',
  colorPalette = 'synf',
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: -9999, y: -9999 });
  const reducedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = reduce;
    if (reduce) return;

    const palette = PALETTES[colorPalette] || PALETTES.synf;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      if (!canvas || !ctx) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = DENSITY_COUNT[density](width * height);
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.8 + 0.4,
        baseAlpha: Math.random() * 0.5 + 0.1,
        alpha: 0,
        twinkle: Math.random() * Math.PI * 2,
        hue: Math.floor(Math.random() * palette.length),
      }));
    }

    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = e.clientX - rect.left;
      pointerRef.current.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointerRef.current.x = -9999;
      pointerRef.current.y = -9999;
    };
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerout', onLeave);
    }

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const px = pointerRef.current.x;
      const py = pointerRef.current.y;
      const hasPointer = px > -1000;

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.twinkle += 0.02;

        if (hasPointer) {
          const dx = px - p.x;
          const dy = py - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const force = (180 - dist) / 180 * 0.02;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(p.twinkle));

        const color = palette[p.hue] || palette[0];
        const r = p.size;
        const glowR = r * 4;

        // Use cached glow sprite instead of creating a radial gradient per frame
        ctx.globalAlpha = p.alpha;
        const sprite = getGlowSprite(color, glowR);
        ctx.drawImage(sprite, p.x - glowR, p.y - glowR);
        ctx.globalAlpha = p.alpha * 1.5;
        ctx.fillStyle = `rgba(${color},1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      if (interactive) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerout', onLeave);
      }
    };
  }, [density, interactive, colorPalette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
