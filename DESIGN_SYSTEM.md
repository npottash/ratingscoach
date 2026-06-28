# The Ratings Coach — design system

A pragmatic reference for typography, color, spacing, and component patterns. Read this before designing new pages so the product feels consistent.

The source of truth for color and font tokens is `app/globals.css`. This document explains how to use them.

---

## Colors

Defined as CSS variables in `app/globals.css`, exposed as Tailwind v4 tokens. Use the Tailwind utilities — don't hardcode hex values.

| Token | Hex | Tailwind classes | When to use |
|---|---|---|---|
| `--color-background` | `#ffffff` | `bg-background` | Page background |
| `--color-foreground` | `#0f172a` | `text-foreground` | Primary text |
| `--color-surface` | `#f5f7fa` | `bg-surface` | Cards, callout backgrounds, chat bubbles for the assistant |
| `--color-border` | `#e2e8f0` | `border-border` | Card and input borders, subtle dividers |
| `--color-muted` | `#64748b` | `text-muted` | Secondary text, eyebrows, placeholder context |
| `--color-brand` | `#185fa5` | `bg-brand`, `text-brand`, `border-brand` | Primary CTAs, selected states, links |
| `--color-brand-hover` | `#134d87` | `hover:bg-brand-hover`, `hover:text-brand-hover` | Hover state on brand surfaces |

**Semantic tints** (used sparingly):

| Use | Pattern |
|---|---|
| Strong / positive | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Weak / warning | `bg-amber-50 text-amber-700 border-amber-200` |
| Critical / error | `bg-red-50 text-red-700 border-red-200` or `text-red-600` for inline errors |

**No dark mode** — the product is designed for a single light theme. Don't add `dark:` variants.

---

## Typography

Geist Sans (`--font-geist-sans`) is the default. Geist Mono (`--font-geist-mono`) is available via `font-mono` for code-only contexts.

### Scale

| Element | Tailwind | Pixel | When to use |
|---|---|---|---|
| H1 (default) | `text-3xl font-semibold tracking-tight` | 30 | Page titles in forms, scorecards, etc. |
| H1 (hero / trust pages) | `text-4xl font-semibold tracking-tight` | 36 | Landing, Security, marketing-style pages |
| H1 (display) | `text-5xl font-semibold tracking-tight` | 48 | Homepage hero only |
| H2 (default) | `text-xl font-semibold tracking-tight` | 20 | Section headers inside a page |
| H2 (long-form) | `text-2xl font-semibold tracking-tight` | 24 | Section headers on Security and other prose pages |
| H3 | `text-base font-semibold` | 16 | Sub-section / item headers |
| Body (compact) | `text-sm` | 14 | Form labels, card content, app UI |
| Body (long-form) | `text-base leading-relaxed` | 16 | Legal pages and any document meant to be read top to bottom |
| Body (small) | `text-xs` | 12 | Metadata, footnotes, helper text |
| Eyebrow | `text-xs font-semibold uppercase tracking-wide text-muted` | 12 | Above a heading, to label a section type (e.g., `LEGAL`) |

### Line-height

- `leading-relaxed` (1.625) on long-form prose
- Default on form labels and short text

### Tracking

- `tracking-tight` on all `text-xl`+ headings
- `tracking-wide` on eyebrows and uppercase labels

---

## Layout

### Page max-widths

| Width | Tailwind | When to use |
|---|---|---|
| 672 px (narrow) | `max-w-2xl` | Login, signup, single-column auth |
| 720 px (prose) | `max-w-[720px]` | Long-form trust pages (Security) |
| 768 px (form) | `max-w-3xl` | Intake, narrative, privacy, terms |
| 1152 px (app) | `max-w-6xl` | Homepage, scorecard, multi-column UI |

Always combine with `mx-auto` to center.

### Page padding

- Horizontal: `px-6` everywhere
- Vertical (form pages): `py-10`
- Vertical (long-form / trust pages): `py-12` or `py-14`

### Section gap

- Tight prose: `gap-8`
- Generous (Security page): `gap-10`
- Inside a single section: `gap-3` to `gap-4` between related elements

### Form row

Two-column row at sm+ breakpoint:

```tsx
<div className="grid gap-6 sm:grid-cols-2">
  <label>...</label>
  <label>...</label>
</div>
```

### Step indicator

Pages 1–4 of the prep flow (Intake / Narrative / Simulation / Scorecard) sit under the `StepIndicator` component. Use it directly above `<main>`.

---

## Components

### Buttons

**Primary CTA** — solid brand fill, used for the main action on a screen.

```tsx
<button className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
  Action
</button>
```

