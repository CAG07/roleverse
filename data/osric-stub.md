# OSRIC / Advanced Dungeons & Dragons 1st & 2nd Edition Reference

**Status:** Baseline reference content — core mechanics summary, not a full
rulebook transcription.

OSRIC (Old School Reference and Index Compilation) is a retro-clone of the
Advanced Dungeons & Dragons 1st and 2nd Edition rule systems, released under
the Open Game License. This document is an original, independently written
summary of the core mechanics those two editions share, plus the handful of
places where they diverge — it does not reproduce table text, attack matrices,
spell lists, or other TSR/WotC product identity verbatim. It is meant as Rules
Arbiter grounding, not a replacement for the published rulebooks.

## Why this document exists

1. Both `game_system = 'ADD1E'` and `game_system = 'ADD2E'` need populated
   `campaign_embeddings` vector index entries so the Rules Arbiter can ground
   answers in indexed content rather than training knowledge alone.
2. No clean machine-readable API or dataset exists for either edition or for
   OSRIC itself (unlike 5E/PF2E, which pull from live open sources), so both
   systems use this one hand-authored markdown baseline instead.
3. Because OSRIC is explicitly a retro-clone of *both* editions, this single
   file is ingested twice — once tagged `ADD1E`, once tagged `ADD2E` (see
   `lib/rag/fetchers/osric.ts`) — rather than maintaining two nearly-identical
   documents. The "Where 1E and 2E Diverge" section near the end exists
   precisely so a Rules Arbiter reading this shared content for either edition
   knows which mechanics belong only to the other one.

## What the Rules Arbiter should do

- Ground answers in the indexed sections below whenever the question matches
  one of these topics: ability scores, class and race restrictions, THAC0 and
  combat resolution, initiative, saving throws, spellcasting, turning undead,
  experience and leveling, or encumbrance.
- Before applying any mechanic described here, check whether the "Where 1E and
  2E Diverge" section marks it as edition-specific. If it does, apply only the
  variant matching the current session's edition and say so plainly if asked.
- For anything not covered here — exact attack matrices, specific monster stat
  blocks, named magic items, published module content — fall back to training
  knowledge and clarify that the answer isn't from an indexed source.
- Advise players that this is a mechanics summary, not the full rulebook, when
  a question needs exact page-reference or table precision.

---

## Ability Scores & Character Creation

### The Six Ability Scores

Both editions use the same six abilities: Strength, Dexterity, Constitution,
Intelligence, Wisdom, and Charisma. Strength governs melee attack and damage
bonuses, carrying capacity, and the chance to force open doors or bend bars.
Dexterity governs missile attack bonuses, Armor Class bonus from quickness,
and (in most tables) reaction/initiative adjustments. Constitution governs hit
point bonuses per Hit Die and system shock/resurrection survival odds.
Intelligence governs the number of languages known and, for Magic-Users, the
maximum spell level that can be learned and the number of spells that can be
recorded per level. Wisdom governs bonus spells for Clerics and resistance to
magical charm and fear effects. Charisma governs the number and loyalty of
henchmen and NPC reaction adjustments.

### Rolling Scores

The traditional method is 3d6 in order down the line for each of the six
abilities, with no rearranging — a legacy of the earliest editions, still
supported as an option in both 1E and 2E. Most tables in practice use a more
generous method: 4d6 dropped lowest, six times, then arranged to taste, or one
of several alternate methods presented in the Dungeon Master's Guide (rolling
multiple full sets and choosing the best, or assigning a pool of points).
Exceptional Strength (a percentile roll of 01-100 appended to an 18 Strength)
applies only to Fighters, Paladins, and Rangers who roll an 18.

### Prime Requisites and Experience Adjustment

Each class has one or more "prime requisite" abilities. A character whose
prime requisite score is high enough (traditionally 16+) earns a bonus to
experience point awards; a low prime requisite score (traditionally below 9)
imposes a penalty. This ties directly into ability score generation, since a
strong prime requisite roll meaningfully accelerates advancement for that
class.

