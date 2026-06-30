# Demo screenshots — capture guide

The `/demo` page expects nine PNG files in `public/demo/scenes/`. Until you drop the files in, the player renders friendly placeholders telling you where to put each one.

## Setup before capturing

1. **Use a clean Chrome window** — no extensions visible (`incognito` is easiest).
2. **Set the window to 1440 × 900** so the aspect roughly matches the player's 16:10 stage. On retina the screenshot will be 2880 × 1800; that's fine.
3. **Sign in as a test user**, NOT your real account. Use realistic but obviously-fictional issuer data.
4. **Walk one session through to completion first** so you have results to capture, then go back and capture each screen in order.

Suggested fake issuer for screenshots:
- Issuer: `Acme Holdings`
- Ticker: `ACME`
- Sector: `Bank`
- Sub-type: `Regional / Super-Regional Bank (>$100bn in Assets)`
- Outlook: `Stable`
- Meeting type: `Annual Review`
- Agency: `S&P`
- Current rating: `A`
- Meeting date: pick something 2 months out
- Key topics: a couple of realistic-but-fictional sentences

## What to capture, in order

Save each file at the exact path listed.

### `public/demo/scenes/01-intake.png`
The intake form, mostly filled in. Show the sub-type dropdown open or just-closed so the reader sees the rich sector taxonomy.

### `public/demo/scenes/02-narrative.png`
The narrative screen with 4–6 paragraphs of placeholder narrative pasted in. Show the right-side session summary card with the issuer, agency, meeting date.

### `public/demo/scenes/03-simulation-open.png`
The very first turn of the simulation. The analyst's opening question is in view. Right sidebar shows "Capital Adequacy" as the in-progress factor.

### `public/demo/scenes/04-simulation-mid.png`
Mid-session. Three or four turns visible, with a factor-divider in the chat showing the transition between two factors. Right sidebar shows at least one flag (Strong / Weak / Critical) accumulated.

### `public/demo/scenes/05-scorecard-summary.png`
Scorecard top section visible: readiness score, weak answers, critical gaps. Make sure the issuer name and analyst name are in the header.

### `public/demo/scenes/06-scorecard-detail.png`
Scroll down so the factor-by-factor breakdown cards are in view. Capture at a scroll position where 2–3 factor cards are fully visible with the "Handled well / Flagged / Recommended action" content readable.

### `public/demo/scenes/07-committee-memo.png`
The right column of the scorecard with the committee memo and the priority prep list (1, 2, 3) in view.

### `public/demo/scenes/08-coach.png`
The AI Ratings Coach section with a user question typed (or a short Q-and-A in the message history). Use a question like *"Why was my Funding answer flagged?"* and have the coach's answer visible.

### `public/demo/scenes/09-dashboard.png`
The dashboard with 2–3 sessions in the table. Mix completed (with scores in different colors) and Setup statuses.

## After capturing

Drop the files in `public/demo/scenes/` and visit `/demo` — they appear automatically. No code change needed.

## Producing an actual mp4 (optional, later)

If you want a hosted YouTube/Vimeo video for sales decks and LinkedIn embeds, the same screenshots are your raw material. Stitch them together in:

- **Descript** — drop in the screenshots, type captions, add a voiceover or auto-generate one.
- **Loom or Veed.io** — manual narration over the slides.
- **ffmpeg** — programmatic stitch (see scripts/demo-video.sh for a starter command).

Aim for ~60 seconds total, 6-7 seconds per scene.
