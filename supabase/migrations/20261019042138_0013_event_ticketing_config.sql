/*
# Event Ticketing Configuration Fields

Adds ticketing/booking configuration columns to the events table so each event
can have a booking method, custom CTA labels, ticketing message mode, and
secondary CTA support (waitlist, cancellation info, aftermovie).

## 1. Modified Table: events (additive only)
New columns:
- booking_method — how bookings are handled (external_link, instagram_dm, instagram_profile, coming_soon, manual, none)
- booking_cta_label — custom label for the primary booking button
- ticketing_message_mode — automatic (derive from status) or custom (use admin-provided text)
- ticketing_custom_heading — custom heading text for the ticketing panel
- ticketing_custom_message — custom message text
- ticketing_custom_cta_label — custom CTA label for custom mode
- ticketing_custom_cta_url — custom CTA destination URL
- ticketing_secondary_cta_label — label for optional secondary CTA
- ticketing_secondary_cta_url — URL for optional secondary CTA
- waitlist_url — waitlist destination for sold-out events
- cancellation_info_url — official cancellation/refund info URL
- ticketing_last_updated_at — timestamp of last ticketing config change

Existing events get safe defaults: booking_method defaults to 'external_link' if ticket_url exists, else 'coming_soon'. ticketing_message_mode defaults to 'automatic'.

## 2. Security
No new tables. Existing RLS policies on events remain unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='booking_method') THEN
    ALTER TABLE public.events ADD COLUMN booking_method text NOT NULL DEFAULT 'coming_soon';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='booking_cta_label') THEN
    ALTER TABLE public.events ADD COLUMN booking_cta_label text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_message_mode') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_message_mode text NOT NULL DEFAULT 'automatic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_custom_heading') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_custom_heading text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_custom_message') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_custom_message text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_custom_cta_label') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_custom_cta_label text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_custom_cta_url') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_custom_cta_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_secondary_cta_label') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_secondary_cta_label text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_secondary_cta_url') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_secondary_cta_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='waitlist_url') THEN
    ALTER TABLE public.events ADD COLUMN waitlist_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='cancellation_info_url') THEN
    ALTER TABLE public.events ADD COLUMN cancellation_info_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ticketing_last_updated_at') THEN
    ALTER TABLE public.events ADD COLUMN ticketing_last_updated_at timestamptz;
  END IF;
END $$;

-- Migrate existing events: set booking_method based on existing ticket_url
UPDATE public.events SET booking_method = 'external_link' WHERE ticket_url IS NOT NULL AND ticket_url != '' AND booking_method = 'coming_soon';