### Race and Class Availability

Character race is chosen alongside class, and race restricts which classes
are available and imposes level limits on some class/race combinations (see
the next section). Humans have no level limits in any class. Demi-human races
— Dwarves, Elves, Gnomes, Half-Elves, and Halflings — trade unlimited
advancement for racial abilities (infravision, resistance to certain magic,
stealth, or similar) and the ability to multi-class, something Humans cannot
do in either edition (Humans may instead "dual-class," abandoning one class to
take up a second, single-classed at a time).

---

## Classes & Race Restrictions

### The Four Core Classes

Fighter, Cleric, Magic-User, and Thief form the core class list present in
both editions, each with its own Hit Die, THAC0 progression, saving throw
table, and prime requisite. Fighters have the best Hit Die and THAC0
progression and no spellcasting. Clerics cast divine spells drawn from a
shared list (chosen at the time of casting rather than fixed at rest, in most
readings of the rules) and turn undead. Magic-Users cast arcane spells that
must be selected in advance and recorded in a spellbook, with a strictly
limited number of spells known and prepared per level, and are the weakest
class in melee. Thieves have unique percentile-based skills — pick pockets,
open locks, find/remove traps, move silently, hide in shadows, hear noise,
climb walls, and read languages — that improve with level, plus backstab (a
significant, edition-varying damage multiplier when attacking a surprised or
unaware target).

### Subclasses

Both editions support subclasses layered on the core four, though the exact
roster and restrictions vary by edition (see "Where 1E and 2E Diverge"). The
Paladin is a Fighter subclass with a strict code of conduct, limited access to
minor divine abilities, and a warhorse companion at higher levels. The Ranger
is a Fighter subclass with tracking ability, bonus damage against certain
creature types, and eventual limited spellcasting. The Druid is a Cleric
subclass focused on nature, with its own spell list and a hierarchical
advancement structure limited in number of practitioners at the highest
levels. The Illusionist is a Magic-User subclass with its own, narrower spell
list centered on illusion and phantasm effects. The Assassin is a Thief
subclass with a death-attack ability and access to poison, generally requiring
an evil alignment.

### Racial Level Limits

Demi-human races face level caps in most or all classes, a defining feature of
both editions' class/race interaction. A Dwarf Fighter, for instance,
typically caps out at a mid-single-digit level regardless of experience
earned beyond that point, while a Human Fighter has no such ceiling. High
prime requisite scores can raise a race's cap for a given class somewhat, but
rarely remove it entirely. Elves, uniquely, can multi-class as Fighter/
Magic-User (and sometimes Fighter/Magic-User/Thief) with level limits applied
per class in the combination. These caps are a deliberate balancing mechanism
against demi-humans' racial abilities and their capacity to multi-class at
all — a trade Humans don't have to make, in exchange for having no ceiling.

### Alignment

Both editions use a nine-point alignment grid (Lawful/Neutral/Chaotic crossed
with Good/Neutral/Evil), and some classes carry alignment restrictions —
Paladins must be Lawful Good, Druids are restricted to variants of Neutral,
Assassins are restricted to evil alignments. Alignment functions as a
roleplaying guideline and a mechanical gate on class choice and certain
magic items or spell effects, rather than a rigidly enforced behavioral
tracker.

---

## THAC0 & Combat Resolution

### What THAC0 Means

THAC0 stands for "To Hit Armor Class 0" — the attack roll (1d20) a character
needs to hit a target with Armor Class 0. To resolve an attack against a
target with a different Armor Class, subtract the target's Armor Class from
the attacker's THAC0 to find the die roll needed to hit (THAC0 minus target AC
equals the number needed on the d20, adjusted further by the attacker's
Strength or Dexterity bonus, magic weapon bonuses, and any other applicable
modifiers). THAC0 improves (gets numerically lower) as a character gains
levels, at a rate that depends on class — Fighters improve fastest, Magic-
Users slowest.

