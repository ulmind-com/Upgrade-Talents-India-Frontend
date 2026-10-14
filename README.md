# Upgrade Talents India — User Website

Premium dance-event booking front-end for the **Eventora API**.
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Framer Motion · Lenis · react-three-fiber.

> The backend is **not modified** by this app. Every screen binds to the existing
> FastAPI endpoints exactly as documented in the Swagger spec.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
```

Set the API base in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_RAZORPAY_KEY_ID=      # optional fallback; the backend normally supplies key_id
```

## Pages

| Route | Backend endpoints used |
|---|---|
| `/` | `GET /api/v1/homepage`, `/website-settings`, `/important-links` |
| `/events` | `GET /api/v1/events/upcoming` (search + filter + sort + pagination) |
| `/events/[id]` | resolved from `/api/v1/events/upcoming`, falls back to `/api/activities/events` |
| `/events/[id]/book` | `GET /api/activities/tickets`, `POST /api/bookings/`, `POST /api/payments/verify-razorpay` |
| `/courses`, `/workshops` | `GET /api/v1/courses`, `/api/v1/workshops` |
| `/gallery` | `/api/v1/events/upcoming` + `/api/v1/banners` |
| `/about`, `/contact` | `/api/v1/website-settings`, `/api/v1/contact-info` |
| `/login` | `POST /api/auth/login` |
| `/register` | `POST /api/auth/register/step1 → step2 → step3` (multipart) |
| `/dashboard` | `GET /api/bookings/my-tickets`, `/api/bookings/my`, `/api/bookings/tickets/{ref}/qr` |

The API client lives in [`src/lib/api.ts`](src/lib/api.ts) — one typed function per endpoint.
Optional homepage sections use `safe()` so a missing section never breaks the page.

## Booking + payment flow

1. `POST /api/bookings/` reserves seats and returns `booking_id`, `booking_reference`, `payment_info`.
2. **Free tickets** (`total_amount === 0`) come back already `CONFIRMED` — the user is sent to the dashboard.
3. **Paid tickets** open Razorpay Checkout using the backend's own `payment_info`
   (`key_id`, `order_id`, `amount_paise`) — no amounts are computed client-side.
4. On success, `POST /api/payments/verify-razorpay` performs the authoritative
   server-side signature check before any pass is treated as valid.

## Design system

Two themes, toggled in the navbar and persisted to `localStorage` (`uti_theme`):

- **`dark`** — near-black stage (`#05060d`) with neon magenta → violet → cyan.
- **`blue`** — the light counterpart, blue-tinted surfaces instead of white (`#e8eeff`), royal blue primary.

All colour, spacing, radius and easing values are CSS custom properties in
[`src/app/globals.css`](src/app/globals.css). Components reference tokens only — no raw hex.

Photographic heroes sit on a **fixed dark scrim** (`.hero-scrim` + `.on-media`) in *both*
themes, so headline contrast never depends on the active theme.

## Motion

- `Reveal`, `StaggerGroup`, `SplitHeading`, `Parallax`, `ScrollProgress` — [`src/components/motion/Reveal.tsx`](src/components/motion/Reveal.tsx)
- `Scene3D` — react-three-fiber particle field + distorting core that tracks the pointer.
  Skipped entirely on reduced-motion or low-core devices, replaced by a static gradient.
- `TiltCard` / `Magnetic` — pointer-reactive 3D tilt and magnetic buttons.
- Lenis smooth scrolling, disabled under `prefers-reduced-motion`.

Every animation is gated on `prefers-reduced-motion`.

## Accessibility notes

- Skip link, visible focus rings, `aria-current` on nav and pagination.
- All touch targets ≥44px; icon-only buttons carry `aria-label`.
- Form errors are tied to inputs with `aria-describedby`; status regions use `aria-live`.
- The hero carousel pauses on hover and focus, and does not auto-advance under reduced motion.
- Countdown always exposes the exact deadline as text, never motion alone.

## Images

CMS images are used whenever present. `imageFor()` in [`src/lib/utils.ts`](src/lib/utils.ts)
supplies royalty-free Unsplash fallbacks only when a record has no image, so the
layout never collapses on sparse content.

## Seeding demo tickets

`scripts/seed-demo-data.mjs` creates one published event plus four ticket tiers
through the **existing admin API** — it calls `POST /api/admin/login`,
`POST /api/admin/events` and `POST /api/admin/tickets` only, and changes no backend code.

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword \
  node scripts/seed-demo-data.mjs
```

It prints the new event id; open `/events/<id>/book` to see the tiers rendered on
the ticket page. Point it at another environment with `API_BASE=https://api.example.com`.

The backend needs MongoDB running and a `.env` with `MONGODB_URI`,
`SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` before this will work.
