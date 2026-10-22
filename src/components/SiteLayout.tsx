import { Link, NavLink, Outlet } from 'react-router-dom';
import { Instagram, Menu, X, ArrowUp, ArrowRight } from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { ScrollProgress } from '@/components/ScrollProgress';
import { useFavicon } from '@/lib/favicon';
import { SynfMark } from '@/components/SynfMark';
import { useSiteSections } from '@/lib/useSiteSections';
import { useMagneticHover } from '@/lib/useMagneticHover';
import { PageTransition } from '@/components/PageTransition';

type NavItem = { to: string; label: string; section: string | null };

// The six primary navigation links — exact order as specified
const PRIMARY_NAV: NavItem[] = [
  { to: '/about', label: 'About', section: 'about' },
  { to: '/people', label: 'The Collective', section: 'people' },
  { to: '/events', label: 'Events', section: 'events' },
  { to: '/collaborate', label: 'Collaborate', section: 'collaborate' },
  { to: '/jobs', label: 'Join', section: 'jobs' },
  { to: '/contact', label: 'Contact', section: 'contact' },
];

// Secondary destinations — shown only in the hamburger menu, only if visible
const SECONDARY_NAV: NavItem[] = [
  { to: '/community', label: 'Community Wall', section: 'community' },
  { to: '/goods', label: 'Synf Goods', section: 'goods' },
  { to: '/pass', label: 'Synf Pass', section: 'pass' },
];

export function SiteLayout() {
  useFavicon();
  const { isVisible, sections } = useSiteSections();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const primary = useMemo(() => PRIMARY_NAV.filter(n => n.section === null || isVisible(n.section)), [sections, isVisible]);
  const secondary = useMemo(() => SECONDARY_NAV.filter(n => n.section === null || isVisible(n.section)), [sections, isVisible]);
  const allVisible = useMemo(() => [...primary, ...secondary], [primary, secondary]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 30);
        setShowTop(window.scrollY > 800);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useMagneticHover();

  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <ScrollProgress />

      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${scrolled ? 'glass-dark border-b border-white/10' : 'bg-gradient-to-b from-ink-950/80 to-transparent'}`}>
        <nav className="container-synf flex h-16 items-center justify-between md:h-20">
          {/* Logo — always links home */}
          <Link to="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)} data-magnetic data-magnetic-strength="0.1">
            <span className="grid h-9 w-20 place-items-center overflow-hidden rounded-lg bg-white transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px] group-hover:shadow-synf-500/60">
              <SynfMark className="h-9 w-20 object-cover" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tightest transition-colors group-hover:text-synf-400">SYNF</span>
          </Link>

          {/* Primary navigation — 6 links max */}
          <div className="hidden items-center gap-0.5 md:flex nav-link-magnetic">
            {primary.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-magnetic
                data-magnetic-strength="0.15"
                className={({ isActive }) =>
                  `relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${isActive ? 'text-white' : 'text-white/60 hover:text-white'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {n.label}
                    {isActive && <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-synf-500/20 to-violet-500/20 ring-1 ring-synf-500/30" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right side — Instagram + hamburger (always visible) */}
          <div className="flex items-center gap-2">
            <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="hidden btn-ghost px-4 py-2 group sm:inline-flex">
              <Instagram size={16} className="transition-transform group-hover:scale-110" /> Instagram
            </a>
            <button
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 transition-colors hover:border-synf-500/40"
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <div className="flex flex-col gap-1.5">
                <span className={`block h-0.5 w-5 bg-white transition-all duration-300 ${open ? 'translate-y-2 rotate-45' : ''}`} />
                <span className={`block h-0.5 w-5 bg-white transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 w-5 bg-white transition-all duration-300 ${open ? '-translate-y-2 -rotate-45' : ''}`} />
              </div>
            </button>
          </div>
        </nav>
      </header>

      {/* Hamburger overlay — full-screen drawer, works on all viewport sizes */}
      {open && (
        <div className="fixed inset-0 z-30 bg-ink-950/98 backdrop-blur-2xl animate-fade-in" ref={drawerRef}>
          <div className="grain pointer-events-none absolute inset-0 opacity-10" />
          <div className="absolute left-0 top-0 h-1/2 w-full bg-gradient-to-br from-synf-600/15 to-transparent" />
          <div className="absolute bottom-0 right-0 h-1/2 w-2/3 bg-gradient-to-tl from-violet-500/15 to-transparent" />

          {/* Close button in the overlay */}
          <button
            className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-synf-500/40 hover:text-synf-400"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>

          <div className="relative flex min-h-full flex-col items-center justify-center gap-1.5 px-6 py-20">
            {/* Primary links — larger */}
            {primary.map((n, i) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `font-display text-4xl font-extrabold tracking-tightest transition-all hover:text-synf-400 sm:text-5xl ${isActive ? 'text-gradient-vibe' : 'text-white/70'} animate-fade-up`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {n.label}
              </NavLink>
            ))}

            {/* Secondary links — smaller, only if any visible */}
            {secondary.length > 0 && (
              <>
                <div className="my-4 flex items-center gap-3 opacity-50">
                  <span className="h-px w-8 bg-white/20" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">More</span>
                  <span className="h-px w-8 bg-white/20" />
                </div>
                {secondary.map((n, i) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => `font-display text-2xl font-bold tracking-tight transition-all hover:text-synf-400 sm:text-3xl ${isActive ? 'text-synf-400' : 'text-white/50'} animate-fade-up`}
                    style={{ animationDelay: `${(primary.length + i) * 60}ms` }}
                  >
                    {n.label}
                  </NavLink>
                ))}
              </>
            )}

            <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="btn-ghost mt-8 animate-fade-up" style={{ animationDelay: `${allVisible.length * 60}ms` }} onClick={() => setOpen(false)}>
              <Instagram size={18} /> @team.synf
            </a>
          </div>
        </div>
      )}

      <main className="pt-16 md:pt-20">
        <PageTransition key={undefined}>
          <Outlet />
        </PageTransition>
      </main>

      <SiteFooter nav={allVisible} />

      {/* Back to top — poster stamp */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`group fixed bottom-6 right-6 z-40 transition-all duration-500 ${showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-20 opacity-0'}`}
        aria-label="Scroll to top"
        data-magnetic
      >
        <div className="relative h-16 w-16 poster-stamp">
          <div className="poster-stamp-inner flex h-full w-full flex-col items-center justify-center gap-0.5 text-white">
            <ArrowUp size={18} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
            <span className="text-[7px] font-mono font-bold uppercase tracking-widest">Return</span>
          </div>
        </div>
        <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono uppercase tracking-widest text-synf-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">Back to top</span>
      </button>
    </div>
  );
}

