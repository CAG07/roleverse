# Phase 6 — AI Agents & NPC System

## Phase 6a/6b — Five Agents (Complete)

All five agents deployed and routing via Haiku classifier:
- Narrator, Rules Arbiter, NPC Dialogue, Lore Keeper, Encounter Builder
- RAG retrieval works for 5E_2014 (2335 chunks, threshold 0.3, Voyage embeddings)
- Session transcript persistence to `sessions.transcript` JSONB
- Cross-session memory via Lore Keeper reading last 5 session transcripts

## Phase 6c — NPC Roster (May/June 2026)

- `npcs` table per campaign with structured `known_facts` JSONB
- Hybrid creation: manual CRUD + per-session extraction trigger
- 5-value enum disposition (friendly/helpful/neutral/wary/hostile)
- Disposition shifts via agent proposal + player roll resolution
- NPC Dialogue does lookup + propose; never writes silently
- All updates flow through shared NpcProposalCard component
- New facts deduped by case-insensitive substring match against existing

### Schema

```sql
CREATE TYPE public.npc_disposition AS ENUM ('friendly', 'helpful', 'neutral', 'wary', 'hostile');

CREATE TABLE public.npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  race TEXT, occupation TEXT, description TEXT,
  personality TEXT, voice_notes TEXT,
  disposition public.npc_disposition NOT NULL DEFAULT 'neutral',
  current_location TEXT,
  known_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, name)
);
```

### Agent Proposal Protocol

The NPC Dialogue agent embeds structured proposals in responses using sentinels:

```
[NPC_PROPOSAL_START]
{ "kind": "append_facts" | "disposition_shift", ... }
[NPC_PROPOSAL_END]
```

The route handler at `app/api/sessions/[sessionId]/message/route.ts` strips the sentinel block from the player-visible content and returns it as `proposal` in the API response. The ChatWindow renders an `NpcProposalCard` inline below the message. All writes require player confirmation.

### Extraction

`POST /api/campaigns/[id]/sessions/[sessionId]/extract-npcs` uses Claude Haiku to extract NPCs from a session transcript. Returns `NpcProposal[]` without writing to the database. Triggered by the "Extract NPCs from Session" button on the session log page. Capped at 10 proposals per run.

### Key Files

- Migration: `supabase/migrations/20260601000000_npc_roster.sql`
- Types: `lib/types/npc.ts`
- API: `app/api/campaigns/[id]/npcs/route.ts`, `app/api/campaigns/[id]/npcs/[npcId]/route.ts`
- Extraction: `app/api/campaigns/[id]/sessions/[sessionId]/extract-npcs/route.ts`
- Agent: `lib/mcp/agents/npc-dialogue.ts`
- UI: `components/npc/NpcProposalCard.tsx`, `NpcForm.tsx`, `NpcDetailPage.tsx`
- Pages: `app/(app)/campaigns/[id]/npcs/` (list, new, detail, edit)