### Descending Armor Class

Both editions use a descending Armor Class scale: unarmored is AC 10, and each
point of armor or Dexterity bonus lowers the number, with very well-protected
characters reaching AC 0 or into negative numbers. This is the inverse of
later editions' ascending AC and is the single most disorienting thing for a
player coming from a game that uses ascending AC — lower is always better
here, both for the defender's AC and (informally) for how good an attack
roll's target number is once THAC0 math is applied.

### Attack Rolls and Damage

An attack roll is a d20 plus applicable bonuses (Strength for melee, Dexterity
for missile attacks, magic weapon bonuses, and any situational modifiers such
as attacking a flanked or rear-facing target) compared against the number
derived from THAC0 and target AC as described above. A natural 20 always hits
regardless of the math (house rules vary on whether it's also an automatic
critical, since neither edition has a universal critical hit system built in
the way later editions do); a natural 1 always misses. Damage is rolled per
the weapon's die (or dice, for versatile weapons used two-handed) plus
Strength bonus for melee weapons, then applied directly against the target's
hit points.

### Multiple Attacks at Higher Levels

Fighters (and Fighter subclasses) gain additional attacks per round as they
advance — commonly expressed as a progression such as one attack per round at
low levels, three attacks per two rounds at a mid tier, and two full attacks
per round at high levels. This progression is one of the more edition-
sensitive numbers in the ruleset and the exact levels at which it steps up
should be treated as something to confirm against the specific rulebook in
use rather than assumed identical across tables.

---

## Initiative & Weapon Speed Factors

### 1st Edition: Individual Initiative and Segments

1st Edition divides each ten-second combat round into ten one-second
segments. Individual initiative is typically rolled as a d6 per side (or, in a
more granular reading, per individual), and a weapon's Speed Factor — a
number representing how quick or cumbersome it is to bring to bear — is added
to that roll to determine which segment an attack actually lands in relative
to the opponent's. A dagger's low Speed Factor lets its wielder strike well
before a two-handed sword's high Speed Factor allows its wielder to connect,
even if both rolled the same initiative segment. Spellcasting in 1E is
similarly segment-based: a spell's casting time in segments determines how
far into the round the effect resolves, and a caster who is struck before
their casting time elapses has the spell disrupted.

### 2nd Edition: Group Initiative

2nd Edition simplifies this considerably by defaulting to group initiative: 
one d10 (or d6, depending on the specific optional rule set in use) rolled
per side each round, with the lower roll acting first for that entire round.
Weapon Speed Factor and individual segment tracking become optional/rarely
used detail rules in 2E rather than the assumed baseline, and spellcasting
resolves relative to the group's initiative roll rather than a fixed segment
count. This is one of the clearest mechanical differences between the two
editions in actual play — see "Where 1E and 2E Diverge" below.

### Surprise

Both editions check for surprise separately from normal initiative, typically
a d6 roll where a low result (commonly 1-2) indicates one or both sides are
caught unaware, losing some or all of their actions for the first segment or
round. A surprised target is also typically vulnerable to bonus effects from
certain classes (a Thief's backstab, for instance, keys directly off an
unaware or surprised target in both editions, though the exact damage
multiplier and level-scaling differ by edition).

---

## Saving Throws

### The Five Categories

Both editions organize saving throws into five categories, though the exact
labels vary slightly by edition (see "Where 1E and 2E Diverge"): Paralyzation/
Poison/Death Magic, Rod/Staff/Wand, Petrification/Polymorph, Breath Weapon,
and Spell. Each class has its own saving throw table showing the target
number needed on a d20 for each category at a given level, with the target
number improving (getting lower, i.e. easier to make) as the character
advances. Ability scores, magic items, and class features can grant further
bonuses to specific categories.

### How a Save Is Resolved

