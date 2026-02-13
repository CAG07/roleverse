# 🎲 RoleVerse - AI-Powered RPG Companion

A tabletop RPG companion that brings **AI-powered DM assistance**, **Fantasy Grounds integration**, and **voice-enabled gameplay** for your solo RPG campaigns.

## ✨ Features

### AI Dungeon Master (5 Specialized Agents)
- **Rules Arbiter**: Knows RPG rules from uploaded PDFs
- **Lore Keeper**: Accesses your campaign knowledge via RAG (queries uploaded PDFs)
- **Encounter Builder**: Creates dynamic encounters and surprises
- **Narrator**: Crafts immersive descriptions and storytelling
- **NPC Dialogue**: Roleplays characters with consistent personalities

### Fantasy Grounds Integration
- **Auto-sync characters** from Fantasy Grounds
- **Real-time combat tracking** iniatiative, HP, attacks, damage, etc.
- **Seamless data flow** between FG and web app
- **Desktop app** for cross-platform integration

### Voice-Enabled Gameplay
- **Push-to-talk** interface powered by OpenAI Whisper
- **Text-to-speech** responses from AI DM
- **Natural conversation** - no typing needed during play

### Campaign Management and Kanka Integration
- Upload your **RPG rulebooks** (PDFs)
- **RAG ingestion** for AI to reference rules
- **Character sheets** synced from Fantasy Grounds
- **Session history** and transcripts
- **Kanka.io integration** for worldbuilding and campaign management

### Supported Game Systems
- AD&D 1st Edition
- AD&D 2nd Edition
- D&D 3.5
- D&D 4E
- D&D 5E (2014 & 2024)
- Pathfinder 1E & 2E
- Dungeon Crawl Classics
- The One Ring 1E & 2E
- Cyberpunk 2020

## 🏗️ Technology Stack

| Layer | Technology 
|-------|-----------|
| **Frontend** | Next.js 15 + React 19 
| **Backend** | Next.js API Routes (serverless)
| **Database** | Supabase (PostgreSQL + pgvector)
| **AI** | Anthropic Claude
| **Embeddings** | OpenAI ada-002
| **Voice** | OpenAI Whisper + ElevenLabs 
| **Desktop** | Electron 
| **Hosting** | Vercel 

## 🚀 Quick Start
Placeholder for user setup instructions. See [SETUP.md](./SETUP.md) for full details.

## 📖 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide and user instructions
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture
- **[API.md](./docs/API.md)** - API endpoints reference
- **[AGENTS.md](./docs/AGENTS.md)** - AI agent implementation details
- **[FG_INTEGRATION.md](./docs/FG_INTEGRATION.md)** - Fantasy Grounds sync protocol

## 🤝 Contributing

Contributions and submitting issues are welcome:
1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature or bug/important-fix`)
3. Commit changes 
4. Push to branch 
5. Open Pull Request

## 📝 License

GNU AFFERO GENERAL PUBLIC LICENSE Version 3

## 🙏 Acknowledgments

- **Anthropic** - Claude AI powers the DM agents
- **OpenAI** - Whisper & embeddings for voice and RAG
- **Supabase** - Database, auth, and storage
- **Vercel** - Hosting and deployment
- **SmiteWorks** - Fantasy Grounds VTT
- **Kanka.io** - Campaign management

## 📞 Support

- [SETUP.md](./SETUP.md) - Setup troubleshooting
- [GitHub Issues](link-to-issues) - Report bugs

## 🎲 Happy Adventuring!

Build something amazing. Share it with friends. Roll for initiative! ⚔️
