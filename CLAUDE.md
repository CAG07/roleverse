# RoleVerse — Claude Code Project Context

> This file reflects the **current canonical state** of the project.
> Do not infer historical decisions from this file — treat everything here as authoritative standing instructions.

---

## What RoleVerse Is

An AI-powered tabletop RPG companion app supporting AD&D 2E, D&D 5E, and Pathfinder 2E. Five specialized Claude agents (Narrator, Rules Arbiter, NPC Dialogue, Lore Keeper, Encounter Builder) are routed via a Haiku router and backed by pgvector RAG. Fantasy Grounds Unity is the tactical engine; RoleVerse handles AI narration, rules arbitration, NPC memory, and session logging.

**GitHub:** `CAG07/roleverse`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Supabase — PostgreSQL + pgvector + Auth + Realtime + Storage |
| AI | Anthropic Claude API; MCP server lives inside the Next.js app |
| Fonts | Cinzel Decorative, EB Garamond — loaded via `next/font/google` only |
| Linting | ESLint 9, flat config via `eslint.config.mjs` |
| CI/CD | GitHub Actions + Vercel |
| Desktop bridge (future) | Electron |

---

## Visual Design System

**Aesthetic:** Dark AD&D 1st Edition module. Void black backgrounds, crimson accents, tarnished gold details, ivory text.

**Typography:** Cinzel / Cinzel Decorative for display. EB Garamond for body.

**Rules:**
- Sharp edges throughout. Corner ornaments. Module-style rule dividers.
- **No** parchment, leather, or Renaissance Faire styling.
- **No** rounded corners except circular avatars.
- **Always** load fonts via `next/font/google`. Never use `<link>` tags or CSS `@import` for Google Fonts — causes FOUC.

---

## Styling Convention — CSS Modules (enforced project-wide)

Every component and page has a paired `.module.css` file. No inline `styled-jsx` blocks anywhere.

```
app/
  campaigns/
    campaigns-page.tsx
    campaigns-page.module.css   ← paired, always
```

New pages and components **must** follow this pattern. This is non-negotiable.

---

## Authentication

- **Google OAuth SSO only.** No email/password. No Discord OAuth.
- PKCE flow. Auth callback route excluded from middleware — do not add it back.
- Anon key exposure in the browser is intentional by design (Supabase architecture).
- RLS is the primary enforcement layer. Use `SECURITY DEFINER` helper functions to break RLS recursion when needed.

---

## AI Agent Architecture

Five agents routed by a Haiku router:

| Agent | Responsibility |
|---|---|
| Narrator | Scene narration and story continuity |
| Rules Arbiter | Rules lookups via pgvector RAG; cites retrieved chunks |
| NPC Dialogue | Stateless NPC speech (roster-aware upgrade in Phase 6c) |
| Lore Keeper | Cross-session fact recall from `sessions.transcript` |
| Encounter Builder | Combat and encounter generation |

**Router rules (do not change without updating this file):**
- Past-tense recall → Lore Keeper
- "Let's return to where we were in our previous session" → Lore Keeper (LORE_KEYWORDS)
- NPC dialogue vs lore recall: NPC Dialogue if asking an NPC to speak; Lore Keeper if recalling facts about an NPC

---

## RAG State (current)

| System | Chunks | Notes |
|---|---|---|
| 5E_2014 | ~2,335 | gen 4, Open5e SRD-filtered |
| AD&D 2E | 3 | OSRIC stub; falls back to training knowledge |
| PF2E | 1 | Stub; data sourcing deferred to pre-release |

- Match function threshold: `0.3` (Voyage embeddings)
- Operator: `extensions.<=>`
- No `embedding_generations` JOIN in match function
- Generation swap + orphan cleanup pattern in place via GitHub Actions manual dispatch

---

## Session Management (complete)

- Find-or-create logic on session load — no duplicate sessions
- Start/Resume button toggles correctly
- End Session closes all active sessions for the campaign
- Transcript saved after each exchange to `sessions.transcript`
- Read-only session log viewer with CSS Module styling
- Session history limited to 5 entries with timestamps and status indicators

---

## Database / Migration Rules

1. **Never edit a deployed migration.** Create a new one.
2. Test locally before applying to remote.
3. Use descriptive timestamped naming.
4. Lint before applying.
5. Game system IDs in TypeScript **must exactly match** the canonical values in DB constraints. Mismatches break campaign creation silently.
6. `user_id` vs `owner_id` — check the actual schema before writing queries; column naming is inconsistent across tables.

---

## Current Phase Status

| Phase | Status |
|---|---|
| 6a/6b — All 5 agents deployed and routing | ✅ Complete |
| Session management | ✅ Complete |
| Frontend redesign (visual overhaul) | 🔄 In progress — `globals.css`, `sign-in-page.tsx`, `campaigns-page.tsx` done. Session play pages, character sheets, campaign management, remaining components pending. |
| Phase 6c — NPC roster | ⏳ Next — not started |
| Phase 5 — Character CRUD / session wiring | ⏳ Queued after redesign |

### Frontend Redesign Rules
- Visual changes only. All Supabase queries and API calls must be preserved exactly.
- Reference files for design pattern: `globals.css`, `sign-in-page.tsx`, `campaigns-page.tsx`
- Each redesigned file gets a paired `.module.css`

### Phase 6c — NPC Roster (upcoming)
- Stateful NPCs per campaign: disposition, location, known facts
- NPC Dialogue agent upgrades from stateless → roster-aware
- Auto-extraction from transcripts is a goal (emergent NPCs like Rosie Greenhill, Sheriff Marcus Ironwood already exist in transcripts)

---

## Infrastructure

- Vercel hosting; `vercel link` with Git connection disabled
- All migrations version-controlled in `supabase/migrations/`, deployed via GitHub Actions
- CI pipeline: `ci.yml`, `deploy.yml`, `security.yml`, `pr-labeler.yml`, `dependabot.yml`, `labeler.yml`
- All feature branches PR into `main`
- Environment variables: `.env.local`, Vercel dashboard, GitHub Actions secrets — keep in sync

---

## What's Intentionally Deferred

- **PF2E RAG data:** Sourcing deferred to pre-release. Candidates: Archives of Nethys dumps, pf2e-tools JSON exports, pre-LevelDB Foundry commit pin.
- **AD&D 2E RAG:** Needs proper data sourcing beyond OSRIC stub.
- **FG Sync Bridge:** Architecture unresolved. Electron desktop client confirmed. `DB.backup()` latency spike is the first validation needed. Sync scripts on `fg-sync` branch of `CAG07/dcc-party-tracker`.
- **Session log improvements:** Pagination (50 msg/page), AI summary at top, search within transcript, virtualized scrolling — all deferred; implement in that order when prioritized.