Larger CTA (homepage hero, intake submit): bump padding to `px-6 py-2.5` or `px-6 py-3` and `text-base`.

**Secondary / ghost** — outlined, neutral.

```tsx
<button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand">
  Action
</button>
```

**Toggle / pressed** — used in the agency selector. When `selected`, swap to the primary CTA styling.

### Form inputs

All text inputs, selects, and textareas share the same surface:

```tsx
const inputClass =
  'rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
```

Pair with this label wrapper:

```tsx
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-foreground'
```

Mark optional fields with `<span className="font-normal text-muted">(optional)</span>` after the label text.

### Cards

**White card** — default container.

```tsx
<section className="rounded-lg border border-border bg-white p-5">
  ...
</section>
```

**Surface card** — softer, used for secondary info or tips.

```tsx
<section className="rounded-lg border border-border bg-surface p-5">
  ...
</section>
```

For long-form callouts, bump padding to `p-6`.

### Callouts

Use for content that should stand out from the body flow. Two variants — see `app/security/page.tsx` for the reference implementation.

```tsx
// Neutral
<aside className="rounded-lg border border-border bg-surface p-6 text-base leading-relaxed text-foreground">
  <p className="text-xs font-semibold uppercase tracking-wide text-brand">Eyebrow</p>
  <div className="mt-3 space-y-3">...</div>
</aside>

// Brand-tinted (reserve for trust/security moments)
<aside className="rounded-lg border border-brand/30 bg-brand/5 p-6 text-base leading-relaxed text-foreground">
  ...
</aside>
```

Use the brand variant sparingly — two per page max — so it retains impact.

### Pills / tags

```tsx
<span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
  Focus area
</span>
```

Semantic variants for flags follow the `bg-{color}-50 text-{color}-700 border-{color}-200` pattern.

### Chat bubbles

```tsx
// User
<div className="max-w-[85%] rounded-lg bg-brand px-4 py-2.5 text-sm leading-relaxed text-white">
  ...
</div>

// Assistant / coach
<div className="max-w-[85%] rounded-lg border border-border bg-surface px-4 py-2.5 text-sm leading-relaxed text-foreground">
  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
    Persona name
  </p>
  <p className="whitespace-pre-wrap">...</p>
</div>
```

User bubbles right-align (`flex justify-end` on parent); assistant bubbles left-align.

### Status dots

```tsx
// Done
<span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
// In progress
<span className="inline-block h-2.5 w-2.5 rounded-full bg-brand/40 ring-2 ring-brand/20" />
// Pending
<span className="inline-block h-2.5 w-2.5 rounded-full border border-border bg-white" />
```

### Footer

`components/Footer.tsx` is mounted in the root layout. Don't add per-page footers.

---

## Patterns

### Eyebrow + headline

For prose pages, start with a small uppercase label above the H1 so the reader can place the page.

```tsx
<header>
  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Legal</p>
  <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
  <p className="mt-1 text-sm text-muted">Last updated: ...</p>
</header>
```

### Two-column app layout

The scorecard and simulation use a two-column grid: main content on the left, secondary panel on the right.

```tsx
<div className="grid gap-8 lg:grid-cols-[1fr_380px]">
  <section>main</section>
  <aside>side</aside>
</div>
```

Collapses to single column below `lg` (1024 px).

### Loading and error states

- Loading: small muted text (`text-xs text-muted`) like `"Coach is thinking…"`. Avoid spinners unless explicitly designed for it.
- Inline error: `text-sm text-red-600`
- Banner error: `rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700`

### Disabled state

`disabled:opacity-60` on the button. The pointer-events stay on so focus rings still work; opacity carries the affordance.

---

## Rules

1. **No emoji anywhere in the UI.** Spec requirement.
2. **No dark mode.** Light theme only.
3. **Use semantic tokens, not raw colors.** Reach for `bg-brand` not `bg-[#185fa5]`.
4. **One primary CTA per screen.** Secondary actions use the ghost button.
5. **Brand-tint callouts are precious.** Two per page max.
6. **`text-base leading-relaxed` is the long-form body text.** `text-sm` is for app UI. Don't mix them in the same content flow.
7. **Always pair a `<label>` with its input.** Wrap with the `labelClass` above.
8. **All sections gap consistently.** Use `gap-6` or `gap-8` inside a page; let the section's internal `space-y-3`/`space-y-4` handle in-section spacing.

---

## When to extend this document

Add to this file whenever you introduce:
- A new component pattern used in 2+ places
- A new typography size or semantic color
- A new layout structure (sidebar variant, modal pattern, etc.)

Keep entries short, concrete, and copy-pasteable.
