import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radio, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ParticleField } from '@/components/ParticleField';
import { useSiteSections } from '@/lib/useSiteSections';

export function NotFound() {
  const [mounted, setMounted] = useState(false);
  const [eventsVisible, setEventsVisible] = useState(true);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isVisible } = useSiteSections();

  useEffect(() => {
    setMounted(true);
    // Check if events section is visible
    (async () => {
      const { data } = await supabase
        .from('site_sections')
        .select('is_visible')
        .eq('key', 'events')
        .maybeSingle();
      if (data) setEventsVisible(data.is_visible);
    })();
  }, []);

  // Subtle signal-interference glitch — fires briefly on interval
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const interval = setInterval(() => {
      setGlitchOffset({
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 3,
      });
      setTimeout(() => setGlitchOffset({ x: 0, y: 0 }), 80);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  // Pointer-responsive background shift
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--shift-x', `${x * 20}px`);
      el.style.setProperty('--shift-y', `${y * 20}px`);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-6 text-center"
      style={{ ['--shift-x' as string]: '0px', ['--shift-y' as string]: '0px' }}
    >
      {/* Deep atmospheric background */}
      <div
        className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: 'translate(var(--shift-x), var(--shift-y))' }}
      >
        <div className="absolute left-1/4 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-synf-500/8 blur-[140px]" />
        <div className="absolute right-1/4 bottom-1/3 h-[35rem] w-[35rem] translate-x-1/2 translate-y-1/2 rounded-full bg-violet-500/6 blur-[140px]" />
      </div>

      {/* Particle dust */}
      <ParticleField density="low" interactive colorPalette="synf" />

      {/* Film grain */}
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.08]" />

      {/* Signal scanline — subtle horizontal drift */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-synf-500/20 to-transparent"
          style={{ top: '40%', animation: 'synfScanline 8s ease-in-out infinite' }}
        />
      </div>

      <div className="relative max-w-3xl">
        {/* Signal indicator */}
        <div
          className={`mb-8 inline-flex items-center gap-2.5 rounded-full border border-synf-500/20 bg-synf-500/5 px-5 py-2 transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          <Radio size={14} className="text-synf-400 animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-synf-400">Signal Lost</span>
        </div>

        {/* Oversized 404 — the centerpiece */}
        <div className="relative">
          <h1
            className="font-display font-extrabold leading-[0.8] tracking-tightest select-none"
            style={{
              fontSize: 'clamp(8rem, 28vw, 22rem)',
              transform: `translate(${glitchOffset.x}px, ${glitchOffset.y}px)`,
              transition: 'transform 0.08s ease-out',
            }}
          >
            <span
              className="block text-transparent"
              style={{
                WebkitTextStroke: '2px rgba(255,255,255,0.12)',
              }}
            >
              404
            </span>
          </h1>

          {/* Glitch duplicate layers behind */}
          <span
            aria-hidden
            className="absolute inset-0 font-display font-extrabold leading-[0.8] tracking-tightest text-synf-500/15 select-none"
            style={{ fontSize: 'clamp(8rem, 28vw, 22rem)', transform: `translate(${glitchOffset.x * -2}px, ${glitchOffset.y * -2}px)` }}
          >
            404
          </span>
          <span
            aria-hidden
            className="absolute inset-0 font-display font-extrabold leading-[0.8] tracking-tightest text-electric-400/10 select-none"
            style={{ fontSize: 'clamp(8rem, 28vw, 22rem)', transform: `translate(${glitchOffset.x * 2}px, ${glitchOffset.y * 2}px)` }}
          >
            404
          </span>

          {/* Glow behind the 404 */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center">
            <div className="h-[18rem] w-[18rem] rounded-full bg-synf-500/10 blur-[100px]" />
          </div>
        </div>

        {/* Headline */}
        <h2
          className={`mt-2 font-display text-2xl font-extrabold tracking-tightest transition-all duration-700 delay-200 sm:text-4xl ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          YOU LEFT THE <span className="text-gradient-vibe">SIGNAL.</span>
        </h2>

        {/* Copy */}
        <p
          className={`mx-auto mt-6 max-w-md text-base leading-relaxed text-white/55 transition-all duration-700 delay-300 sm:text-lg ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          This page doesn't exist in our universe. The night is still young. Let's get you back.
        </p>

        {/* Actions */}
        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-3 transition-all duration-700 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          <Link to="/" className="btn-primary btn-lg group" data-magnetic>
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Synf
          </Link>
          {eventsVisible && isVisible('events') && (
            <Link to="/events" className="btn-ghost btn-lg group" data-magnetic>
              Explore events
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        {/* Footer detail */}
        <div
          className={`mt-16 flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-[0.3em] text-ink-600 transition-all duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="h-px w-12 bg-white/5" />
          Error 404 · Lost In The Synf Frequency
          <span className="h-px w-12 bg-white/5" />
        </div>
      </div>

      <style>{`
        @keyframes synfScanline {
          0%, 100% { transform: translateY(0); opacity: 0; }
          50% { transform: translateY(40vh); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
