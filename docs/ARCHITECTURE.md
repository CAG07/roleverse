# RoleVerse — Architecture

> This markdown file is the canonical architecture reference.

## Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router, no `src/`), React 19, TypeScript, CSS Modules |
| **Backend** | Next.js Route Handlers (serverless, Vercel) for AI orchestration and admin/ingestion endpoints; campaign/character/session CRUD goes direct through the Supabase client (RLS-enforced), not through API routes |
| **Database** | Supabase — PostgreSQL + pgvector + Auth (Google OAuth) + RLS |
| **AI Agents** | Anthropic Claude API (Sonnet for agents, Haiku for routing) |
| **Embeddings** | Voyage AI (`voyage-3-lite`, 512-dimensional) |
| **Ingestion** | GitHub Actions — manual-trigger workflow per game system |
| **Hosting** | Vercel |

Auth is Google OAuth SSO only. Each user's data is isolated at the Postgres level via RLS.

## Request lifecycle

```mermaid
flowchart TD
    Player[Player sends message] --> Route["/api/sessions/[sessionId]/message"]
    Route --> Router["routeMessage() — Haiku classifier<br/>lib/mcp/coordinator.ts"]
    Router -->|narration, NPC speech, combat, encounters| GM[Game Master Agent]
    Router -->|rules query| Rules[Rules Arbiter Agent]
    Router -->|recall| Lore[Lore Keeper Agent]

    Rules --> Voyage[Voyage embed query]
    Voyage --> PgVector[(pgvector<br/>match_rules_embeddings)]
    PgVector --> Rules

    Lore --> Transcript[(sessions.transcript<br/>+ campaigns.notes)]
    GM --> NpcTable[(npcs table)]

    GM --> Claude[Anthropic Claude API]
    Rules --> Claude
    Lore --> Claude

    Claude --> SSE[SSE stream to client]
    SSE --> Persist[(Save to sessions.transcript)]
```

## The orchestrator

The orchestrator does **routing, not coordination**. For each player message:

1. The session message route calls `routeMessage()` in `lib/mcp/coordinator.ts`.
2. That function sends the message plus a disambiguation prompt to Claude Haiku (fast, cheap) and gets back a single classification — which one of the three agents handles this message.
3. Exactly one agent runs. Agents do not call each other. The "multi-agent" experience comes from different messages across a conversation going to different specialists, not from agents collaborating on a single response.

Conversation history is shared across all agents. Each prior assistant message is annotated with an `[Agent Name]` prefix so an agent does not mistake another agent's statements for its own. A cross-agent trust rule in each agent's system prompt establishes that prior agents' statements of campaign fact are canonical and must not be disavowed.

Despite the `lib/mcp` directory naming, this is **not** the network Model Context Protocol — it's an in-process tool-registration pattern (`registerTool` / `getToolDefinitions` / tool execution in `lib/mcp/server.ts`) used to expose tools like `roll-dice` and `buildEncounter` to the Claude tool-use API.

## Per-agent context

| Agent | Context it gathers | Label color |
|-------|-------------------|-------------|
| Game Master | Present-tense narration, in-the-moment NPC dialogue, combat, encounter building (`buildEncounter` tool); loads party characters, referenced NPC roster records, previous session summary, module description | Gold |
| Rules Arbiter | Voyage-embedded query → `match_rules_embeddings` (pgvector, threshold 0.3, active generation, game-system filtered) → cited SRD chunks | Slate |
| Lore Keeper | `campaigns.notes` + session transcripts — past-tense recall and continuity | Purple |

## Data layer

Core Postgres tables: `campaigns`, `characters`, `sessions`, `npcs`, `campaign_embeddings`.

- **RAG:** `campaign_embeddings` holds baseline rules chunks (campaign_id NULL) and may hold per-campaign content. pgvector powers similarity search via `match_rules_embeddings`.
- **Generation swap:** baseline embeddings are versioned by a `generation` column with an `embedding_generations` state table, enabling zero-downtime re-ingestion (write new generation, atomically promote, delete old).
- **RLS:** every table is scoped to the owning user (`auth.uid()`) for per-user isolation. The owning-user column name is **not** consistent across tables (`user_id` on `campaigns`/`characters`/`sessions`/`campaign_embeddings`, `owner_id` on `npcs`) — check the actual schema before writing a new query.
- **NPC roster:** `npcs` per campaign with a 5-value disposition enum and structured `known_facts` JSONB.
- **Sessions:** find-or-create logic (one active session per campaign), transcript persisted per exchange, AI-generated summary on end, summary injected into the Game Master at the next session's start.

## Character sheets

Fully schema-driven and modular per game system — adding or changing a field never requires touching the generic display, form, or persistence code, only the one file for that system.

