/*
# Notifications + Dashboard Preferences

## Purpose
Provides a persistent, database-backed notification system and per-user dashboard
customization store for the Team Synf admin command centre.

## 1. New Tables

### notifications
- id (uuid, PK)
- user_id (uuid, NOT NULL) — the recipient. Defaults to auth.uid() so server-side
  inserts from RLS-scoped contexts still work.
- type (text) — category: e.g. 'application', 'enquiry', 'event', 'invitation',
  'task', 'system', 'security'.
- title (text) — short headline.
- body (text, nullable) — optional detail.
- link (text, nullable) — admin route the notification opens.
- ref_id (uuid, nullable) — related record id for dedup / idempotency.
- read_at (timestamptz, nullable) — null = unread.
- created_at (timestamptz, default now())

A unique partial index on (user_id, type, ref_id) WHERE read_at IS NULL prevents
duplicate unread notifications from the same source event — idempotent handling.

### dashboard_preferences
- user_id (uuid, PK) — one row per user.
- hidden_widgets (text[]) — widget keys the user has hidden.
- widget_order (text[]) — preferred order of widget keys.
- analytics_range (text) — default analytics date range, e.g. '30d','90d','12m'.
- density (text) — 'compact' | 'comfortable'. Default 'comfortable'.
- updated_at (timestamptz, default now())

## 2. Security

### notifications
- RLS enabled.
- SELECT: authenticated users read only their own notifications (auth.uid() = user_id).
- INSERT: authenticated users can insert their own (used by server-side helpers /
  edge functions that run as the user; the DEFAULT auth.uid() fills user_id).
- UPDATE: authenticated users can update their own (mark as read).
- DELETE: authenticated users can delete their own.

### dashboard_preferences
- RLS enabled.
- SELECT / INSERT / UPDATE / DELETE: authenticated users manage only their own row.

No service-role credentials are exposed. All policies use auth.uid().
*/

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications"
ON public.notifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
CREATE POLICY "insert_own_notifications"
ON public.notifications FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications"
ON public.notifications FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications"
ON public.notifications FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Idempotency: one unread notification per (user, type, ref)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unread_dedup_idx
ON public.notifications (user_id, type, ref_id)
WHERE read_at IS NULL AND ref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
ON public.notifications (user_id, created_at DESC);

-- ============================================================
-- dashboard_preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  user_id uuid PRIMARY KEY,
  hidden_widgets text[] NOT NULL DEFAULT '{}',
  widget_order text[] NOT NULL DEFAULT '{}',
  analytics_range text NOT NULL DEFAULT '90d',
  density text NOT NULL DEFAULT 'comfortable',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_dashboard_prefs" ON public.dashboard_preferences;
CREATE POLICY "select_own_dashboard_prefs"
ON public.dashboard_preferences FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_dashboard_prefs" ON public.dashboard_preferences;
CREATE POLICY "insert_own_dashboard_prefs"
ON public.dashboard_preferences FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_dashboard_prefs" ON public.dashboard_preferences;
CREATE POLICY "update_own_dashboard_prefs"
ON public.dashboard_preferences FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_dashboard_prefs" ON public.dashboard_preferences;
CREATE POLICY "delete_own_dashboard_prefs"
ON public.dashboard_preferences FOR DELETE
TO authenticated USING (auth.uid() = user_id);
