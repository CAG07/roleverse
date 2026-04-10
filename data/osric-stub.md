# OSRIC Content Placeholder

**Status:** Pending — full OSRIC rules text not yet ingested.

OSRIC (Old School Reference and Index Compilation) is an OGL retro-clone of the
Advanced Dungeons & Dragons 1st and 2nd Edition rule systems, released under the
Open Game License. It serves as the closest machine-readable equivalent to the AD&D 2E
rules framework.

## Why this stub exists

No clean machine-readable version of OSRIC (JSON, structured markdown, or similar) was
found during Phase 6a research. The canonical OSRIC PDF is out of scope for Phase 6a
(PDF ingestion is deferred). This placeholder document ensures that:

1. The `game_system = 'ADD2E'` entry exists in the `campaign_embeddings` vector index.
2. The Rules Arbiter agent for AD&D 2E understands the RAG context is limited.

## What the Rules Arbiter should do for ADD2E queries

When answering rules questions for AD&D 2E campaigns, the agent should:

- Rely primarily on its training knowledge of AD&D 2E and OSRIC rules.
- Reference the 2E Player's Handbook, Dungeon Master Guide, and THAC0 tables.
- Clarify when an answer is from training knowledge rather than an indexed source.
- Advise players that a full OSRIC index will be available in a future update.

## Key AD&D 2E rules summary (for agent context)

### Combat
- **THAC0**: To Hit Armor Class 0. Lower is better. Roll d20, add result to target's AC;
  if sum ≥ THAC0, attack hits. THAC0 = 20 - attack bonus.
- **Armor Class**: Descending scale. AC 10 = unarmored, AC -10 = heavily armored. Lower is
  better.
- **Saving Throws**: Five categories — Paralyzation/Poison/Death Magic, Rod/Staff/Wand,
  Petrification/Polymorph, Breath Weapon, Spell.

### Characters
- **Ability Scores**: Strength (with exceptional STR for fighters 18/xx), Dexterity,
  Constitution, Intelligence, Wisdom, Charisma.
- **Classes**: Fighter, Paladin, Ranger, Mage, Specialist Wizard, Cleric, Druid,
  Thief, Bard, and optional multi-class/dual-class.
- **Kits**: Sub-class specializations from the Complete Handbooks (Fighter's Handbook,
  Thief's Handbook, etc.).
- **Proficiencies**: Non-weapon (NWP) and weapon proficiency slots, gained by class and
  level.

### Experience
- Non-linear XP tables per class. Fighters need less XP per level than wizards at low
  levels but more at high levels.

### Spellcasting
- Memorization-based (Vancian). Wizards choose spells from spellbook. Clerics pray for
  spells.
- Spell school specializations available for wizards (but opposing schools are forbidden).
