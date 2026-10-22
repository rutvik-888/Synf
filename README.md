# Team Synf — Website & Management Platform

A complete public website and private management platform for **Team Synf**, a student-led collective focused on parties, nightlife, DJ nights and curated music experiences. Built with Vite + React + TypeScript, backed by Supabase (Postgres, Auth, Edge Functions, Storage).

---

## Public website

- **Cinematic intro** on the homepage — skippable, respects reduced-motion, no autoplay audio, configurable from the admin Brand Studio
- **Launch countdown** — optional "coming soon" page with a live countdown timer that gates the public site until a configured date; email waitlist signup for early access
- **Homepage** — hero, featured event, upcoming/archive, people preview, insider-list signup, collaboration CTA, Instagram link
- **Events archive** `/events` — search, status & city filters, empty states
- **Event detail pages** `/events/:slug` — countdown, story, gallery, aftermovie, credits, FAQ, sidebar details, external ticket links, social sharing, related events
- **About** `/about` (editable)
- **The Collective** `/people` — category filters, only approved profiles show publicly
- **Collaborate** `/collaborate` — working enquiry form saved to DB
- **Apply** `/apply` — dynamic, admin-configurable recruitment form with versioned snapshots
- **Jobs board** `/jobs` — open roles with detail pages and application flow
- **Contact** `/contact` — form + Instagram + contact reference
- **Community Wall** `/community` — Instagram-style photo grid
- **Synf Goods** `/goods` — product listings with detail pages
- **Synf Pass** `/pass` — membership/passes page
- **Frequency** `/frequency` — magazine/blog with articles and categories
- **Inside Synf** `/inside` — behind-the-scenes stories and team features
- **Drops** `/drops` — limited-edition drops and releases
- **Campaign landing pages** `/campaigns/:slug` — one-off marketing pages
- **Legal** `/terms`, `/privacy`, `/copyright` (editable draft text)
- **Branded 404**
- **PWA** manifest, robots.txt, sitemap-friendly slugs
- **Site Sections visibility** — admins can hide/show entire site sections from navigation and direct access

### Design & UX

- Custom cursor (desktop only, respects reduced-motion and coarse pointers)
- Magnetic hover effects on interactive elements
- Page transitions with cinematic fade + slide
- Scroll progress bar, back-to-top poster stamp
- Particle field backgrounds on select pages
- Full responsive design (mobile to desktop)
- Reusable color system (synf magenta, acid green, gold, electric blue) with neutral ink ramp
- 8px spacing system, Inter + display font pairing

---

## Admin (Control Room) — `/admin`

- **Secure signup** at `/admin/signup` — invite code validated server-side in an edge function, never exposed to the browser
- **Login / logout** via Supabase Auth with an additional secret verification step
- **Dashboard** with real database metrics, priority tasks, notifications, activity feed, pipeline analytics, and customizable widget visibility
- **Team Overview** — high-level org summary
- **Event CMS** — create/edit/preview/publish/archive, media gallery, credits, FAQ, external ticket links, drafts
- **Enquiries inbox** — statuses, private notes, follow-up dates, mail action, collaboration vs. general enquiry filtering
- **Applications inbox** — pipeline board (New → Reviewing → Shortlisted → Interview → Selected/Rejected), status history, form snapshot preserved per application
- **Interviews** — scheduled interview tracking linked to applications
- **Jobs manager** — create/edit job listings, application tracking
- **People manager** — draft/pending/approved/hidden/archived workflow
- **Community Wall** — moderate user-submitted photos, approve/reject/feature/archive
- **Goods manager** — product CRUD with Shopify sync support
- **Shopify integration** — product sync and webhook handling
- **Campaigns** — create and manage marketing campaign landing pages
- **Frequency manager** — magazine article CRUD with categories, featured/pinned flags, draft/publish workflow
- **Inside Synf manager** — behind-the-scenes story CRUD with story types and featured flags
- **Drops manager** — limited-edition drop management
- **Content Calendar** — plan and schedule content
- **Brand Studio** — manage intro screen settings, visual identity, campaign themes, and launch countdown configuration
- **Site Sections** — toggle visibility of entire public site sections
- **Content editor** — edit homepage hero, About, Terms, Privacy, Copyright; build/publish recruitment form versions
- **Email Templates** — manage email template drafts
- **Contact Settings** — configure contact page details
- **Team manager** — roles, departments, invitations (single-use, expiring, revocable), Owner-protected
- **Roles & Permissions** — role definitions and access control
- **Security** — security event log, session revocation, audit trail
- **Founder & Ownership** — Owner-only settings, ownership transfer history
- **Command menu** (Ctrl/⌘K) with keyboard nav, role-aware
- **Activity log** for auditable actions
- **Notifications** in-app with read/unread state

