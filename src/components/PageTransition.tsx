import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Wraps page content with a cinematic fade + slide transition on route change.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [animating, setAnimating] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setDisplayChildren(children);
      return;
    }
    setAnimating(true);
    const t = setTimeout(() => {
      setDisplayChildren(children);
      setAnimating(false);
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={animating ? 'opacity-0 translate-y-3 blur-sm' : 'animate-page-enter'}
      style={{ transition: 'opacity 180ms ease-out, transform 180ms ease-out, filter 180ms ease-out' }}
    >
      {displayChildren}
    </div>
  );
}