When a character is subject to an effect that allows a saving throw, roll
1d20 and compare it against the character's saving throw target number for
the applicable category at their current level and class, applying any
bonuses. Meeting or exceeding the target number is a success; effects that
allow "save for half damage" or similar partial mitigation reduce but don't
eliminate the effect on a successful save, while most other saves are binary
pass/fail. Fighters generally have the best saves across the board at a given
level; Magic-Users generally have the worst saves against physical categories
but strong saves against Spell.

---

## Spellcasting

### Vancian Memorization

Both editions use "Vancian" (named for author Jack Vance's Dying Earth
stories) spell preparation: an arcane or divine caster selects and prepares a
fixed number of specific spells from their available list during a rest
period, and each prepared spell is expended and forgotten the instant it's
cast. A Magic-User must have the spell recorded in their spellbook to prepare
it (and can only add new spells to that spellbook through study, scroll
transcription, or research); a Cleric draws on the full class spell list
available at their level without needing a physical spellbook, but is
otherwise bound by the same "select in advance, forget on cast" structure.

### Spell Levels and Slots Per Character Level

Spells are organized into levels (1st through 9th for Magic-Users, 1st
through 7th for Clerics in most printings), and a character's class and
level determine how many spell slots of each spell level they have available
per day, following a class-specific progression table. A low-level caster may
have access only to first-level spells and only one or two slots; a
high-level caster gains access to progressively higher spell levels and more
slots at each level as they advance.

### Material Components and Casting Time

Most spells require a material component, a specific physical item consumed
or gestured with during casting (a pinch of guano and sulfur for Fireball is
the classic example) — a caster without the required component generally
cannot cast that spell. Spells also have a casting time (expressed in
segments or rounds, tying back into the initiative rules above), and a caster
who takes damage or is otherwise disrupted before that casting time elapses
loses the spell without effect.

### Spell Research and Scroll Use

Both editions support Magic-User spell research (inventing new spells not on
the standard list, at significant time and gold cost, subject to DM
adjudication) and scroll use (a Magic-User can attempt to cast from a scroll
even for a spell not in their own spellbook, at some risk of the writing
being illegible to them or, in some editions, a mishap on failure). Clerics
generally do not research spells the same way, since their spell access is
tied to their deity/faith rather than personal study.

---

## Turning Undead

Clerics (and, at reduced effectiveness or via a modified table, Paladins in
some editions) can attempt to turn undead: presenting a holy symbol and
invoking their faith to drive off, and at higher relative levels destroy
outright, undead creatures. Resolution is a roll (traditionally d20) against a
turning undead matrix cross-referencing the Cleric's level against the
undead's type/Hit Dice, yielding either a failure, a "turn" result (the
undead must flee and cannot approach the Cleric for a set duration), or a
"destroy" result for sufficiently weak undead against a sufficiently high-
level Cleric. Evil clerics in some campaigns instead command undead rather
than turning them, using the same underlying matrix inverted.

---

## Experience & Leveling

### XP for Treasure, Not Just Combat

A defining feature of both editions is that experience points come
substantially from recovered treasure (gold piece value converted roughly
1:1 to XP in the traditional reading) as well as from defeating monsters
(XP awarded per monster based on its type and any special abilities it has,
not simply its Hit Dice). This deliberately rewards clever, treasure-focused
dungeon delving and non-combat problem solving alongside or instead of
straightforward combat, and is a meaningfully different incentive structure
than XP-for-combat-only systems.

### Training Time and Cost

Advancing to a new level in most printings of both editions is not automatic
the instant enough XP is banked — a character must spend downtime and gold
training under an instructor of appropriate level (Fighters may train under a
weapons master, Magic-Users under a senior spellcaster, and so on) before the
new level's benefits, especially new spell slots or class features, are
actually available. This training requirement is one of the rules most
commonly dropped or abbreviated at actual tables, since it can introduce
significant downtime friction, but it is present in the core rules of both
editions and worth surfacing if a player or GM asks about "instant" leveling.

### Level Titles

