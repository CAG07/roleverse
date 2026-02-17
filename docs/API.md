# RoleVerse — API Reference

This document covers the API endpoints currently implemented in RoleVerse. As the project evolves, new endpoints will be added here.

---

## Base URL

- **Local development:** `http://localhost:3000`
- **Production:** Your Vercel deployment URL

---

## Authentication

Most routes are protected by Supabase authentication middleware. The middleware runs on every request (except those explicitly excluded) and:

1. Refreshes the user's auth session via cookies.
2. Redirects unauthenticated users to the landing page (`/`) for protected routes.
3. Optionally restricts access to emails listed in the `ALLOWED_EMAILS` environment variable.

Public routes that bypass authentication:
- `/` (landing page)
- `/unauthorized`
- `/auth/*` (authentication flows)
- `/api/health`
- Static assets (`_next/static`, images, etc.)

---

## Endpoints

### Health Check

Check whether the application is running.

```
GET /api/health
```

**Authentication:** None required

**Response:**

```json
{
  "status": "ok"
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| `200` | Application is healthy |

**Usage:** This endpoint is used by the CI/CD deployment pipeline to verify the application is running after a Vercel deployment. It is also useful for uptime monitoring.

---

### Auth Callback

Handles the OAuth redirect from Google after the user signs in. This is not called directly — Supabase redirects the user here after Google authentication.

```
GET /auth/callback?code=<authorization_code>
```

**Authentication:** None required (this establishes the session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | The authorization code provided by Google OAuth via Supabase |

**Behavior:**

- If the `code` is valid, the user's session is created and they are redirected to `/dashboard`.
- If the `code` is missing or invalid, the user is redirected to `/` (landing page).

**Status Codes:**

| Code | Description |
|------|-------------|
| `302` | Redirect to `/dashboard` on success, or `/` on failure |

---

## Database Tables

The following tables are available via Supabase client libraries (not direct API endpoints). All tables have Row Level Security (RLS) policies — users can only access their own data.

| Table | Description |
|-------|-------------|
| `profiles` | User profile data (synced from auth provider) |
| `campaigns` | Campaigns with name, description, and game system |
| `characters` | Characters tied to campaigns with system-specific JSONB data |
| `sessions` | Game session records |
| `combat_state` | Combat tracker state per session |
| `campaign_embeddings` | RAG embeddings for uploaded PDFs (pgvector) |
| `fg_commands` | Fantasy Grounds command queue |
| `campaign_members` | Multi-user campaign membership (dm/player roles) |
| `discord_user_links` | Discord ↔ RoleVerse user linking |
| `discord_server_links` | Discord guild ↔ campaign linking |
| `voice_profiles` | Voice settings for AI agents/NPCs |
| `scene_media` | Scene images and media assets |

### Accessing Data via Supabase Client

RoleVerse uses the Supabase JavaScript client to interact with the database, not custom REST endpoints. Example:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Fetch campaigns for the current user
const { data: campaigns } = await supabase
  .from('campaigns')
  .select('id, name, description, game_system, created_at')
  .eq('owner_id', user.id)
  .order('updated_at', { ascending: false });

// Create a new campaign
const { data, error } = await supabase
  .from('campaigns')
  .insert({
    name: 'My Campaign',
    description: 'An epic adventure',
    game_system: 'dnd-5e-2014',
    owner_id: user.id,
  })
  .select('id')
  .single();
```

---

## Planned Endpoints

The following endpoints are designed but not yet implemented. They are documented here for reference as the project progresses.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session/start` | Start a new game session |
| `POST` | `/api/session/process` | Process a player action (system-aware) |
| `POST` | `/api/agents/orchestrate` | Main AI agent coordinator |
| `POST` | `/api/voice/transcribe` | Speech-to-text via OpenAI Whisper |
| `POST` | `/api/voice/synthesize` | Text-to-speech (OpenAI TTS / ElevenLabs) |
| `POST` | `/api/discord/interactions` | Discord interaction webhook |
| `POST` | `/api/discord/link` | Link Discord account to RoleVerse |
| `POST` | `/api/campaigns/upload-pdf` | Upload and ingest rulebook PDF for RAG |
| `POST` | `/api/fg-bridge/sync` | Receive data from Fantasy Grounds desktop app |
| `POST` | `/api/mcp` | MCP (Model Context Protocol) server endpoint |
