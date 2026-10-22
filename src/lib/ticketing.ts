import type { EventRow } from './types';

const INSTAGRAM_PROFILE = 'https://www.instagram.com/team.synf/';
const INSTAGRAM_DM = 'https://www.instagram.com/team.synf/'; // No direct DM API; profile is the safe fallback

export type TicketingAction = {
  label: string;
  url: string;
  variant: 'primary' | 'secondary' | 'accent' | 'disabled';
  external: boolean;
};

export type TicketingConfig = {
  heading: string;
  message: string;
  primary: TicketingAction | null;
  secondary: TicketingAction | null;
  statusBadge: string | null;
  warnings: string[];
};

function isValidUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}

function igAction(label: string, variant: TicketingAction['variant'] = 'primary'): TicketingAction {
  return { label, url: INSTAGRAM_PROFILE, variant, external: true };
}

function igDmAction(label: string): TicketingAction {
  return { label, url: INSTAGRAM_DM, variant: 'primary', external: true };
}

/**
 * Shared ticketing resolver — single source of truth for both the public event
 * detail page and the admin live preview. Given an event's status, booking
 * configuration, and ticketing mode, returns the heading, message, CTAs, and
 * any configuration warnings.
 */
export function resolveTicketing(ev: Partial<EventRow>): TicketingConfig {
  // Custom mode: use admin-provided text and CTA
  if (ev.ticketing_message_mode === 'custom') {
    const heading = ev.ticketing_custom_heading?.trim() || 'Tickets & Registration';
    const message = ev.ticketing_custom_message?.trim() || '';
    const primary: TicketingAction | null = ev.ticketing_custom_cta_label?.trim()
      ? {
          label: ev.ticketing_custom_cta_label.trim(),
          url: isValidUrl(ev.ticketing_custom_cta_url) ? ev.ticketing_custom_cta_url!.trim() : INSTAGRAM_PROFILE,
          variant: 'primary',
          external: true,
        }
      : null;
    const secondary: TicketingAction | null = ev.ticketing_secondary_cta_label?.trim() && isValidUrl(ev.ticketing_secondary_cta_url)
      ? { label: ev.ticketing_secondary_cta_label.trim(), url: ev.ticketing_secondary_cta_url!.trim(), variant: 'secondary', external: true }
      : null;
    return { heading, message, primary, secondary, statusBadge: ev.status || null, warnings: [] };
  }

  // Automatic mode: derive from status + booking config
  const status = ev.status || 'draft';
  const bookingUrl = isValidUrl(ev.ticket_url) ? ev.ticket_url!.trim() : null;
  const aftermovieUrl = isValidUrl(ev.aftermovie_url) ? ev.aftermovie_url!.trim() : null;
  const waitlistUrl = isValidUrl(ev.waitlist_url) ? ev.waitlist_url!.trim() : null;
  const cancellationUrl = isValidUrl(ev.cancellation_info_url) ? ev.cancellation_info_url!.trim() : null;
  const warnings: string[] = [];

  // Determine if booking URL should be shown based on booking_method
  const method = ev.booking_method || 'coming_soon';
  const showBookingUrl = bookingUrl && method === 'external_link';

  // Custom CTA label override
  const ctaLabel = ev.booking_cta_label?.trim() || null;

  switch (status) {
    case 'announced':
      if (showBookingUrl) {
        return {
          heading: 'Tickets & Registration',
          message: 'Bookings are open. Complete your booking through the official link below.',
          primary: { label: ctaLabel || 'Book Tickets', url: bookingUrl!, variant: 'accent', external: true },
          secondary: igAction('Follow @team.synf', 'secondary'),
          statusBadge: 'announced',
          warnings,
        };
      }
      return {
        heading: 'Tickets & Registration',
        message: 'Bookings opening soon. Stay tuned to our Instagram for updates.',
        primary: igAction('Follow @team.synf'),
        secondary: null,
        statusBadge: 'announced',
        warnings,
      };

    case 'upcoming':
      if (showBookingUrl) {
        return {
          heading: 'Join the Experience',
          message: 'Bookings are open. Secure your spot through the official link below.',
          primary: { label: ctaLabel || 'Book Tickets', url: bookingUrl!, variant: 'accent', external: true },
          secondary: igAction('Follow for Updates', 'secondary'),
          statusBadge: 'upcoming',
          warnings,
        };
      }
      return {
        heading: 'Join the Experience',
        message: 'Interested in attending? DM us on Instagram for booking and registration information.',
        primary: igDmAction('DM Us on Instagram'),
        secondary: igAction('Follow for Updates', 'secondary'),
        statusBadge: 'upcoming',
        warnings,
      };

    case 'sold_out':
      if (!waitlistUrl) {
        warnings.push('Sold Out suppresses active booking buttons in Automatic mode.');
      }
      return {
        heading: 'Sold Out',
        message: 'This event is sold out. Follow @team.synf for future experiences and announcements.',
        primary: igAction('Follow @team.synf'),
        secondary: waitlistUrl ? { label: 'Join the Waitlist', url: waitlistUrl, variant: 'secondary', external: true } : null,
        statusBadge: 'sold_out',
        warnings,
      };

    case 'postponed':
      return {
        heading: 'Event Postponed',
        message: 'This event has been postponed. Follow @team.synf for updates on the revised schedule and further information.',
        primary: igAction('Follow @team.synf'),
        secondary: cancellationUrl ? { label: 'Event Updates', url: cancellationUrl, variant: 'secondary', external: true } : null,
        statusBadge: 'postponed',
        warnings,
      };

    case 'cancelled':
      warnings.push('Cancelled events must never show an active booking CTA in Automatic mode.');
      return {
        heading: 'Event Cancelled',
        message: 'This event has been cancelled. Follow @team.synf for official announcements and information about future events.',
        primary: igAction('Follow @team.synf'),
        secondary: cancellationUrl ? { label: 'Booking Information', url: cancellationUrl, variant: 'secondary', external: true } : null,
        statusBadge: 'cancelled',
        warnings,
      };

    case 'completed':
      if (aftermovieUrl) {
        warnings.push('Completed events can display an aftermovie CTA when a valid recap URL is added.');
      }
      return {
        heading: 'Thanks for Being Part of the Experience',
        message: 'This event has concluded. Stay connected with @team.synf for upcoming experiences and future announcements.',
        primary: igAction('Follow @team.synf'),
        secondary: aftermovieUrl ? { label: 'Watch the Aftermovie', url: aftermovieUrl, variant: 'secondary', external: true } : null,
        statusBadge: 'completed',
        warnings,
      };

    case 'draft':
      warnings.push('This event is in Draft and is not publicly visible.');
      return {
        heading: 'Tickets & Registration',
        message: 'Ticketing information will be available once this event is announced.',
        primary: null,
        secondary: null,
        statusBadge: 'draft',
        warnings,
      };

    default:
      // Fallback for any unmapped status
      if (showBookingUrl) {
        return {
          heading: 'Tickets & Registration',
          message: 'Complete your booking through the official link below.',
          primary: { label: ctaLabel || 'Book Tickets', url: bookingUrl!, variant: 'accent', external: true },
          secondary: null,
          statusBadge: status,
          warnings,
        };
      }
      return {
        heading: 'Tickets & Registration',
        message: 'Ticketing information will be available soon. Follow @team.synf for updates.',
        primary: igAction('Follow @team.synf'),
        secondary: null,
        statusBadge: status,
        warnings,
      };
  }
}

export const BOOKING_METHODS = [
  { value: 'external_link', label: 'External Booking Link' },
  { value: 'instagram_dm', label: 'Instagram DM' },
  { value: 'instagram_profile', label: 'Instagram Profile' },
  { value: 'coming_soon', label: 'Coming Soon / Not Yet Available' },
  { value: 'manual', label: 'Manual / Custom Instructions' },
  { value: 'none', label: 'No Booking Required' },
] as const;

export const BOOKING_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  BOOKING_METHODS.map(m => [m.value, m.label])
);