Both editions traditionally give each class a distinct title at each
experience level (a 1st-level Fighter might be a "Veteran," a 9th-level
Fighter a "Lord," and so on), tied historically to the game's wargaming
roots and to the idea that a high-level character earns a stronghold,
followers, and a title appropriate to their station. This flavor detail
still shows up in play at tables that lean into the classic feel, though it
has no independent mechanical weight beyond what a stronghold/followers milestone
already grants.

---

## Encumbrance & Movement

Both editions track encumbrance by total weight carried, measured in coins
or pounds depending on the specific table used, with heavier loads reducing a
character's movement rate in stages rather than as a single hard cutoff.
Armor itself imposes its own movement rate cap independent of carried
treasure and gear — plate armor slows a character down even if they're
otherwise carrying very little. Movement rate in turn affects how far a
character can move in an exploration turn versus a combat round, and factors
into surprise distance and the chance to avoid or force an encounter.
Most tables track encumbrance loosely rather than itemizing every coin's
weight, but the underlying mechanical relationship between load, armor, and
movement rate is present in both rule sets.

---

## Multi-Classing and Dual-Classing

### Demi-Human Multi-Classing

Demi-human characters (never Humans) may multi-class: splitting experience
points evenly between two or three classes simultaneously and advancing in
all of them at once, subject to each class's own racial level limit. A
multi-classed character uses the best applicable feature from each class each
round (the higher of the two classes' THAC0s, for instance) but does not
simply add the classes' benefits together — armor and encumbrance
restrictions from a spellcasting class typically still apply, which is the
usual trade-off for a Fighter/Magic-User's flexibility. Race determines which
multi-class combinations are available; not every race/class pairing is
permitted.

### Human Dual-Classing

Humans cannot multi-class, but may dual-class: a Human character who meets a
high ability score threshold in their original class's prime requisite may
abandon that class and begin advancing in a new one from 1st level, keeping
the old class's hit points and saving throws but gaining none of the old
class's abilities (spellcasting, thieving skills, turning undead, and so on)
until the new class's level surpasses the old one. This is a rarer, higher-
commitment option than demi-human multi-classing, and reflects Humans'
narrative role as the versatile, unrestricted race that trades a hard level
cap for a slower, more deliberate path to similar flexibility.

---

## Death, Dying, and Resurrection

### Reaching Zero or Negative Hit Points

A character reduced to 0 hit points is typically dead outright in the
strictest traditional reading, though many tables (and some later printings)
soften this with a negative hit point buffer before death is final, alongside
rules for bleeding out or stabilizing. Because the baseline rule is
unforgiving compared to later editions, confirm which variant a given table
is using rather than assuming a buffer exists by default.

### System Shock and Resurrection Survival

Constitution governs two separate percentile checks tied to survival: a
system shock check made when a character is subjected to a violent
magical transformation or a near-death event (certain spells and effects
require passing this check to avoid instant death), and a resurrection
survival check made after being restored to life via clerical magic,
representing the toll repeated deaths take on a character's body. A character
with a poor Constitution score risks failing to come back at all even when a
willing Cleric has the spell and the material component in hand.

---

## Magic Items

### Identification

An unidentified magic item's exact properties are not automatically known to
the party that finds it. Both editions support several routes to
identification: a Magic-User's identify spell (with an inherent risk and a
material component cost), a Cleric's commune or similar divination magic,
trial and error in play, or a sage/specialist NPC consulted for a fee. Cursed
items are a deliberate design feature — an item that appears beneficial but
carries a hidden drawback, sometimes binding to the user the moment it's
worn or wielded and resisting ordinary removal.

### Class Restrictions on Item Use

Certain categories of magic item are restricted by class: only Clerics can
use many divine-aligned magic items without penalty, only Magic-Users (and
Illusionists, for their own narrower list) can safely use wands and most
arcane scrolls, and armor/shield restrictions that apply to a class's mundane
equipment (Magic-Users generally cannot wear armor at all without penalty,
for instance) typically extend to magical versions of that equipment too.