- **Storage:** `characters` has four flexible JSONB columns (`game_data_stats`, `game_data_combat`, `game_data_saves`, `game_data_skills`) plus `game_data_custom` for player-added custom fields. No schema migration is needed to add new character-sheet fields — they're just new keys in these JSONB blobs.
- **Schema files** (`lib/character/sheet-schema/{add2e,dnd5e,pf2e,dcc}.ts`): one `SystemSheetSchema` per supported system (`ADD2E`, `5E_2014`, `PATHFINDER_2E`, `DCC`), each a flat list of `SheetField`s. Each field declares a `kind` (`number` | `string` | `string-list` | `record-fixed` | `record-open` | `spell-slots`) and which of the four JSONB columns it belongs to. Field selection mirrors each system's actual mechanical content (ability-derived saves/skills, THAC0, Class DC, thief skills, corruption, etc.) — not any publisher's page layout or artwork, which stays RoleVerse's own visual design throughout.
- **Generic engine, not per-system code:** `BaseSheet.tsx` (display), `SystemFields.tsx` (create/edit form), and `buildGameDataColumns`/`hydrateSystemFieldsValue` (JSONB bucketing) all read the `SheetField[]` array and render/persist generically by `kind` — none of them contain a single per-system conditional. The only per-system exception is two `gameSystem === 'DCC'` branches in `SystemFields.tsx`, for DCC's bespoke Luck/occupation/mercurial-magic inputs that don't fit the generic field kinds — everything else for DCC (saves, thief skills, corruption, patron taint, known spells) is ordinary schema fields.
- **Per-system sheet components** (`components/character/sheets/{ADD2ESheet,DND5ESheet,PF2ESheet,DCCSheet}.tsx`): thin wrappers around `BaseSheet` supplying system-specific header text (race/class/level line) and, where needed, bespoke `extra` sections for content that doesn't fit a generic field kind (PF2E's rank-badge-colored proficiency ranks, DCC's live Luck editor and funnel-party roster). `CharacterSheet.tsx` is the single dispatch point, switching on `gameSystem` to the right component; systems without a structured schema (the SETUP.md "training knowledge only, in development" list — AD&D 1E, 3.5E, 4E, 5E 2024, PF1E, The One Ring 1E & 2E, Cyberpunk 2020) fall through to `GenericSheet.tsx`, a flat dump of whatever's in the JSONB columns.
- **Compact vs. full display:** a `keyStat?: boolean` marker on `number`/`string` fields controls the in-session compact panel (ability scores + HP + `keyStat` fields only — AC everywhere, THAC0 for AD&D 2E, Perception + Hero Points for PF2E). The full sheet (everything) is reachable via a maximize button (`CharacterSheetModal`) from the session view, or directly on the campaign's character detail page.

## Storage

Supabase Storage (S3-backed under the hood — a Storage "bucket" is the same primitive as an S3 bucket, not a lighter abstraction on top of it). Buckets are shared across all users; per-user isolation comes from RLS on `storage.objects` keyed to a `{user_id}/...` folder prefix, not from provisioning a bucket per user or per tenant — that's the standard multi-tenant pattern, and splitting into more buckets would not reduce cost or improve scaling (Supabase bills total GB + egress across the whole project regardless of bucket count).

| Bucket | Access | Path convention | Used by |
|--------|--------|------------------|---------|
| `campaign-pdfs` | Private — RLS restricts both read and write to the owning user's folder | `{user_id}/{campaign_id}/{timestamp}-{filename}` | `CampaignFilesPanel` — upload/list/delete, plus an "Index for AI" action that parses and embeds the PDF into `campaign_embeddings` (see RAG below) |
| `campaign-scenes` | Public read, RLS-restricted write | `{user_id}/{campaign_id}/{timestamp}-{filename}` | `CampaignScenesPanel` (photo/video library, 10MB/100MB caps) + `ScenePickerModal` (attach one as the active in-session scene) |
| `campaign-covers` | Public read, RLS-restricted write | `{user_id}/{campaign_id}/cover.jpg` | Campaign card thumbnails (`EditCampaignPage`, `CampaignsListPage`) — client-side resized to a 1024×1024 JPEG before upload, 5MB source-file cap |
| `character-avatars` | Public read, RLS-restricted write | `{user_id}/...` | Provisioned in the initial schema; not yet wired to any UI |

