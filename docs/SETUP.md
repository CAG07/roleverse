# RoleVerse — Setup Guide

Everything you need to get started with RoleVerse and begin your AI-powered tabletop RPG sessions.

---

## Table of Contents

- [What You Need](#what-you-need)
- [1. Sign In to RoleVerse](#1-sign-in-to-roleverse)
- [2. Set Up Fantasy Grounds (Virtual Tabletop)](#2-set-up-fantasy-grounds-virtual-tabletop)
- [Using RoleVerse](#using-roleverse)
- [Supported Game Systems](#supported-game-systems)
- [Troubleshooting](#troubleshooting)

---

## What You Need

RoleVerse is a web app — there's nothing to install for the core experience. Fantasy Grounds integration requires the FG desktop app and a one-time sync setup.

| What | Why | Required? |
|------|-----|-----------|
| **A Google account** | To sign in to RoleVerse | Yes |
| **A modern web browser** | Chrome, Firefox, Edge, or Safari | Yes |
| **Fantasy Grounds Unity** | Virtual tabletop integration (characters, combat, maps) | Optional |

---

## 1. Sign In to RoleVerse

1. Open the RoleVerse web app in your browser.
2. Click **Sign in with Google**.
3. Choose your Google account and authorize access.
4. You'll be taken to your **Dashboard** — that's it, you're in!

> **Tip:** RoleVerse uses your Google account for sign-in. No separate password to remember.

---

## 2. Set Up Fantasy Grounds (Virtual Tabletop)

Fantasy Grounds Unity is a virtual tabletop application. When connected to RoleVerse, your characters, combat state, dice rolls, and battle maps sync automatically to the web app.

### If you don't have Fantasy Grounds yet:

1. Go to [fantasygrounds.com](https://www.fantasygrounds.com).
2. Purchase and download **Fantasy Grounds Unity**.
3. Install and launch it.

### Connecting Fantasy Grounds to RoleVerse

The Fantasy Grounds desktop sync is complete. A step-by-step setup guide for the desktop sync agent is coming soon.

---

## Using RoleVerse

### Creating a Campaign

1. From your **Dashboard**, click **New Campaign**.
2. Enter a **campaign name** (e.g., "The Lost Mines of Phandelver").
3. Optionally add a **description**.
4. Select a **game system** from the dropdown (see [Supported Game Systems](#supported-game-systems) below).
5. Click **Create Campaign**.

### Campaign Overview

After creating a campaign, you'll see its overview page with:

- Campaign name, description, and game system details.
- Quick-action cards for starting sessions and viewing characters.
- **NPC Roster** — a persistent list of named NPCs in your campaign, with disposition and known facts.

### Starting a Session

From a campaign's overview page, click **Start Session** to enter the session view:

- **Left sidebar** — Session notes, party status, and Fantasy Grounds connection status.
- **Center** — Chat window for AI game narrative and scene display.
- **Right** — Character sheet panel (changes based on your game system).

Type a message or player action in the chat window and the AI will respond as your Dungeon Master. Five specialized AI agents handle different request types automatically:

| Agent | Handles |
|-------|---------|
| **Narrator** | Player actions, scene descriptions, exploration |
| **Rules Arbiter** | Rules questions and mechanical lookups |
| **Lore Keeper** | Recall of campaign facts, past sessions, NPC history |
| **NPC Dialogue** | Speaking to and voicing named NPCs |
| **Encounter Builder** | Designing and generating combat encounters |

You don't need to choose which agent to use — the router selects the right one based on your message.

---

## Supported Game Systems

When you create a campaign, choose from the following. AI rules support varies by system.

### Full support

| System | Rules AI |
|--------|---------|
| **D&D 5E (2014)** | Full SRD — ~2,335 rules chunks ingested via Open5e |

### Partial support (training knowledge + limited RAG)

| System | Rules AI |
|--------|---------|
| **AD&D 2nd Edition** | OSRIC-based stub + Claude training knowledge |
| **Pathfinder 2E** | Claude training knowledge (full data ingestion planned) |

### Available in dropdown — training knowledge only (in development)

These systems appear in the game system selector and work with the AI agents, but have no RAG-backed rules content beyond Claude's training knowledge:

- AD&D 1st Edition
- D&D 3.5 Edition
- D&D 4th Edition
- D&D 5E (2024)
- Pathfinder 1E
- Dungeon Crawl Classics
- The One Ring 1E & 2E
- Cyberpunk 2020

---

## Troubleshooting

### "Sign in with Google" doesn't work

- Make sure you're using a supported browser (Chrome, Firefox, Edge, or Safari).
- Check that pop-ups are not blocked — the Google sign-in window may be prevented from opening.
- Try clearing your browser cache or using a private/incognito window.

### I signed in but got sent back to the landing page

- Try signing in again. Your session may have expired.
- If the issue persists, clear your browser cookies for the RoleVerse site and try again.

### I see an "Unauthorized" page after signing in

- Access may be restricted to specific accounts. Contact the RoleVerse administrator to have your Google email added to the allowed list.

### The page won't load or looks broken

- Make sure your browser is up to date.
- Try a hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (macOS).
- If the problem continues, [open an issue on GitHub](https://github.com/CAG07/roleverse/issues).