---

## Retainers, Henchmen, and Strongholds

High Charisma governs both the number of henchmen (semi-permanent NPC
followers with their own class levels and loyalty) a character can
realistically retain and their base loyalty toward the character. At higher
levels — traditionally around 9th, tied to the level titles mentioned above —
characters of the core classes become eligible to construct a stronghold
(a castle, tower, guild hall, or similar seat appropriate to their class) and
begin attracting followers of their own class drawn to serve them, a
milestone that shifts play toward domain management alongside dungeon
delving for campaigns that choose to lean into it.

---

## Where 1E and 2E Diverge

This section exists specifically because the same document above is indexed
for both `ADD1E` and `ADD2E` — treat everything below as the authoritative
list of what NOT to carry over from one edition's Rules Arbiter answers into
the other's.

### Initiative Granularity (1E-only)

1st Edition's segment-based individual initiative and weapon Speed Factor
system, described above, is the single biggest procedural difference. 2nd
Edition defaults to simple group initiative and treats segment-level
resolution as an optional variant, not the assumed baseline. A 2E Rules
Arbiter should not describe weapon Speed Factor as a routine part of every
combat round; a 1E Rules Arbiter should not describe initiative as "roll once
for the whole party" without noting that's the simplified variant, not the
1E default.

### Nonweapon Proficiencies (2E-only)

2nd Edition introduces nonweapon proficiencies — a formal skill system letting
characters spend proficiency slots on abilities like Swimming, Herbalism, or
Etiquette, each resolved with an ability-score-based check. 1st Edition has no
equivalent core system (some late 1E supplements introduced an early,
optional version, but it is not part of the 1E core rules this document
grounds). A 1E Rules Arbiter should not tell a player they have proficiency
slots to spend; that's a 2E-only character sheet field.

### Kits (2E-only)

2nd Edition's kit system lets a player customize a class with a themed
package of bonuses, restrictions, and roleplaying hooks (a Fighter might take
the Weapon Master kit, a Thief the Swashbuckler kit). 1st Edition has no kit
equivalent. A 1E Rules Arbiter should never reference a kit; a 2E Rules
Arbiter should note that kits are an optional customization layer on top of
the base class, not a requirement.

### Saving Throw Category Naming

Both editions use the same five-category structure described above, but 2nd
Edition's Player's Handbook presents the categories with slightly revised
names and reorganizes some effects between categories compared to 1st
Edition's Dungeon Masters Guide tables. The underlying five-category shape is
shared and safe to describe generically; the precise effect-to-category
mapping for an edge-case effect should be treated as edition-specific if a
player asks for exact placement.

### Subclass Availability

The Ranger, Paladin, Druid, Illusionist, and Assassin subclasses described
above are present in some form in both editions, but exact prerequisites,
level limits, and (for the Assassin especially) the degree to which the
subclass is treated as a fully supported option versus a niche/optional one
vary by edition and by specific printing. Treat exact subclass prerequisites
as something to confirm against the edition in use rather than assumed
identical.

### Weapon vs. Armor Type Adjustments (1E-only)

1st Edition includes an optional (but commonly used) table of attack roll
adjustments based on matching specific weapon types against specific armor
types (a piercing weapon like a dagger performing differently against banded
mail than a slashing weapon would, for instance). 2nd Edition drops this
table from its core rules. A 2E Rules Arbiter should not apply weapon-vs-armor
adjustments unless a player has explicitly said their table uses that 1E
option as a house rule.

---

## Using This Document

This is a mechanics summary written to ground Rules Arbiter answers about the
concepts above, not a substitute for the actual Player's Handbook, Dungeon
Master's Guide, or OSRIC rulebook. When a question needs an exact table value,
a specific spell's full text, a specific monster's stat block, or a precise
page reference, say so plainly and offer the best training-knowledge answer
available rather than presenting an invented specific number as if it came
from this indexed reference.
