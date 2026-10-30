# Dungeon Crawl Classics (DCC RPG) Reference

**Status:** Baseline reference content — core mechanics summary, not a full
rulebook transcription.

Dungeon Crawl Classics (DCC RPG) is a retro-inspired sword & sorcery RPG published
by Goodman Games, drawing on Appendix N pulp fantasy inspirations. Core mechanics
are released under the Open Game License. This document is an original,
independently written summary of those core mechanics for use as Rules Arbiter
context — it does not reproduce table flavor text, patron names, or other
Goodman Games product identity verbatim.

## Why this document exists

1. The `game_system = 'DCC'` entry needs a populated `campaign_embeddings` vector
   index so the Rules Arbiter can ground answers in indexed content rather than
   training knowledge alone.
2. DCC has no clean machine-readable rules API (unlike 5E/PF2E, which pull from
   live open APIs), so this system uses a hand-authored markdown baseline instead.

## What the Rules Arbiter should do for DCC queries

- Ground answers in the indexed sections below whenever the question matches one
  of these topics: the dice chain, the funnel, Luck, Mighty Deeds, spellcasting
  mechanics, mercurial magic, corruption, patron bonds, turn unholy, disapproval,
  or class basics.
- For anything not covered here — specific monster stat blocks, named patrons,
  named magic items, published adventures — fall back to training knowledge and
  clarify that the answer isn't from an indexed source.
- Advise players that this is a mechanics summary, not the full rulebook, when a
  question needs exact page-reference precision.

---

## Character Creation & Ability Scores

### Generating Ability Scores

DCC characters roll six ability scores — Strength, Agility, Stamina, Personality,
Intelligence, and Luck — typically 3d6 in order for 0-level funnel characters, or
4d6-drop-lowest for direct 1st-level character creation in campaigns that skip the
funnel. Scores are not usually rearranged after rolling; the character is built
around what was rolled, which is part of the game's pulp, high-mortality feel.

### The Six Abilities and What They Govern

Strength governs melee attack and damage rolls and carrying capacity. Agility
governs ranged attacks, Armor Class, Reflex saves, and initiative. Stamina governs
hit points and Fortitude saves. Personality governs turning checks, Cleric spell
checks, and social interaction rolls. Intelligence governs Wizard spell checks,
number of languages known, and Will saves alongside Personality. Luck is both an
ability score and a spendable resource — see the Luck section below.

### Ability Modifiers

Ability scores map to modifiers on a curve steeper than many d20 games: a score of
3 gives roughly -3, 8-9 gives -1, 10-11 gives +0, 12-13 gives +1, and an 18 gives
roughly +3, with rarer exceptional scores granting larger swings. Because 0-level
characters are rolled straight with no point-buy safety net, wildly weak or
strong scores are common and expected.

---

## The Dice Chain

### The Dice Chain Sequence

DCC uses a "dice chain" beyond the standard polyhedral set to represent degrees of
success/failure and scaling bonuses/penalties: **d3, d4, d5, d6, d7, d8, d10, d12,
d14, d16, d20, d24, d30**. A d5 is a d10 read as half value rounded up; a d7 is a
d8 rerolled on an 8; a d14 is 2d7; a d16 is 2d8; a d24 is a d12 doubled or 2d12
read specially; a d30 is a dedicated die or 2d20 with a conversion table. The
important part for an agent is the *ordering*, not the exact substitution method.

### Stepping Up and Stepping Down

Many effects "step" a die along the chain rather than granting a flat numeric
bonus or penalty: a Deed Die that improves with level, a weapon damage die
worsened by a curse, a fumble die that gets better as armor gets heavier. "Step up
one" means substitute the next-larger die in the sequence; "step down one" means
substitute the next-smaller die. Stepping below d3 or above d30 is not normally
possible — effects cap at the ends of the chain.

### Critical Hit and Fumble Dice Vary by Class and Level

Unlike a flat "natural 20 = crit" rule, DCC ties critical hit severity to a
Crit Die and Crit Table that improve with class and level (Warriors crit hardest
and earliest), and fumble severity to a Fumble Die keyed to armor worn (heavier
armor makes fumbles nastier). Both dice sit on the dice chain described above.

---

## The Funnel — Zero-Level Play

### What the Funnel Is

Campaigns traditionally begin with a "funnel": each player runs 2-4 randomly
generated 0-level characters — peasants, not heroes — through a lethal starter
adventure. Survivors become 1st-level characters in the class of the player's
choice; casualties are expected and often played for dark comedy rather than
tragedy. The funnel is DCC's signature onboarding ritual and a large part of its
identity as a game about desperate, expendable nobodies becoming legends.

### Generating a 0-Level Character

A 0-level character has the same six rolled ability scores as any character, plus
a randomly determined occupation (see the Occupations table below), 1d4 hit
points, starting equipment from their occupation, and a randomly rolled Luck-based
birth augur. They have no class features, no spells, and minimal combat
competence — a 0-level character fighting a giant rat is a real gamble.

