import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LaunchConfig } from '@/lib/launchConfig';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calcTimeLeft(target: number): TimeLeft | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="font-display text-[clamp(2.5rem,12vw,7rem)] font-extrabold tabular-nums leading-none tracking-tightest">
          <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
            {display}
          </span>
        </div>
        <div className="absolute inset-0 -z-10 blur-2xl bg-synf-500/20 rounded-full" />
      </div>
      <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export function ComingSoon({ config, onLaunch }: { config: LaunchConfig; onLaunch: () => void }) {
  const target = new Date(config.launch_date!).getTime();
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calcTimeLeft(target));
  const [launched, setLaunched] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calcTimeLeft(target);
      if (!remaining && !launched) {
        setLaunched(true);
        setTimeout(() => onLaunch(), 3500);
      }
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [target, launched, onLaunch]);

  // Aurora background canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let w = 0, h = 0, dpr = 1;
    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let t = 0;

    function draw() {
      if (!ctx) return;
      t += 0.003;
      ctx.clearRect(0, 0, w, h);

      // Three flowing aurora blobs
      const blobs = [
        { cx: w * 0.3 + Math.sin(t) * 120, cy: h * 0.35 + Math.cos(t * 0.7) * 80, color: '255,45,111', r: Math.max(200, w * 0.35) },
        { cx: w * 0.7 + Math.sin(t * 1.1) * 140, cy: h * 0.55 + Math.cos(t * 0.9) * 100, color: '168,85,247', r: Math.max(200, w * 0.3) },
        { cx: w * 0.5 + Math.sin(t * 0.8) * 100, cy: h * 0.7 + Math.cos(t * 1.3) * 60, color: '34,184,255', r: Math.max(180, w * 0.25) },
      ];

      blobs.forEach(b => {
        const grad = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r);
        grad.addColorStop(0, `rgba(${b.color},0.12)`);
        grad.addColorStop(0.5, `rgba(${b.color},0.04)`);
        grad.addColorStop(1, `rgba(${b.color},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    await supabase.from('subscribers').insert({ email, source: 'launch_waitlist' });
    setSubmitting(false);
    setSubmitted(true);
  }, [email, submitting]);

  // Launch moment overlay
  if (launched) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-ink-950">
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />

        {/* Expanding glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] animate-pulse-slow"
          style={{ width: '80rem', height: '80rem', background: 'radial-gradient(circle, rgba(255,45,111,0.3), rgba(168,85,247,0.15), transparent 70%)' }}
        />

        <div className="relative flex flex-col items-center" style={{ animation: 'launchReveal 1.5s cubic-bezier(0.2,0.8,0.2,1) both' }}>
          <Sparkles size={48} className="text-synf-400 animate-pulse-slow" />
          <h1 className="mt-6 font-display text-[clamp(3rem,15vw,10rem)] font-extrabold leading-none tracking-tightest">
            <span className="bg-gradient-to-r from-synf-400 via-white to-acid-400 bg-clip-text text-transparent">
              We're Live
            </span>
          </h1>
          <p className="mt-4 text-sm text-white/50 font-mono uppercase tracking-[0.3em]">Entering the experience</p>
        </div>

        <style>{`@keyframes launchReveal { 0% { opacity: 0; transform: scale(0.5) blur(20px); } 100% { opacity: 1; transform: scale(1) blur(0); } }`}</style>
      </div>
    );
  }

  const headline = config.headline || 'Something extraordinary is coming';
  const subheadline = config.subheadline || 'Team Synf — We don\u2019t do ordinary.';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-ink-950">
      {/* Aurora background */}
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Film grain */}
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.12]" />

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(8,7,10,0.8)_100%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Eyebrow */}
        <div className="mb-8 flex items-center gap-3 animate-fade-in">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-synf-500" />
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-synf-400 sm:text-xs">Team Synf</span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-synf-500" />
        </div>

        {/* Headline */}
        <h1
          className="font-display text-[clamp(2rem,8vw,5rem)] font-extrabold leading-[0.95] tracking-tightest text-balance animate-fade-up"
        >
          {headline}
        </h1>

        {/* Subheadline */}
        <p className="mt-4 max-w-md text-sm text-white/50 sm:text-base animate-fade-up" style={{ animationDelay: '0.15s' }}>
          {subheadline}
        </p>

        {/* Countdown */}
        {timeLeft && (
          <div className="mt-10 flex items-center gap-4 sm:gap-8 md:gap-12 animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <CountdownUnit value={timeLeft.days} label="Days" />
            <span className="font-display text-3xl text-white/20 sm:text-5xl">:</span>
            <CountdownUnit value={timeLeft.hours} label="Hours" />
            <span className="font-display text-3xl text-white/20 sm:text-5xl">:</span>
            <CountdownUnit value={timeLeft.minutes} label="Minutes" />
            <span className="font-display text-3xl text-white/20 sm:text-5xl">:</span>
            <CountdownUnit value={timeLeft.seconds} label="Seconds" />
          </div>
        )}

        {/* Email signup */}
        {config.show_email_signup && (
          <div className="mt-12 w-full max-w-sm animate-fade-up" style={{ animationDelay: '0.45s' }}>
            {submitted ? (
              <div className="flex items-center justify-center gap-2 rounded-full border border-acid-400/30 bg-acid-400/10 px-6 py-3 text-sm text-acid-400">
                <Check size={16} /> You're on the list. We'll notify you.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/30 backdrop-blur-sm focus:border-synf-400 focus:outline-none focus:ring-1 focus:ring-synf-400 transition"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary group"
                >
                  {submitting ? 'Joining…' : <>Notify me <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
                </button>
              </form>
            )}
            <p className="mt-3 text-center text-[11px] text-white/30">Be the first to know when we go live.</p>
          </div>
        )}

        {/* Bottom hint */}
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">Prepare for something different</p>
        </div>
      </div>
    </div>
  );
}
