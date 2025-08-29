## Trendza — Cursor Rules

### Objectives
- Rebrand app from OutfitGrader AI to Trendza.
- Replace legacy rating-only flow with three pillars:
  - Color Analysis (Style DNA-like)
  - Digital Closet (Fitted-like)
  - Shopping Search (Phia-like)
- Ship clean, minimal UI: white background, black text, restrained accent.

### Guardrails
- Avoid overengineering; favor incremental, backwards-compatible swaps where possible.
- New data model isolated under `trendza_*` tables to avoid collisions with legacy.
- All AI calls via Supabase Edge Functions; no direct client keys.
- Feature flags gate new experiences while migration is in progress.

### Code Conventions
- TypeScript strict mode. No `any` in new code.
- Functions are verbs; variables are descriptive nouns.
- Prefer early returns and flat control flow.
- Add docstrings for non-trivial logic; avoid inline noise.
- No TODO comments in committed code; implement or track explicitly.

### Directory Structure (new)
- `src/features/color/` — selfie analyzer, undertone/season mapping
- `src/features/closet/` — item ingestion, tagging, outfit generator
- `src/features/search/` — product search UI and glue
- `src/design/` — tokens, themes, primitives
- `supabase/functions/{color-analysis,closet-tagger,product-search}/`
- `supabase/migrations/*trendza*.sql` — new schema only

### Security & Privacy
- RLS enforced on all `trendza_*` tables.
- User-generated media stored under user-owned folder prefixes.
- AI providers accessed server-side; redact PII in logs.

### Testing
- Unit: pure functions for mapping/algorithms.
- Contract tests for Edge Functions input/output shapes.
- Lightweight E2E for critical flows: selfie → palette; upload → tagging → outfit; search → redirect.

### CI/CD
- Lint and typecheck gate.
- Edge Functions deploy on `main` with canary flag.
- Database migrations require idempotency and down safety notes.

### Rollout
- Phase 1: Rebrand + tokens + scaffolds behind flags.
- Phase 2: Color Analysis MVP.
- Phase 3: Closet MVP.
- Phase 4: Search MVP.