### Occupations and Starting Gear

Occupation determines a trained weapon (the only weapon the character isn't
penalized to use effectively) and a piece of starting gear or trade good tied to
their trade. A gong farmer might start with a shovel and a sack of dubious
fertilizer; a village idiot might start with a stick and nothing but bad luck.
Occupation is flavor-forward but mechanically meaningful for the funnel's opening
scramble.

### Funnel Attrition and Promotion to 1st Level

It's normal for a funnel to kill well over half the characters at the table. When
a 0-level character dies, the player continues playing their remaining
characters; if all of a player's characters die, they typically sit out until the
next character-generation opportunity or take over an NPC. Any 0-level character
who survives to the funnel's end and accumulates enough experience is promoted to
1st level in a class of the player's choosing, informed by what fits the survivor
best.

---

## Occupation Table (0-Level Characters)

### Occupations 1-10

1. Alchemist's Assistant — trained weapon: dagger; gear: vial of caustic powder.
2. Apple Picker — trained weapon: sickle; gear: bag of bruised apples.
3. Barrel Cooper — trained weapon: hand axe; gear: spare barrel hoops.
4. Beekeeper — trained weapon: club; gear: smoking pot and a jar of honey.
5. Bell Ringer — trained weapon: sling; gear: coil of rope.
6. Blacksmith's Apprentice — trained weapon: hammer; gear: iron tongs.
7. Bone Setter — trained weapon: dagger; gear: roll of splinting cloth.
8. Candle Maker — trained weapon: club; gear: sack of tallow.
9. Cart Driver — trained weapon: whip; gear: cart wheel spoke.
10. Cheese Monger — trained weapon: cheese knife (as dagger); gear: wheel of hard
    cheese.

### Occupations 11-20

11. Chicken Butcher — trained weapon: cleaver (as hand axe); gear: burlap sack of
    feathers.
12. Coal Hauler — trained weapon: shovel; gear: sack of coal.
13. Cooper's Boy — trained weapon: mallet; gear: iron nails.
14. Dung Collector — trained weapon: pitchfork; gear: cart of manure.
15. Ferryman — trained weapon: pole (as spear); gear: coil of rope.
16. Fisherman — trained weapon: net (entangles as improvised weapon); gear:
    fishing hooks.
17. Fletcher's Apprentice — trained weapon: shortbow; gear: bundle of arrow
    shafts.
18. Gong Farmer — trained weapon: shovel; gear: sack of fertilizer.
19. Goose Girl/Boy — trained weapon: switch (as club); gear: goose-down pillow.
20. Grave Digger — trained weapon: shovel; gear: rope and grappling hook.

### Occupations 21-30

21. Grocer — trained weapon: dagger; gear: sack of dried beans.
22. Hedge Trimmer — trained weapon: shears (as sickle); gear: twine.
23. Herbalist — trained weapon: dagger; gear: pouch of dried herbs.
24. Hog Farmer — trained weapon: club; gear: bucket of slop.
25. Horse Groom — trained weapon: riding crop (as club); gear: horse brush.
26. Innkeeper — trained weapon: club; gear: wineskin.
27. Kennel Master — trained weapon: whip; gear: leather leash.
28. Knife Sharpener — trained weapon: dagger; gear: whetstone.
29. Lamp Lighter — trained weapon: torch (as club); gear: flask of lamp oil.
30. Laundress/Laundryman — trained weapon: washboard (as club); gear: bar of lye
    soap.

### Occupations 31-40

31. Leatherworker — trained weapon: awl (as dagger); gear: scrap of tanned hide.
32. Locksmith — trained weapon: dagger; gear: set of crude lockpicks.
33. Mason's Apprentice — trained weapon: mallet; gear: chisel.
34. Midwife — trained weapon: dagger; gear: roll of clean linen.
35. Miller — trained weapon: club; gear: sack of flour.
36. Miner — trained weapon: pick (as hand axe); gear: miner's lamp.
37. Mushroom Farmer — trained weapon: hand axe; gear: basket of mushrooms.
38. Night Soil Man — trained weapon: shovel; gear: sack of ash.
39. Nut Gatherer — trained weapon: sling; gear: sack of nuts.
40. Ostler — trained weapon: pitchfork; gear: horseshoe.

### Occupations 41-50

41. Peat Cutter — trained weapon: spade (as shovel); gear: block of peat.
42. Plowman/Plowwoman — trained weapon: goad (as club); gear: length of plow
    chain.
