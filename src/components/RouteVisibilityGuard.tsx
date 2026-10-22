import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useSiteSections, sectionForPath } from '@/lib/useSiteSections';
import { NotFound } from '@/pages/NotFound';

/**
 * Central route visibility guard.
 * Blocks access to any route whose section is hidden in the database.
 * This is the single enforcement point for public route access.
 */
export function RouteVisibilityGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { isVisible, loaded } = useSiteSections();
  const [wasBlocked, setWasBlocked] = useState(false);

  const section = sectionForPath(pathname);
  const blocked = section !== null && loaded && !isVisible(section);

  useEffect(() => {
    if (blocked) setWasBlocked(true);
    if (!blocked) setWasBlocked(false);
  }, [blocked]);

  // While sections are loading, render children to avoid a flash of 404.
  // Once loaded, if the section is hidden, show the 404.
  if (blocked) return <NotFound />;
  if (wasBlocked && !blocked) return <Navigate to={pathname} replace />;

  return <>{children}</>;
}