---

## Crew portal — `/crew`

- Crew members see **only** their assigned events, shifts, call times, tasks, announcements
- Cannot access admin data, recruitment, enquiries or subscribers
- Acknowledge shifts; tasks & announcements scoped to assignments

---

## Backend

### Supabase Postgres

- 20 migrations covering the full schema
- Tables: events, event_media, event_credits, event_departments, event_faqs, event_faq_categories, people, team_profiles, team_member_profiles, departments, invitations, enquiries, enquiry_categories, enquiry_notes, applications, application_form_versions, interviews, jobs, job_applications, subscribers, site_content, site_sections, admin_config, notifications, dashboard_preferences, tasks, crew_assignments, announcements, activity_log, email_logs, email_templates, security_events, session_revocations, role_definitions, role_permissions, join_classifications, founder_records, ownership_transfer_history, brand_themes, goods_products, goods_categories, campaigns, community_wall_posts, community_wall_categories, frequency_articles, frequency_categories, inside_stories, inside_story_types, drops
- Row-Level Security on every table
- Roles stored in `raw_app_meta_data ->> 'role'` (JWT claim, user-immutable, set server-side)
- SECURITY DEFINER functions for privileged mutations
- Storage bucket for site assets

### Edge functions (9 deployed)

| Function | Purpose |
|---|---|
| `admin-signup` | Validates `ADMIN_INVITE_CODE`, creates auth user with role claim, first signup = Owner |
| `login-secret` | Additional secret verification on admin login |
| `public-form` | Handles enquiry/application/subscriber submissions, honeypot, server-side validation, DB persistence |
| `application-submit` | Handles job application submissions |
| `application-action` | Admin actions on applications (status changes, notes) |
| `team-accounts` | Team member account management (create accounts, invite members, accept invitations, change roles) |
| `roles-permissions` | Role and permission queries |
| `shopify-sync` | Shopify product synchronization |
| `shopify-webhook` | Shopify webhook receiver |

Form submissions (enquiries, applications, subscribers) are saved directly to the database; admins review them in the dashboard.

---

## Tech stack

- **Frontend:** Vite, React 18, TypeScript, React Router 7, Tailwind CSS 3, Lucide icons
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Storage)
- **Build:** `npm run build` produces a static SPA in `dist/`
- **Type checking:** `npm run typecheck`
- **Linting:** `npm run lint`

---

## Required environment variables & setup

### Already configured (pre-provisioned by Bolt)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (exposed to the browser by design)

### Must be set as Edge Function secrets (Supabase dashboard → Edge Functions → Secrets)

| Secret | Purpose |
|---|---|
| `ADMIN_INVITE_CODE` | The signup invite code. Set to `80811` for the initial owner. Not in `.env` or client code. |

> The `admin-signup` function returns a clear "not configured" error if `ADMIN_INVITE_CODE` is missing — it never accepts a guess.

---

## Provisioning the first Owner

1. Set `ADMIN_INVITE_CODE=80811` as an Edge Function secret.
2. Visit `/admin/signup`.
3. Enter full name, email, password (min 8 chars) and the invite code `80811`.
4. The edge function validates the code server-side, creates the auth user with `role: owner` in `raw_app_meta_data`, creates a `team_profiles` row, and logs the action.
5. You're signed in and redirected to `/admin`.
6. Subsequent signups (with the same code) start as `viewer` and are upgraded by the Owner from **Team**.

---

## Deployment

This is a Vite + React + TypeScript SPA backed by Supabase. Build with `npm run build` and serve the `dist/` output from any static host. The Supabase project and edge functions are already provisioned.

---

## Security

- Row-Level Security enabled on every table
- Role claims are user-immutable (set server-side via edge functions)
- Invite codes validated server-side only
- Security headers configured in `public/_headers` (CSP, HSTS, X-Frame-Options, etc.)
- Honeypot field on public forms to trap bots
- Admin login requires an additional secret verification step
- Session revocation and security event logging

---

## Instagram content

The official Instagram account (https://www.instagram.com/team.synf/) could not be accessed programmatically — Instagram requires login to view profile content. No posts, captions, event dates, venues, DJs, team members or imagery were extracted.

Nothing was invented. The site ships with clearly-labelled placeholder text and empty content. An admin must import real content (events, people, credits, imagery) through the admin panel. The About and legal pages explicitly note they are drafts pending verification.