43. Poacher — trained weapon: shortbow; gear: snare wire.
44. Potter — trained weapon: dagger; gear: clay pot.
45. Rat Catcher — trained weapon: club; gear: wire cage.
46. Roofer — trained weapon: hammer; gear: bundle of thatch.
47. Sailor — trained weapon: belaying pin (as club); gear: coil of rope.
48. Scribe's Assistant — trained weapon: dagger; gear: quill and ink pot.
49. Shepherd — trained weapon: sling; gear: shepherd's crook.
50. Stable Hand — trained weapon: pitchfork; gear: bucket of oats.

### Occupations 51-60

51. Stonemason — trained weapon: hammer; gear: masonry chisel.
52. Tailor — trained weapon: shears (as dagger); gear: spool of thread.
53. Tanner — trained weapon: knife (as dagger); gear: hide scraper.
54. Tavern Wench/Server — trained weapon: club; gear: serving tray.
55. Tax Collector's Clerk — trained weapon: dagger; gear: ledger book.
56. Thatcher — trained weapon: hand axe; gear: bundle of reeds.
57. Tinker — trained weapon: hammer; gear: bag of scrap metal.
58. Trapper — trained weapon: hand axe; gear: iron trap.
59. Village Idiot — trained weapon: stick (as club); gear: nothing of value.
60. Wagoner — trained weapon: whip; gear: spare cart axle.

### Occupations 61-70

61. Watchman — trained weapon: spear; gear: rusty horn.
62. Weaver — trained weapon: shuttle (as dagger); gear: bolt of rough cloth.
63. Well Digger — trained weapon: pick (as hand axe); gear: coil of rope.
64. Wheelwright — trained weapon: mallet; gear: spare wheel spoke.
65. Wine Presser — trained weapon: club; gear: skin of cheap wine.
66. Woodcutter — trained weapon: hand axe; gear: bundle of firewood.
67. Wool Carder — trained weapon: carding comb (as dagger); gear: bag of raw
    wool.
68. Yeoman Farmer — trained weapon: pitchfork; gear: sack of seed grain.
69. Bounty Hunter's Runner — trained weapon: sling; gear: wanted poster.
70. Bridge Toll Collector — trained weapon: club; gear: coin pouch (empty).

### Occupations 71-80

71. Chimney Sweep — trained weapon: brush pole (as spear); gear: soot-blackened
    rags.
72. Circus Roustabout — trained weapon: club; gear: tent stake.
73. Cobbler — trained weapon: awl (as dagger); gear: leather boot last.
74. Cooper — trained weapon: hand axe; gear: barrel stave.
75. Dock Worker — trained weapon: hook (as dagger); gear: coil of rope.
76. Ditch Digger — trained weapon: shovel; gear: waterskin.
77. Falconer's Boy — trained weapon: sling; gear: leather glove.
78. Gravel Raker — trained weapon: rake (as club); gear: sack of gravel.
79. Hunter's Apprentice — trained weapon: shortbow; gear: skinning knife.
80. Juggler — trained weapon: throwing knives (as dagger); gear: three
    juggling balls.

### Occupations 81-90

81. Knacker — trained weapon: cleaver (as hand axe); gear: bone saw.
82. Millwright — trained weapon: hammer; gear: gear cog.
83. Orphanage Attendant — trained weapon: club; gear: wooden toy.
84. Pig Drover — trained weapon: switch (as club); gear: length of rope.
85. Quarry Worker — trained weapon: pick (as hand axe); gear: chunk of rough
    stone.
86. Ratcatcher's Apprentice — trained weapon: club; gear: caged ferret.
87. Riverboat Poler — trained weapon: pole (as spear); gear: waterproof oilcloth.
88. Saddler — trained weapon: awl (as dagger); gear: length of leather strap.
89. Salt Panner — trained weapon: shovel; gear: sack of coarse salt.
90. Sausage Maker — trained weapon: cleaver (as hand axe); gear: coil of
    sausage links.

### Occupations 91-100

91. Sexton — trained weapon: shovel; gear: iron key ring.
92. Sheep Shearer — trained weapon: shears (as sickle); gear: bag of raw
    fleece.
93. Signal Fire Keeper — trained weapon: torch (as club); gear: flint and steel.
94. Spice Trader's Porter — trained weapon: dagger; gear: pouch of common
    spice.
95. Stable Muck Boy/Girl — trained weapon: pitchfork; gear: rusty horseshoe.
96. Street Sweeper — trained weapon: broom (as club); gear: dustpan.
97. Tollbooth Guard — trained weapon: spear; gear: dented lantern.
98. Wagon Wheel Greaser — trained weapon: mallet; gear: pot of axle grease.
99. Well-Rope Braider — trained weapon: club; gear: coil of hemp rope.
100. Whittler — trained weapon: knife (as dagger); gear: half-carved wooden
     figure.

---

## Alignment

### The Three-Point Alignment Axis

