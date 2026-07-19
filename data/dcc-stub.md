# Dungeon Crawl Classics (DCC RPG) Content Placeholder

**Status:** Pending — full DCC rules text not yet ingested.

Dungeon Crawl Classics (DCC RPG) is a retro-inspired sword & sorcery RPG published
by Goodman Games, drawing on Appendix N pulp fantasy inspirations. Core mechanics
are released under the Open Game License.

## Why this stub exists

No clean machine-readable version of the DCC rules (JSON, structured markdown, or
similar) was found. This placeholder document ensures that:

1. The `game_system = 'DCC'` entry exists in the `campaign_embeddings` vector index.
2. The Rules Arbiter agent for DCC understands the RAG context is limited.

## What the Rules Arbiter should do for DCC queries

When answering rules questions for DCC campaigns, the agent should:

- Rely primarily on its training knowledge of the DCC RPG core rulebook.
- Clarify when an answer is from training knowledge rather than an indexed source.
- Advise players that a full DCC index will be available in a future update.

## Key DCC rules summary (for agent context)

### The Dice Chain
DCC uses a unique "dice chain" beyond the standard polyhedral set, used to represent
degrees of success/failure and scaling bonuses/penalties: **d3, d4, d5, d6, d7, d8,
d10, d12, d14, d16, d20, d24, d30**. Stepping up or down the chain (e.g. for a
penalty or a deed die improvement) means substituting the next die in this sequence.

### Funnel Characters (Level 0)
Campaigns traditionally begin with a "funnel": each player runs 2-4 randomly
generated 0-level characters (peasants, not heroes) through a lethal starter
adventure. Survivors become 1st-level characters in the class of the player's
choice. 0-level characters have minimal stats, a randomly rolled occupation
(chicken butcher, mushroom farmer, gong farmer, etc.) that grants a trained
weapon and starting gear, and are expected to die in large numbers.

### Luck
Luck is both an ability score and a spendable resource. Some classes (notably
Halflings, Thieves) can spend Luck temporarily for bonuses; other classes
(Warriors) permanently burn Luck for one-time bonuses to attack, damage, or
saves. Each character's birth augur ("lucky sign") determines what Luck modifies
for them.

### Mighty Deeds of Arms (Warriors, Dwarves)
Warriors and Dwarves roll a Deed Die (starting at d3, improving with level)
alongside their attack roll. On a result of 3+ on the Deed Die, the player may
declare a "Mighty Deed" — a creative combat maneuver (disarm, trip, blind,
sunder) narrated on the fly, with the Deed Die result also adding to damage.

### Spellcasting, Patron Bond, and Corruption (Wizards, Elves, Clerics)
Wizard and Elf spellcasting uses a "spellcheck" roll (d20 + level + Intelligence
modifier) against a target DC; failure can cause corruption (physical mutation)
or worse. Each spell known has a unique "mercurial magic" effect rolled at
character creation, making the same spell behave differently between casters.
Wizards may also form a patron bond with a supernatural entity for additional
power at a cost. Clerics instead track "disapproval" — accumulated displeasure
from their deity — checked via a spellcheck-like roll; high disapproval risks
losing spellcasting or divine favor entirely until atoned for.

### Alignment
DCC uses a three-point alignment axis: Lawful, Neutral, Chaotic (no
good/evil axis).