Public buckets mean anyone with the direct file URL can view it without authentication (same model as most apps' avatar/thumbnail URLs) — appropriate since these images aren't sensitive. Writes stay RLS-gated to the owning user's folder regardless of a bucket's public/private read setting.

**Known gaps, not yet built:**
- No per-user or per-campaign storage quota — only a per-file size cap enforced in application code (client-side check before upload, bypassable by a modified client). A bucket-level size/MIME-type limit in the Supabase dashboard would close that gap as defense-in-depth.
- Deleting a campaign does not cascade-delete its Storage files — Postgres row deletes don't automatically remove Storage objects, so orphaned files accumulate today.
- Both are natural fits for the Tier 2.1 rate-limiting work on the roadmap when prioritized, not blocking for current usage.

## Ingestion

Baseline rules content is ingested via a GitHub Actions workflow (`workflow_dispatch`) — the only trigger path. It requires GitHub write access to the repo, which is the actual access boundary (not anything in application code). The pipeline fetches from source (Open5e for 5E SRD, with `document__slug=wotc-srd` filter), chunks, embeds via Voyage, and writes under a new generation, promoting atomically on success. 5E_2014 has ~2335 chunks. ADD2E and PATHFINDER_2E are stubs (training-knowledge fallback / data deferred).

An in-app `/admin` page + `POST /api/admin/ingest` existed as a second trigger path (gated by an `ADMIN_EMAILS` env var allowlist) and was removed — GitHub Actions already covered the need, and the app-side gate had a fail-open bug (`adminEmails.length > 0 && !includes(...)` grants access to *everyone* if `ADMIN_EMAILS` is ever unset, rather than denying). Removing the redundant path removed the bug along with it, rather than patching a check that shouldn't have existed as a second privileged surface in the first place.

**When an admin page would earn its place again:** nothing in the current architecture needs one. The natural trigger point is Tier 2 monetization (credits/subscriptions) — looking up a user's credit balance or subscription state for a support request, manually adjusting a balance, or seeing who hasn't accepted an updated ToS are genuine admin tasks that don't fit any existing player-facing UI. Until then, Supabase's own dashboard covers the rare cases where direct data access is needed. If one is built, keep it scoped to that actual need rather than growing back into a general ingestion/ops console — and gate it fail-closed (deny by default, allow only on an explicit match) rather than repeating this bug's shape.

**Campaign PDF RAG:** a player-uploaded module PDF can be indexed on demand ("Index for AI" in `CampaignFilesPanel`) via `POST /api/campaigns/[id]/modules/ingest` (`lib/rag/ingest-campaign-pdf.ts`). This reuses the baseline pipeline's building blocks (`chunkText`, `embedBatch`) but is a separate, simpler orchestrator — no generation-swap, writes go through the request-scoped RLS-protected client rather than the service-role client, since `campaign_embeddings`' insert policy already permits `campaign_id IS NOT NULL AND auth.uid() = user_id` (added in `20260301000000_rag_phase_6a.sql`, which also added the `user_pdf` `source_type` — this feature was schema-ready well before it was built). `match_rules_embeddings` already unions baseline (`campaign_id IS NULL`) and campaign-scoped rows in one query and the Rules Arbiter already passes `campaignId` on every search, so retrieval needed no changes. Text extraction uses `pdf-parse-fork` (a dependency that predates this feature, previously unused). Because this pipes arbitrary user-uploaded text into a context block the Rules Arbiter treats as authoritative, `buildSystemPrompt` in `rules-arbiter.ts` carries explicit prompt-injection framing on that block, matching the pattern the Game Master already uses for `module_description`.

## Streaming

Agent responses stream to the client via Server-Sent Events:

```
event: agent_type   → which agent is responding (sets label immediately)
event: token        → incremental text chunks
event: error        → stream failed; any partial content is persisted with a "[truncated]" marker
event: done         → stream complete
```

The full response is accumulated server-side and saved to `sessions.transcript`.

NPC roster entries are not proposed inline during chat. A player or GM explicitly triggers **Extract NPCs** on a session, which parses the transcript (`lib/sessions/extract-npcs.ts`) and surfaces proposals for approval in the NPC roster UI.

## Fantasy Grounds bridge

Desktop sync from Fantasy Grounds into RoleVerse is complete — FG backup-file parsing maps rulesets to game systems and characters into the app.

## Deferred / planned (not yet built)

- TTS / voice output for NPCs (optional, off-by-default)
- Voice input transcription (speech-to-text) — the mic-permission indicator (`VoiceStatus`) is built and captures nothing beyond browser mic access; the actual transcription approach is undecided (Whisper is explicitly not the planned path)
- Uploaded-PDF indexing feeds the Rules Arbiter only — the Lore Keeper doesn't do RAG search at all (it reads `campaigns.notes` + transcripts directly). A house rules editor (structured, not just an indexed PDF) is still unbuilt.
- On-demand AI scene generation — the scene asset library (upload/attach photos & videos) is built; generating new images on demand is deliberately deferred pending real usage-cost gating (image generation has real per-call cost, unlike text tokens)
- Kanka integration for external lore management
- PF2E proper data sourcing
