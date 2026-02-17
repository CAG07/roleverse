# RoleVerse — Setup Guide

Complete setup instructions for running RoleVerse locally. This guide covers everything from prerequisites to your first campaign.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Clone the Repository](#1-clone-the-repository)
- [2. Install Dependencies](#2-install-dependencies)
- [3. Set Up Supabase](#3-set-up-supabase)
- [4. Configure Environment Variables](#4-configure-environment-variables)
- [5. Run Database Migrations](#5-run-database-migrations)
- [6. Start the Development Server](#6-start-the-development-server)
- [7. Using RoleVerse](#7-using-roleverse)
- [Available Scripts](#available-scripts)
- [Project Structure Overview](#project-structure-overview)
- [Supported Game Systems](#supported-game-systems)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18 or later | JavaScript runtime |
| **npm** | 9 or later | Package manager (comes with Node.js) |
| **Git** | Any recent version | Source control |

You will also need accounts for:

| Service | Purpose | Link |
|---------|---------|------|
| **Supabase** | Database, authentication, storage | [supabase.com](https://supabase.com) |
| **Google Cloud Console** | Google OAuth sign-in | [console.cloud.google.com](https://console.cloud.google.com) |

> **Note for non-technical users:** Node.js is a program that runs JavaScript code on your computer. npm is a tool that downloads libraries the project needs. If you don't have Node.js, download it from [nodejs.org](https://nodejs.org) — choose the LTS (Long Term Support) version.

---

## 1. Clone the Repository

Open a terminal (Command Prompt on Windows, Terminal on macOS/Linux) and run:

```bash
git clone https://github.com/CAG07/roleverse.git
cd roleverse
```

---

## 2. Install Dependencies

Install the project's required packages:

```bash
npm install
```

This will download all the libraries listed in `package.json`. It may take a minute or two.

---

## 3. Set Up Supabase

RoleVerse uses [Supabase](https://supabase.com) for its database, user authentication, and file storage.

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**.
3. Give your project a name (e.g., "roleverse").
4. Set a strong **database password** — save this somewhere safe.
5. Choose a region close to you.
6. Click **Create new project** and wait for it to finish provisioning.

### Enable Google OAuth

RoleVerse uses Google sign-in for authentication. To set this up:

1. **In Google Cloud Console:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com).
   - Create a new project (or select an existing one).
   - Navigate to **APIs & Services → Credentials**.
   - Click **Create Credentials → OAuth client ID**.
   - Choose **Web application**.
   - Under **Authorized redirect URIs**, add:
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
     Replace `<your-supabase-project-ref>` with your Supabase project reference ID (found in your Supabase project settings under **General**).
   - Click **Create** and note the **Client ID** and **Client Secret**.

2. **In Supabase Dashboard:**
   - Go to **Authentication → Providers**.
   - Find **Google** and toggle it on.
   - Paste in your **Client ID** and **Client Secret** from the previous step.
   - Click **Save**.

---

## 4. Configure Environment Variables

Create a file called `.env.local` in the project root:

```bash
# Required — Supabase connection
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Optional — Restrict access to specific email addresses (comma-separated)
# If not set, any Google account can sign in.
# ALLOWED_EMAILS=you@gmail.com,friend@gmail.com
```

**Where to find these values:**

- Go to your Supabase project dashboard.
- Navigate to **Settings → API**.
- Copy the **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`.
- Copy the **anon / public** key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

> **Security note:** The `NEXT_PUBLIC_` prefix means these values are visible to the browser. The anon key is safe to expose — it only grants access allowed by your Row Level Security (RLS) policies.

---

## 5. Run Database Migrations

The database schema is managed through migration files in `supabase/migrations/`. You have two options:

### Option A: Using the Supabase Dashboard (Recommended for Beginners)

1. Open your Supabase project in the dashboard.
2. Go to **SQL Editor**.
3. Run each migration file in order:
   - `supabase/migrations/20250101000000_initial_schema.sql`
   - `supabase/migrations/20250101010000_security_hardening.sql`
   - `supabase/migrations/20250101020000_multi_user_and_discord.sql`
   - `supabase/migrations/20250101030000_scene_media.sql`
4. Copy the contents of each file, paste into the SQL Editor, and click **Run**.

### Option B: Using the Supabase CLI

If you have the Supabase CLI installed:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

---

## 6. Start the Development Server

```bash
npm run dev
```

The app will start at **http://localhost:3000**. Open this URL in your browser.

### What You'll See

1. **Landing page** — A "Sign in with Google" button.
2. **Sign in** — Click the button and authenticate with your Google account.
3. **Dashboard** — After sign-in, you'll be redirected to the campaign dashboard.

---

## 7. Using RoleVerse

### Creating a Campaign

1. From the **Dashboard**, click **New Campaign**.
2. Enter a **campaign name** (e.g., "The Lost Mines of Phandelver").
3. Optionally add a **description**.
4. Select a **game system** from the dropdown (e.g., D&D 5E 2014, AD&D 2E, Pathfinder 2E).
5. Click **Create Campaign**.

### Campaign Overview

After creating a campaign, you'll see its overview page with:
- Campaign name, description, and game system details.
- Quick-action cards for starting sessions, uploading PDFs, and viewing characters.

### Starting a Session

From a campaign's overview page, click **Start Session** to enter the three-column session layout:
- **Left sidebar** — Session notes, party status, Fantasy Grounds connection status.
- **Center** — Chat window for game narrative and scene display.
- **Right** — Character sheet panel (system-specific).

> **Note:** AI agents, voice features, PDF upload, Fantasy Grounds integration, and Discord integration are planned features that have not yet been implemented. The session UI is currently a visual framework.

---

## Available Scripts

Run these from the project root:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Run ESLint and auto-fix issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting without changes |
| `npm run type-check` | Run TypeScript type checking |
| `npm run supabase:start` | Start local Supabase (requires Docker) |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run supabase:reset` | Reset local database |
| `npm run supabase:migrate` | Push migrations to linked Supabase project |
| `npm run security:scan` | Run npm audit for vulnerabilities |

---

## Project Structure Overview

```
roleverse/
├── app/                    # Next.js pages and API routes
│   ├── (app)/              # Auth-protected pages (dashboard, campaigns, sessions)
│   ├── auth/               # OAuth callback and sign-out
│   └── api/health/         # Health check endpoint
├── components/             # React components
│   ├── auth/               # Google sign-in button
│   ├── campaign/           # Campaign cards, list, game system selector
│   ├── character/          # Character sheets (system-specific)
│   ├── session/            # Session UI (chat, sidebar, scene display)
│   └── ui/                 # shadcn/ui primitives (button, card, input, etc.)
├── lib/                    # Core business logic
│   ├── supabase/           # Database clients and auth middleware
│   ├── game-systems/       # Game system registry and types
│   └── types/              # Shared TypeScript types
├── supabase/               # Database migrations and configuration
│   ├── migrations/         # SQL schema migrations (run in order)
│   └── tests/              # RLS policy tests
├── docs/                   # Project documentation
└── .github/                # CI/CD workflows
```

For a detailed file listing, see [ROLEVERSE.txt](./ROLEVERSE.txt).

---

## Supported Game Systems

RoleVerse includes built-in support for the following tabletop RPG systems. When you create a campaign, select the system your group plays:

| System | ID |
|--------|----|
| AD&D 1st Edition | `add-1e` |
| AD&D 2nd Edition | `add-2e` |
| D&D 3.5 Edition | `dnd-3-5e` |
| D&D 4th Edition | `dnd-4e` |
| D&D 5E (2014) | `dnd-5e-2014` |
| D&D 5E (2024) | `dnd-5e-2024` |
| Pathfinder 1E | `pathfinder-1e` |
| Pathfinder 2E | `pathfinder-2e` |
| Dungeon Crawl Classics | `dcc` |
| The One Ring 1E | `tor-1e` |
| The One Ring 2E | `tor-2e` |
| Cyberpunk 2020 | `cyberpunk-2020` |

Each system defines its own ability scores, character schema, rules prompt for AI agents, and Fantasy Grounds ruleset mapping.

---

## Troubleshooting

### "Sign in with Google" does nothing

- Verify your Google OAuth credentials are correctly configured in both Google Cloud Console and the Supabase dashboard.
- Check that the redirect URI in Google Cloud Console matches your Supabase project URL exactly.

### Redirected to the landing page after sign-in

- Make sure your `.env.local` has the correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- If you have `ALLOWED_EMAILS` set, confirm your Google email is included in the list.

### "Unauthorized" page after sign-in

- Your email is not in the `ALLOWED_EMAILS` list. Either add it or remove/comment out the `ALLOWED_EMAILS` variable to allow any Google account.

### Database errors when creating campaigns

- Make sure you ran all four migration files in order (see [Run Database Migrations](#5-run-database-migrations)).
- Check that Row Level Security (RLS) is enabled on all tables — the migrations handle this automatically.

### Build errors

- Run `npm run type-check` to see TypeScript errors.
- Run `npm run lint` to check for code issues.
- Make sure you are using Node.js 18 or later (`node --version`).

### Port 3000 already in use

- Another application is using port 3000. Either stop it or start the dev server on a different port:
  ```bash
  PORT=3001 npm run dev
  ```