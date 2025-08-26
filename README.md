# Private Dashboard (Demo)

A sanitized, static demo of your dashboard, ready to deploy on Render as a Static Site. No external webhooks, no analytics, and a strict Content Security Policy (CSP).

## Quick start (local)

- Open `index.html` in your browser. Everything is client-side and stored locally (notes in `localStorage`).

## Deploy to Render (Static Site)

1. Push this repo to GitHub.
2. In Render, create a New Static Site.
   - Repository: select this repo
   - Build Command: leave empty
   - Publish Directory: `.`
3. Advanced → Add this Response Header:
   - `Content-Security-Policy`: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
4. Save & deploy.

Alternatively, you can one‑click set up via `render.yaml`:

- In Render, go to Blueprints → New from repo and select this repository. Render will create a Static Site with `render.yaml` settings.

## Notes

- This demo intentionally avoids any network calls and third‑party scripts, beyond Google Fonts (allowed by CSP).
- If you need Tailwind or other libraries, add a build step (e.g., using Vite) and update `render.yaml` with `buildCommand` and `staticPublishPath`.
- You can safely customize styles and components directly in `index.html`.
