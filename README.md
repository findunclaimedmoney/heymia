**This is the Cloudflare repo:** `findunclaimedmoney/heymia`  
Live: https://heymia.lensflow.au (Worker `heymia`, currently v4.0)

Do **not** push HeyMia Worker code to:
- `findunclaimedmoney/cliff-field-blue-acorn` (Grok / Vercel preview dump)
- any Vercel-linked repo

Cloudflare Git should point at **this** repository only. Vercel should not be connected here.

AI agent command center on Cloudflare Workers. Powers Work mode, File Vault, website publish, LiveAvatar, year memory, MP4-to-HTML clips, Pentad, Cut (FFmpeg.wasm), and Stripe.

## Agent (v4)

- **Primary:** Grok-4.5 when `XAI_API_KEY` is set, else Gemini 3.8 Flash
- **Fallback:** Gemini 3.6 Flash → Gemini 2.5 Flash → Workers AI
- **Cut bench:** FFmpeg.wasm in the browser (Workers cannot spawn native FFmpeg). Trim, crop, rotate, mute, volume, fade, speed, extract WAV, magic eraser (local heal + optional Workers AI inpaint).

Gemini 2.0 Flash is retired (shutdown 1 Jun 2026). Do not point the Worker at it.

## Routes

| Path | Purpose |
|------|---------|
| `/` `/work` | Workflow Command Center (R2 `ui/work-active.html` or embedded UI) |
| `/edit` `/cut` | Cut bench — isolated page with COOP/COEP for FFmpeg.wasm |
| `/edit.html?embed=1` | Same bench inside the Work Cut tab |
| `/api/edit/inpaint` | Workers AI magic-eraser fill |
| `/api/edit/job` | Mia recipes for the bench |
| `/chat` `POST` | Mia agent (tools + Grok/Gemini) |
| `/files` | Vault upload/list (R2 `VAULT`, KV fallback) |
| `/api/sites` | Publish static sites |
| `/s/{slug}/` | Live published site |
| `/route` | File classifier |
| `/ui/activate` | Swap live HTML from vault |
| `/session` `/start` `/stop` | LiveAvatar |
| `/checkout` | Stripe |

## Deploy

```bash
npm i
wrangler login
wrangler kv namespace create MEMORY
wrangler r2 bucket create heymia-vault
# paste the IDs into wrangler.toml, then:
wrangler secret put GEMINI_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put LIVEAVATAR_API_KEY
wrangler deploy
```

Custom domain: Workers → heymia → Domains → `heymia.lensflow.au`  
Connect this GitHub repo in Cloudflare **Workers → Settings → Builds** so every push deploys.

If the Cut tab is missing after deploy, the old UI is cached in R2. POST `/ui/reset` with `{ "target": "work" }` then hard refresh.