DCC uses a three-point alignment axis — Lawful, Neutral, Chaotic — with no
separate good/evil axis. Lawful characters value order, honesty, and the rule of
established authority. Chaotic characters value personal freedom, upheaval, and
the primacy of the individual will, and are not automatically villainous. Neutral
characters value balance or simply lack strong conviction either way. Alignment
matters mechanically for certain spells, certain magic items, and Cleric
relationships with their deity.

---

## Luck

### Luck as Ability Score and Resource

Luck is unusual among the six abilities: it's both a fixed score with a modifier
like any other ability, and a spendable pool that can be temporarily or
permanently reduced for in-the-moment benefits. How a character's Luck modifier
applies — and what it applies to — is shaped by their birth augur, rolled at
character creation.

### Burning Luck

Some classes, notably Warriors, "burn" Luck permanently: spending points of
current Luck one-for-one for a bonus to a single attack roll, damage roll, or
saving throw, applied after seeing the need but before the roll (or sometimes
after, depending on table ruling). Burned Luck does not recover on its own and
permanently lowers the character's Luck score and modifier until restored by rare
in-game means.

### Spending Luck Temporarily (Halflings, Thieves)

Halflings and Thieves instead spend Luck temporarily: points spent this way come
back at the normal daily recovery rate (see below) rather than being gone for
good. This lets these classes use Luck far more liberally than a Warrior burning
it permanently, reflecting their narrative role as jinxes, tricksters, and people
who skate by on charm.

### Recovering Luck

Luck spent temporarily is typically recovered through rest (a full night's sleep
restores some or all temporarily-spent Luck, subject to class and table variant).
Luck that was permanently burned is not recovered by rest — only rare magical
intervention, significant in-fiction events, or GM-adjudicated boons restore
burned Luck.

### Birth Augurs (Lucky Signs)

Each character rolls a birth augur at creation — an omen present at their birth
that determines what their Luck modifier applies to beyond the default (saves,
attacks, or a specific narrow circumstance) and sometimes grants an ongoing minor
effect tied to the omen's theme. A birth augur is usually rolled once and fixed
for the character's life.

### Sample Birth Augur Themes

Example augur themes an agent can draw on when a table needs a quick birth augur
flavor without a full table lookup: born under an eclipse (Luck applies to saves
against fear and paralysis), born with a caul (Luck applies to Fortitude saves),
marked by a wolf's howl at birth (Luck applies to initiative), born during a
lightning storm (Luck applies to Reflex saves against area effects), seventh
child of a seventh child (Luck applies to any single save the player chooses per
use), born beneath a comet (Luck applies to ranged attack rolls), cursed by a
dying man's final words (Luck applies to saves against curses and poison), born
in a graveyard (Luck applies to saves against undead effects).

---

## Saving Throws

### Fortitude, Reflex, and Will

DCC uses three saves: Fortitude (Stamina-based, resists poison, disease, and
physical hardship), Reflex (Agility-based, resists area effects and physical
danger requiring a quick dodge), and Will (Personality- and Intelligence-based,
resists mental effects, fear, and magical compulsion). Save bonuses scale with
class and level rather than a universal progression, so a Warrior's Fortitude
save improves faster than a Wizard's, while a Wizard's Will save improves faster
than a Warrior's.

### Saves by Class Emphasis

Warriors and Dwarves lean toward strong Fortitude and reasonable Reflex. Thieves
and Halflings lean toward strong Reflex. Wizards and Elves lean toward strong
Will. Clerics sit in a more balanced middle, reflecting their role as durable
generalists. An agent adjudicating an ad hoc save should pick whichever of the
three best matches the fictional threat rather than defaulting to one.

---

## Combat

### Initiative and Action Order

Initiative is rolled once per combat (not every round) as a d20 roll modified by
Agility and any class/weapon bonuses (Thieves and some weapon types grant an
initiative edge). Combatants act in descending initiative order each round.
Surprised combatants typically lose their action in the first round or act at a
penalty, at GM discretion.

### Attack Rolls and Armor Class

Attack rolls are d20 plus the relevant attack bonus (Strength-based for melee,
Agility-based for most ranged attacks) against the target's Armor Class. Armor
Class is derived from base 10, plus Agility modifier, plus armor worn, plus
shield and other bonuses — structurally similar to other d20 fantasy games, with
the dice-chain and Mighty Deed layers added on top for certain classes.

### Weapon Damage and the Dice Chain

Each weapon has a damage die drawn from the dice chain rather than a fixed d6/d8
split by weapon category alone; some effects step a weapon's damage die up or
down (a masterwork weapon might step damage up, a broken or rusted weapon might
step it down). Strength modifier is added to melee damage as usual.

### Critical Hits

A critical hit is rolled on a natural 20 (or lower, for some class/level
combinations with an improved crit range). On a crit, the player rolls the
character's current Crit Die against a Crit Table keyed to class — Warriors have
access to the most severe crit tables earliest, reflecting their identity as the
game's premier melee combatants. Crit results range from extra damage to
instant-kill effects on lucky rolls against weak targets.