function SiteFooter({ nav }: { nav: NavItem[] }) {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-ink-950">
      <div className="grain pointer-events-none absolute inset-0 opacity-5" />
      <div className="absolute -bottom-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-synf-500/10 via-violet-500/10 to-electric-500/10 blur-[120px]" />

      <div className="container-synf relative py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="group flex items-center gap-2.5">
              <span className="grid h-12 w-32 place-items-center overflow-hidden rounded-lg bg-white transition-transform group-hover:scale-105">
                <SynfMark className="h-12 w-32 object-cover" />
              </span>
              <span className="font-display text-2xl font-extrabold tracking-tightest">TEAM SYNF</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
              Student-led collective. Parties, nightlife, DJ nights, music events and curated experiences. We don't do ordinary.
            </p>
            <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="group mt-5 inline-flex items-center gap-2 text-sm text-synf-400 hover:text-synf-300">
              <Instagram size={16} className="transition-transform group-hover:scale-110" /> @team.synf
            </a>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              {nav.map(n => <li key={n.to}><Link to={n.to} className="text-white/60 transition-colors hover:text-synf-400">{n.label}</Link></li>)}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Legal</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/terms" className="text-white/60 transition-colors hover:text-synf-400">Terms</Link></li>
              <li><Link to="/privacy" className="text-white/60 transition-colors hover:text-synf-400">Privacy</Link></li>
              <li><Link to="/copyright" className="text-white/60 transition-colors hover:text-synf-400">Copyright</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/5 pt-6 text-xs text-ink-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Team Synf. All rights reserved.</p>
          <p className="font-mono uppercase tracking-widest">Student-led · Collaborative · Creative</p>
        </div>
      </div>
    </footer>
  );
}
