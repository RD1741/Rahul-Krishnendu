# Wedding Invitation (React + Vite)

All content lives in **`public/invitation.json`** — names, dates, events, venue, photos, video, RSVP settings.
Photos go in **`public/photos/`** and are referenced like `"/photos/us-1.jpg"`.

## Run locally
```bash
npm install
npm run dev
```

## Edit after hosting
Edit `public/invitation.json` (and upload photos to `public/photos/`) directly on github.com
(pencil icon → Commit changes). Vercel redeploys automatically in ~30 seconds.

## RSVP
- `"mode": "whatsapp"` – opens WhatsApp with the guest's answers to `whatsappNumber` (country code, no +).
- `"mode": "formspree"` – create a free form at formspree.io and paste its URL in `formspreeUrl`;
  responses arrive in your email/dashboard.

## Music
Add `public/music.mp3` and set `"music": { "enabled": true }`.