### Fumbles

A natural 1 on an attack roll triggers a fumble check on the Fumble Die, which
gets *worse* (moves up the dice chain toward bigger dice, which map to worse fumble
results) as the character wears heavier armor — armor that protects also makes a
character clumsier when things go wrong. Fumble results range from a minor
stumble to dropping or breaking the weapon, or striking an ally.

---

## Mighty Deeds of Arms

### Who Can Perform Mighty Deeds

Warriors and Dwarves (and, depending on table variant, certain other
strength-focused character options) can attempt Mighty Deeds of Arms — improvised
combat maneuvers layered on top of a normal attack. This is one of DCC's
signature mechanics for making melee combat narratively dynamic rather than a
flat sequence of "I hit it again."

### The Deed Die

A character who can perform Mighty Deeds rolls a Deed Die alongside every attack
roll — starting at d3 for a 1st-level Warrior and improving with level, up the
dice chain, as the character gains experience. The Deed Die result is added to
both the attack roll and the damage roll automatically, whether or not a Mighty
Deed is declared.

### Declaring and Resolving a Mighty Deed

Before rolling, the player declares what deed they're attempting — disarm, trip,
blind, sunder a weapon, push an enemy off a ledge, pin a cloak to a wall — in
narrative terms. If the Deed Die result is 3 or higher (on the current die, so a
3+ on a d3 is nearly guaranteed but a 3+ on a d10 is more of a coin flip once the
die has grown), the deed succeeds in addition to the normal attack succeeding or
failing on its own merits. A failed attack roll means the deed fails regardless of
the Deed Die result.

### Example Mighty Deeds

Common Mighty Deed types an agent can suggest to a player who's unsure what to
declare: disarming an opponent's weapon, tripping a foe prone, blinding an
opponent with dust or a cloak, sundering a weapon or shield, forcing a foe back a
step, pinning a limb or garment to a surface, knocking a foe's helmet over their
eyes, breaking an opponent's grip on a ledge or rope, and creating a temporary
opening that grants an ally combat advantage.

### Deed Die Progression by Level

The Deed Die climbs the dice chain as a Warrior or Dwarf gains levels — roughly
d3 at 1st level, climbing toward d7 or higher by mid-to-high level play — meaning
both the flat bonus to attack/damage and the odds of triggering a Mighty Deed
improve together as the character advances.

---

## Spellcasting

### The Spell Check

Wizard and Elf spellcasting (and Cleric spellcasting, via a related but distinct
mechanic) uses a "spell check": d20 plus caster level plus the relevant ability
modifier, rolled against a target Difficulty Class set per-spell. Unlike a
prepared-slots system, a DCC caster generally knows a fixed set of spells and
can attempt any of them each time they're needed, with the spell check
determining success, failure, and — for Wizards and Elves — the *magnitude* of
the effect on a tiered results table unique to that spell.

### Casting Ability by Class

Wizards and Elves cast using Intelligence as their casting ability. Clerics cast
using Personality, channeling divine favor rather than personal arcane skill. The
mechanical shape of the roll (d20 + level + ability modifier vs. a DC) is shared
across both, but the consequences of failure diverge sharply — see Corruption for
arcane casters and Disapproval for Clerics below.

### Spell Check Difficulty and Result Tiers

Each spell defines several result tiers by spell check total — a low roll may
mean the spell fizzles or backfires, a middling roll produces a modest effect,
and a very high roll can produce a dramatically stronger version of the same
spell (more damage, longer duration, additional targets). This tiered-result
structure is part of why the same nominal spell can feel wildly different from
one casting to the next.

### Losing a Spell for the Day

A sufficiently low spell check result (not just any failure, but the worst
band on the result table) can cause a Wizard or Elf to lose access to that spell
for the rest of the day, on top of any corruption or other backfire consequence,
representing the caster's grip on that particular working slipping for a while.

---

## Mercurial Magic

### What Mercurial Magic Is

Every spell a Wizard learns manifests with a unique, personal quirk — mercurial
magic — rolled once when the spell is learned and fixed for that caster and that
spell for the rest of the campaign. Two Wizards who both know the same
fireball-equivalent spell might cast it completely differently: one summons
their fire from a pocket dimension with no visible warning, another's version
always leaves a lingering smell of brimstone and occasionally singes the
caster's own eyebrows.

### Rolling Mercurial Magic

Mercurial magic is rolled once per spell known, typically on a d100-style table
cross-referenced against the specific spell, at the moment the spell is learned.
Elves generally do not roll mercurial magic — their magic is described as more
stable and traditional than a Wizard's self-taught or patron-granted power.

### Effect Categories

Mercurial magic effects generally fall into a few broad categories an agent can
use to improvise a flavor if a specific roll isn't available: cosmetic-only
quirks (unusual color, sound, or smell with no mechanical effect), minor
drawbacks (a tell that warns observers, a brief vulnerability after casting),
minor benefits (slightly faster casting, a small area-of-effect change), and
rare major quirks that meaningfully reshape how the spell functions for that
caster specifically.

