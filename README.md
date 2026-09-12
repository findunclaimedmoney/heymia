# HeyMia Worker

HeyMia is an AI agent command center built on Cloudflare Workers. It powers:

- **Mia Agent** — AI assistant with Gemini integration for file management, routing, and workflow
- **Fan Studio** — 5-minute private sessions with Jess (LiveAvatar + Stripe payments)
- **Play Mode** — Casual chat and interactive games
- **Work Mode** — Command center with File Vault, Workflow, Checklist, Daily Training, CapCut Editor, Find & Replace, and Deploy tools
- **Admin Panel** — Upload and activate page versions via R2

## Setup

1. Install wrangler: `npm install -g wrangler`
2. Configure secrets:
   ```bash
   wrangler secret put GEMINI_API_KEY
   wrangler secret put STRIPE_SECRET_KEY
   wrangler secret put LIVEAVATAR_API_KEY
   ```
3. Create KV namespace: `wrangler kv:namespace create MEMORY`
4. Create R2 bucket: `wrangler r2 bucket create heymia-vault`
5. Deploy: `wrangler deploy`

## Custom Domain

Configured to run on `heymia.lensflow.au` — set up in dashboard under Workers → Triggers → Custom Domains.

## Tech Stack

- **Cloudflare Workers** — Edge runtime
- **Gemini 2.0 Flash** — AI chat backend
- **KV** — File storage and memory
- **R2** — Page version management
- **LiveAvatar** — Real-time avatar sessions
- **Stripe** — Payment processing
- **Tailwind CSS** — Frontend styling (Play CDN)
