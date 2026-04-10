# Phase 6a — RAG Source Research

This document records the research performed for Phase 6a to identify machine-readable
sources for baseline rules content for each of the three supported game systems.

---

## 5E_2014 — D&D 5th Edition 2014

**Chosen source:** Open5e REST API  
**URL:** <https://api.open5e.com>  
**Type:** `api`  
**License:** Open Game License (OGL) / SRD  

### Findings

Open5e (<https://open5e.com>, <https://github.com/open5e/open5e-api>) is a well-maintained
community project that exposes the entire D&D 5E 2014 SRD as a paginated JSON REST API.
No authentication is required. Endpoints used by the ingestion fetcher:

| Endpoint | Content |
|----------|---------|
| `/spells/?limit=200` | All SRD spells |
| `/monsters/?limit=200` | All SRD monsters |
| `/classes/?limit=50` | Class summaries |
| `/races/?limit=50` | Race descriptions |
| `/sections/?limit=100` | Rules text sections |

Each endpoint returns `{ count, next, previous, results }` and supports pagination via
`?page=N`. All content is SRD-legal (no non-OGL material is included).

### Caveats

- Only SRD content is available (no SCAG, XGtE, TCoE, etc.).
- The API occasionally changes base URL paths between major versions; pin to v1 if needed.

---

## ADD2E — Advanced Dungeons & Dragons 2nd Edition

**Chosen source:** OSRIC stub (fallback)  
**URL:** <https://osricwiki.presgas.name/doku.php>  
**Type:** `srd_clone`  
**License:** Open Game License (OGL)  

### Findings

OSRIC (Old School Reference and Index Compilation) is an OGL retro-clone that replicates
the AD&D 1E/2E rules framework. Research performed:

1. **GitHub search: "OSRIC markdown github", "OSRIC SRD json"**  
   No clean machine-readable JSON or well-structured markdown repository was found.  
   The OSRIC PDF is the canonical distribution but PDFs are out of scope for Phase 6a.

2. **OSRIC Wiki** (<https://osricwiki.presgas.name>)  
   A DokuWiki installation exists with structured content, but scraping it is unreliable
   and the markup is inconsistent.

3. **Dragonsfoot / Knights & Knaves repositories**  
   No JSON/markdown exports found.

4. **GitHub: "osric" language:Markdown stars:>5**  
   No usable results — most repos are campaign notes, not rule references.

### Decision

Fallback to `data/osric-stub.md`. The OSRIC stub contains a human-readable placeholder
note explaining the gap. The Rules Arbiter system prompt for ADD2E explicitly informs
the model to rely on its training knowledge for AD&D 2E queries rather than RAG context.

This ensures the `game_system = 'ADD2E'` row exists in the embeddings index so the
`match_rules_embeddings` function returns the placeholder (rather than zero rows) and the
model understands why no detailed rules text is available.

---

## PATHFINDER_2E — Pathfinder 2nd Edition

**Chosen source:** Foundry VTT PF2E system compendium  
**URL:** <https://github.com/foundryvtt/pf2e>  
**Type:** `dataset`  
**License:** Open Game License (OGL) + Community Use Policy  

### Findings

1. **GitHub search: "pf2e srd json", "archives of nethys data export", "pf2e tools data"**

2. **Foundry VTT PF2E system** (<https://github.com/foundryvtt/pf2e>)  
   This is an open-source, MIT-licensed Foundry VTT game system that contains the entire
   PF2E SRD as machine-readable data. The compendium packs are stored under `packs/` in
   LevelDB format (`.db` files) in recent versions. The repo is large (~100 MB) and the
   LevelDB files require `classic-level` or `level` npm packages to read.

3. **pf2e-data community export**  
   Searched for standalone JSON exports derived from the Foundry pf2e system. The
   `@pf2e-toolbox` GitHub organisation and related repos provide TypeScript tooling but
   not a standalone pre-exported JSON dataset suitable for direct ingestion.

4. **Archives of Nethys** (<https://2e.aonprd.com>)  
   The definitive PF2E rules reference. No official JSON dump is publicly available.
   Scraping is feasible with `cheerio` but is fragile, rate-limited, and against AoN's
   ToS for bulk retrieval.

### Decision

The ingestion fetcher targets the **Foundry VTT PF2E GitHub releases**, which periodically
include compendium exports. The fetcher:

1. Calls the GitHub API to find the latest release of `foundryvtt/pf2e`.
2. Downloads the pack data for a curated subset of SRD compendiums (spells, bestiary,
   feats, actions).
3. Parses LevelDB-format `.db` files using the `classic-level` Node package (added to
   dependencies when ingestion is run server-side).

**Note for operators:** The PF2E ingestion fetcher requires `GITHUB_TOKEN` (optional but
recommended to avoid rate limits) and downloads several hundred MB of pack data. Run it
on a machine with adequate disk space and network. The first ingestion pass may take
10–20 minutes.

### Caveats

- Foundry pf2e pack format changed from JSON (pre-v5) to LevelDB (v5+). The fetcher
  targets the LevelDB format used by current releases.
- Only OGL/Community-Use-licensed content is ingested; Third-Party Publisher content is
  excluded by the compendium selection list.

---

## Summary

| System | Source | Strategy |
|--------|--------|----------|
| 5E_2014 | Open5e API | Live API calls, paginated |
| PATHFINDER_2E | Foundry VTT PF2E packs | GitHub releases, LevelDB parse |
| ADD2E | OSRIC stub | Local file fallback |