---

## Corruption

### What Corruption Represents

Corruption represents the physical and metaphysical cost of channeling arcane
power the caster doesn't fully control. It's specific to Wizards and Elves (and,
depending on patron, sometimes triggered through patron-related failures for
other classes) and is triggered by the worst results on a spell check, not by
every failure.

### Minor, Major, and Greater Corruption

Corruption results are typically banded by severity. Minor corruption might be a
cosmetic change — eyes that shift color, hair that grows in odd patterns.
Major corruption is more disruptive — a limb that partially transforms, a
disturbing compulsion. Greater corruption is severe and campaign-altering — a
dramatic physical mutation or a lasting metaphysical taint that other
characters and NPCs may notice and react to.

### Corruption Triggers

Corruption checks are triggered by natural 1s on spell checks, and sometimes by
the specific spell's own worst-result band even on a roll that isn't a natural 1.
Patron-bonded casters may face additional corruption risk tied to their patron's
temperament and the caster's standing with them.

### Roleplaying Corruption

Corruption is meant to be played, not just tracked as a stat penalty — a
Wizard's slow physical transformation is a core part of the class fantasy, and
the GM and player are encouraged to narrate its onset and its social
consequences (NPCs reacting with fear or suspicion) rather than treating it as
pure mechanical overhead.

---

## Patron Bonds

### Forming a Patron Bond

Wizards (and occasionally Elves) may form a bond with a patron — a powerful
extraplanar entity willing to grant power in exchange for service, favors, or
simply the entertainment of watching a mortal wield borrowed strength. This
document deliberately doesn't name specific patrons, since named patrons and
their signature spells are Goodman Games product identity rather than open
mechanical content — a specific campaign's rulebook should be consulted for
named patron write-ups.

### Invoke Patron Spell

A patron-bonded caster typically gains access to an "invoke patron" spell,
letting them call on their patron directly for an effect whose exact nature and
strength depends on the patron's domain and the caster's spell check result.
This is usually the most powerful and least predictable spell available to a
patron-bonded caster.

### Patron Taint

Beyond generic corruption, a patron-bonded caster can accumulate patron-specific
taint reflecting how their patron's nature is reshaping them — the mechanical
shape mirrors corruption (minor/major/greater bands) but the flavor is tied
specifically to that patron's themes rather than arcane power in general.

### Choosing a Patron

When a table needs a patron on short notice without a named write-up, an agent
can improvise along a domain (a patron of forbidden knowledge, of blood and
sacrifice, of unnatural bargains, of hidden doors and thresholds, of decay and
rebirth) and describe invoke-patron effects thematically consistent with that
domain, flagging clearly that it's improvised rather than pulled from an
indexed source.

---

## Clerics: Turn Unholy

### The Turn Unholy Check

Clerics can attempt to turn unholy creatures — chiefly undead, but also
demons and other creatures antithetical to the Cleric's faith — via a
Personality-based check similar in shape to a spell check. A successful check can
force weaker unholy creatures to flee, and at higher results can destroy the
weakest ones outright.

### Effects on Undead and Unholy Creatures

Turn results scale with both the check total and the relative power of the
creatures being turned — a graveyard's worth of freshly risen skeletons might
scatter easily, while an ancient, powerful undead lord shrugs off all but the
most exceptional turn attempts. A failed turn check may embolden hostile undead
rather than simply doing nothing.

---

## Clerics: Disapproval

### The Disapproval Range

Clerics track a "disapproval range" — a growing band of low spell-check results
that count as a divine failure — reflecting accumulated friction with their
deity rather than a single roll's bad luck. The disapproval range starts small
and widens as a Cleric accrues divine displeasure over a session or campaign.

### Triggers for Disapproval Checks

A spell check landing inside the current disapproval range triggers a
disapproval roll on a table of escalating divine consequences, separate from
(and generally more severe than) an ordinary failed spell check outside that
range.

### Consequences of Disapproval

Disapproval consequences range from a minor, embarrassing sign of divine
irritation to a temporary loss of all spellcasting until the Cleric performs a
significant act of penance or atonement in the fiction, to — at the worst end —
a lasting rift with their deity requiring major in-game intervention to repair.

### Recovering from Disapproval

The disapproval range typically resets or shrinks after a period of rest,
proper observance, or an in-fiction act pleasing to the Cleric's deity, though
the exact reset condition is left to table/GM interpretation more than most DCC
subsystems.

---

## Classes Overview

### Warrior

The Warrior is DCC's premier melee combatant: the best attack progression, the
earliest and most severe critical hit tables, and full access to Mighty Deeds of
Arms with the fastest-improving Deed Die. Warriors burn Luck permanently for
one-time bonuses rather than spending it temporarily.

### Wizard

The Wizard is the arcane spellcaster: a growing list of known spells cast via
spell check, unique mercurial magic per spell, corruption risk on bad rolls, and
optionally a patron bond for extra power at extra risk. Wizards are fragile in
melee and rely on spell-check reliability (Intelligence) more than raw combat
stats.

### Cleric

The Cleric channels divine power via Personality-based spell checks, can turn
unholy creatures, and tracks disapproval rather than corruption as the cost of
failure. Clerics are sturdier in melee than Wizards and serve as the group's
primary healer and anti-undead specialist.

### Thief

The Thief is the skill specialist: strong at stealth, traps, locks, and
backstabbing, and spends Luck temporarily (rather than burning it) to boost a
wide range of skill checks, making Luck effectively a Thief's most-used resource
turn to turn.

### Halfling

The Halfling is a small, lucky, opportunistic class — strong Luck-based
utility (including, at higher levels, the ability to share Luck bonuses with
nearby allies), good stealth, and a knack for two-weapon fighting and
squeezing through tight spots literally and narratively.

### Dwarf

The Dwarf is a durable, Mighty-Deed-capable class like the Warrior but with
added utility underground — strong Fortitude, resistance to certain
underground hazards, and a class-specific detection ability for stonework
irregularities (secret doors, sloping passages, unsafe construction).

### Elf

The Elf combines Wizard-like spellcasting with Warrior-adjacent combat
competence and Thief-like stealth in one generalist package, at the cost of
being spread thinner in any single specialty than a dedicated Warrior, Wizard,
or Thief. Elves generally don't roll mercurial magic and have their own
resistances (notably to certain paralysis and sleep effects).

---

## Experience and Leveling

### Advancing in Level

Characters accumulate experience points from overcoming challenges — combat,
clever problem-solving, and successful objectives more broadly rather than
purely "kill things for XP." Leveling up improves hit points, attack bonuses,
saves, and class-specific resources (Deed Die, spells known, turn unholy
effectiveness) according to each class's own progression table.

### What Improves at Level Up

Beyond the class-specific progression, leveling generally increases hit point
maximum (rolled or fixed per class, plus Stamina modifier), and can improve the
character's crit die/table access and fumble die favorability as the character
becomes more skilled and battle-hardened.

---

## Equipment and Starting Gear

### Weapons and the Dice Chain

Every weapon has a damage die on the dice chain and a listed cost, weight, and
whether it's a melee or ranged weapon. A character using a weapon outside their
trained occupation or class proficiency typically suffers a penalty to hit,
reinforcing the funnel's emphasis on the specific trained weapon a 0-level
character starts with.

### Armor and Fumble Die

Armor grants an Armor Class bonus but worsens the wearer's Fumble Die along the
dice chain — heavier armor protects better but makes catastrophic fumbles more
likely on a natural 1, and can also impose an Agility-based check penalty for
certain physical actions like climbing or swimming.

### Trade Goods and Wealth

Starting wealth for 0-level characters is minimal and often occupation-flavored
(a trade good rather than coin), while 1st-level characters built directly
(skipping the funnel) typically roll starting gold by class and purchase
equipment from a standard price list, similar in structure to most class-based
d20 fantasy games.

---

## Thief Skills

### Core Thief Skills

Thieves have a signature skill list distinct from any other class: sneak
silently, hide in shadows, pick locks, pick pockets, disable traps, climb sheer
surfaces, forge documents, handle poison safely, read languages at a glance,
cast a spell from a scroll, and a few others depending on table variant. Each
skill has its own base chance that improves with level, rolled as a
percentile or d20-based check depending on the specific printing consulted.

### Backstab

A Thief attacking a surprised or unaware target from behind gets both a bonus to
the attack roll and a damage multiplier, scaling with level — this is the
Thief's primary source of burst damage, since Thieves otherwise have a
middling attack progression compared to Warriors and Dwarves.

### Skill Improvement with Level

Thief skills improve steadily every level rather than in occasional large
jumps, giving the class a smooth, dependable power curve even though its
combat numbers lag behind the martial classes. A high-level Thief can
reliably do things a 1st-level Thief would only manage by luck.

---

## Dungeon Adventuring Procedures

### Exploration Turns and Time

Dungeon exploration is often tracked in abstract "turns" (roughly ten minutes
of in-fiction time) rather than strict real-time simulation, used to pace
torch/lantern fuel consumption, spell durations, and the frequency of wandering
monster checks. A Judge doesn't need to track exact minutes — turns are a
narrative pacing tool more than a stopwatch.

### Encumbrance

Characters carrying more gear than their Strength comfortably allows suffer
penalties to Agility-based rolls, movement, or both, at Judge discretion.
Encumbrance is usually handled loosely — counting notably heavy or bulky items
(armor, weapons, a full pack, treasure hauls) rather than tracking every
individual coin's weight.

### Resting and Healing

Natural healing is slow — a matter of days of rest recovers a small amount of
lost hit points — making Cleric healing spells and potions the primary tools
for staying combat-ready between encounters. A full night's rest is also the
usual trigger for recovering temporarily-spent Luck and daily-use class
abilities.

### Languages

Starting languages are limited and tied to Intelligence score and background
(most 0-level and 1st-level characters know their region's common tongue and
perhaps one or two more). Ancient, magical, or monstrous languages are rarer
and often a genuine adventure hook rather than a rounding-error skill.

---

## Treasure and Wealth

### Coinage

DCC uses the classic copper/silver/gold/electrum/platinum spread found in most
old-school fantasy games, with gold pieces as the default unit of account for
pricing equipment, training, and lifestyle costs.

### Gems and Trade Goods

Treasure hoards commonly include gems and valuable trade goods (fine cloth,
spices, rare woods) alongside raw coin, both to add flavor and to force
characters to find buyers rather than instantly liquidating everything at face
value — a Judge can use "finding a buyer" as its own light mini-adventure.

### Converting Treasure to Experience

Some tables award experience for treasure recovered and safely brought back to
civilization, not just for monsters killed — this is a legacy convention from
DCC's old-school lineage and is optional; if a group awards story- and
milestone-based experience instead, treasure-for-XP simply doesn't apply.

---

## Random Encounters

### Wandering Monster Checks

Many Judges roll a wandering monster check once per exploration turn or once
per significant time block, with a small chance (often 1-in-6) of a random
encounter interrupting the party — a pacing tool that discourages resting
indefinitely in a dangerous dungeon and keeps pressure on resource management.

### Monster Morale

Not every monster fights to the death. Many creatures check morale when badly
wounded, when their leader falls, or when facing an obviously stronger party,
and may flee, surrender, or attempt to negotiate — a detail that keeps combat
from being purely a kill-everything exercise and gives clever parties
non-violent outs.

---

## Running the Game — Judge Guidance

### Using the Dice Chain for Ad Hoc Checks

When no specific rule covers a situation, a Judge can adjudicate with a plain
Luck check, ability check, or a save against a reasonable DC, and can use the
dice chain itself as a difficulty dial — stepping the die up or down to
reflect an unusually easy or hard version of an otherwise ordinary task,
rather than inventing a new subsystem on the spot.

### Pacing a Funnel

A well-paced funnel keeps character generation fast (a few minutes per
0-level character), throws danger at the party quickly and often, and
resists the urge to over-explain consequences — letting characters die
matter-of-factly is part of the tone, not a failure of the encounter design.

### Running Multiple 0-Level Characters per Player

Players juggling 2-4 characters at once benefit from short, distinguishing
details per character (the occupation and a one-line quirk) rather than full
backstories, since most won't survive long enough for depth to matter — depth
can be added retroactively for the survivors who make it to 1st level.

### Zero-to-Hero Tone

The tonal throughline of DCC is that survival is an achievement in itself.
Judges are encouraged to let the funnel's danger be real (character death
should be common and sometimes absurd) so that reaching 1st level actually
feels like an earned transformation from disposable peasant to genuine hero.

---

## Class Spell List Themes

### Wizard Spell Categories

Wizard spells broadly cluster into a few thematic groups useful for
improvising an unfamiliar spell's likely effect: direct-damage attack spells,
battlefield-control and illusion effects, divination and information-gathering
spells, summoning and binding magic, and transformation or polymorph-style
effects — most with the tiered spell-check result structure described above.

### Cleric Spell Categories

Cleric spells lean toward healing and restoration, protective wards and
blessings, banishing or harming unholy creatures, and utility miracles
(communication, sustenance, minor divination) tied to the Cleric's deity's
portfolio — a Cleric of a war god and a Cleric of a healing goddess should feel
mechanically similar but thematically distinct in which spells they're granted.

---

## Halfling and Dwarf Special Abilities

### Halfling Luck Sharing

At higher levels, Halflings can extend their own Luck bonus to nearby allies for
a single roll, reflecting the class's folkloric role as a good-luck charm for
the whole party, not just themselves — a mechanical expression of the
"lucky halfling" archetype beyond simple self-interest.

### Dwarf Stonework Sense

Dwarves have an innate, often passive ability to notice irregularities in
worked stone — sloping passages, unsafe construction, shifted stonework hiding
a secret door — without needing to actively search, reflecting their
traditional affinity for underground environments and craftsmanship.

---

## Elf Special Abilities

### Elf Detection and Resistances

Elves passively notice secret doors and concealed passages at a higher rate
than other classes when merely passing nearby, and typically carry resistance
or immunity to certain paralysis and sleep-based effects — a nod to their
otherworldly, fae-adjacent nature in the DCC setting's implied cosmology.
