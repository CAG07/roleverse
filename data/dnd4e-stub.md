# Dungeons & Dragons 4th Edition Reference

**Status:** Baseline reference content. This is an original, independently written
summary of core D&D 4E mechanics, used as a fallback for the Rules Arbiter and Game
Master when a campaign has no uploaded rulebook. Uploaded rulebooks take priority.
4E was published under the Game System License, which has no open rules text, so
nothing here is copied from the books.

## How the Rules Arbiter should use this document

- Ground answers in the sections below when a question matches one of these topics:
  ability scores and defenses, hit points and healing surges, actions, powers,
  attack rolls, combat advantage, conditions, saving throws, death and dying, skills,
  skill challenges, rests, action points, advancement, and monster roles.
- If the campaign has an uploaded rulebook, prefer it over this summary.
- For anything not covered (a specific power's text, a named monster's statistics,
  a specific magic item), use training knowledge and say the answer isn't from an
  indexed source.
- 4E has many supplements with errata. When a question depends on exact wording,
  say so and recommend checking the player's own book or the latest errata.

## Core Resolution: The d20 Roll

Almost everything in 4E is a d20 roll: d20 + modifiers against a target number.
Attacks roll against one of four defenses. Skill checks roll against a Difficulty
Class (DC). Higher is always better. Results that equal the target succeed.

The half-level bonus is 4E's defining modifier. A character adds one-half their
level (rounded down) to attack rolls, skill checks, ability checks, and every
defense. Because monsters scale the same way, a level-appropriate challenge stays
roughly as hard to hit from level 1 to level 30.

## Ability Scores and Modifiers

The six ability scores are Strength, Constitution, Dexterity, Intelligence, Wisdom,
and Charisma. An ability modifier is (score - 10) / 2, rounded down. Characters are
usually built with point buy, and race adds +2 to two ability scores (or one score
for some races, depending on the book).

Ability scores rise during advancement: +1 to two scores at levels 4, 8, 14, 18,
24, and 28, and +1 to every score at levels 11 and 21.

## Defenses

There are four defenses. Each is 10 + one-half level + bonuses:

- Armor Class (AC): armor bonus and shield bonus. In light armor or no armor, also
  add the higher of the Dexterity or Intelligence modifier.
- Fortitude: the higher of the Strength or Constitution modifier, plus class bonus.
- Reflex: the higher of the Dexterity or Intelligence modifier, plus class and
  shield bonus.
- Will: the higher of the Wisdom or Charisma modifier, plus class bonus.

Enhancement bonuses from magic armor and neck slot items add to these. Bonuses of
the same type don't stack (only the highest applies), while untyped bonuses do.

## Hit Points, Bloodied, and Healing Surges

Each class gives a starting hit point total (a base number plus the Constitution
score) and a fixed number of hit points per level after 1st.

- Bloodied: a creature at or below half its maximum hit points is bloodied. Many
  powers trigger on or target bloodied creatures.
- Healing surge value: one-quarter of maximum hit points, rounded down.
- Healing surges per day: set by class plus the Constitution modifier.

Most healing in 4E works by spending a healing surge: the character regains hit
points equal to their surge value, often plus extra hit points from the power.
Some effects grant healing "as if you spent a healing surge" without using one up.

Temporary hit points absorb damage first. They don't stack with each other; take
the higher amount.

## Second Wind

Once per encounter, as a standard action, a character can use Second Wind: spend a
healing surge to regain hit points, and gain +2 to all defenses until the start of
their next turn. (Some races, such as dwarves, can use it as a minor action.)

## Death and Dying

At 0 hit points or fewer, a character is dying and unconscious. At the end of each
of their turns they make a death saving throw: a d20 roll with no modifiers.

- Lower than 10: a failure. Three failed death saves before the next rest means
  death.
- 10 to 19: no change.
- 20 or higher: spend a healing surge and regain hit points as if spending it.

A character also dies outright if their negative hit points reach their bloodied
value. When a dying character is healed, they start at 0 hit points and add the
healing from there.

## Saving Throws Against Effects

Many effects last "(save ends)". At the end of each of their turns, the affected
creature rolls a d20: 10 or higher ends the effect. Some racial or class bonuses
modify the roll. Other effects last until the end of a specific turn instead.

## Actions in Combat

On each turn a creature gets:

- One standard action (usually an attack power),
- One move action (walk your speed, shift 1 square, stand up),
- One minor action (draw a weapon, open a door, sustain many powers).

A standard action can be traded for a move or minor action, and a move action for
a minor action. Free actions (dropping an item, speaking briefly) don't count
against this.

Off-turn, a creature can take one immediate action per round: either an immediate
interrupt (resolves before its trigger) or an immediate reaction (resolves after).
Opportunity actions, such as opportunity attacks, can be taken once per other
combatant's turn.

## Movement, Shifting, and Opportunity Attacks

Grid squares are 5 feet. Moving out of a square adjacent to an enemy provokes an
opportunity attack from that enemy (a melee basic attack). Making a ranged or area
attack while adjacent to an enemy also provokes.

Shifting moves 1 square as a move action without provoking. Some powers let a
creature shift more than 1 square.

Forced movement is pushing (straight away), pulling (straight toward), or sliding
(any direction) the target a number of squares. Forced movement doesn't provoke
opportunity attacks.

Difficult terrain costs 1 extra square of movement to enter.

## Charging

As a standard action, a creature can charge: move up to its speed (ending at least
2 squares closer to the target) and make a melee basic attack, or a power usable on
a charge, with a +1 bonus. After a charge the creature can't take further actions
that turn except free actions.

## Attack Rolls and Damage

An attack roll is d20 + ability modifier + one-half level + weapon proficiency
bonus (weapon attacks) + enhancement bonus + feat and other bonuses, against the
defense named in the power.

- Natural 20: an automatic hit, and a critical hit if the roll would hit. A
  critical hit deals maximum damage from the power's dice. Magic weapons and
  implements add extra critical dice.
- Natural 1: an automatic miss.

Damage is written with [W] for the weapon's damage die, so "2[W] + Strength
modifier" means roll the weapon's die twice. Many powers have a Miss line (often
half damage) and an Effect line that happens on a hit or a miss.

## Combat Advantage

A creature has combat advantage against a target that can't defend itself fully:
the target is flanked, prone (for melee attacks), blinded, dazed, stunned,
surprised, helpless, restrained, or otherwise unable to see the attacker.

Combat advantage gives +2 to attack rolls. Rogues and some other classes deal extra
damage when they have it.

Flanking means two allies are adjacent to the enemy on opposite sides or corners.

## Cover and Concealment

- Cover: -2 to attack rolls. Superior cover: -5.
- Concealment (dim light, fog): -2 to attack rolls. Total concealment (darkness,
  invisible attacker or target): -5.

## Conditions

- Blinded: grants combat advantage, can't see, attackers have total concealment
  against it, takes -10 to Perception checks, can't flank.
- Dazed: can take only one action on its turn (standard, move, or minor), grants
  combat advantage, can't take immediate or opportunity actions, can't flank.
- Deafened: can't hear, -10 to Perception checks.
- Dominated: dazed, and the dominator chooses its action each turn (limited to
  at-will powers).
- Dying: unconscious and making death saving throws.
- Helpless: grants combat advantage and can be the target of a coup de grace.
- Immobilized: can't move from its square, though it can teleport and be force
  moved.
- Marked: -2 to attack rolls for any attack that doesn't include the creature that
  marked it. A creature can be marked by only one source at a time; a new mark
  replaces the old one.
- Petrified: turned to stone, unconscious, resist 20 to all damage, doesn't age.
- Prone: -2 to attack rolls, grants combat advantage to melee attackers, but gets
  +2 to all defenses against ranged attacks from non-adjacent enemies. Standing up
  is a move action.
- Restrained: can't move, grants combat advantage, -2 to attack rolls.
- Slowed: speed becomes 2 (if it was higher).
- Stunned: can't take actions, grants combat advantage, can't flank, falls if
  flying.
- Surprised: grants combat advantage, can't take actions other than free actions
  (during a surprise round).
- Unconscious: helpless, -5 to all defenses, can't take actions, falls prone,
  can't flank.
- Weakened: deals half damage with its attacks (ongoing damage is not halved).

Ongoing damage ("ongoing 5 fire") is taken at the start of the creature's turn
until it saves.

## Powers: At-Will, Encounter, and Daily

Every class uses the same power structure:

- At-will powers can be used any number of times.
- Encounter powers can be used once per encounter. They recharge after a short
  rest.
- Daily powers can be used once per day. They recharge after an extended rest.
- Utility powers are non-attack powers that can be at-will, encounter, or daily.

Power keywords describe how a power works: power source (Arcane, Divine, Martial,
Primal, Psionic, Shadow), accessory (Weapon or Implement), damage type (fire, cold,
lightning, thunder, acid, force, necrotic, radiant, poison, psychic), and effect
type (Charm, Fear, Healing, Illusion, Polymorph, Reliable, Sleep, Stance, Zone).

Attack types are Melee, Ranged, Close (blast or burst from the user), and Area
(burst or wall at a distance). A blast is a square area adjacent to the user; a
burst radiates from a point.

A Reliable power isn't expended if it misses. Sustained powers need a minor,
move, or standard action each turn to keep going.

## Rests and Milestones

- Short rest: about 5 minutes. Recharges encounter powers and lets characters
  spend any number of healing surges.
- Extended rest: 6 hours, no more than once per 12 hours. Restores all hit points
  and healing surges, recharges daily powers, and resets action points to 1.
- Milestone: reached after every two encounters without an extended rest. Each
  milestone grants 1 action point (and, in the core rules, an extra use of a magic
  item daily power).

## Action Points

A character starts each day with 1 action point. Once per encounter, as a free
action on their own turn, they can spend an action point to take an extra action
(usually a standard action). Some paragon paths add a benefit when an action point
is spent. Action points reset to 1 after an extended rest.

## Skills

There are 17 skills: Acrobatics, Arcana, Athletics, Bluff, Diplomacy, Dungeoneering,
Endurance, Heal, History, Insight, Intimidate, Nature, Perception, Religion,
Stealth, Streetwise, and Thievery.

A skill check is d20 + one-half level + the skill's ability modifier + 5 if the
character is trained in the skill + racial, feat, and item bonuses. Armor check
penalties apply to Strength, Dexterity, and Constitution skills.

Passive Insight and Passive Perception are 10 + the character's normal bonus. The
DM uses them to notice things without a roll.

## Skill Challenges

A skill challenge is a non-combat scene resolved through several skill checks.
The group must reach a set number of successes before getting three failures. The
DM sets the complexity (from 4 successes up to 12) and lists the primary skills
that help. Clever use of other skills is allowed at the DM's discretion, usually
at a higher DC. A skill challenge awards experience like a combat encounter of
the same level.

## Character Roles and Classes

Each class fills a role:

- Controller: hinders groups of enemies (Wizard, Druid, Invoker, Psion, Seeker).
- Defender: draws attacks and protects allies, usually with marks (Fighter,
  Paladin, Warden, Swordmage, Battlemind).
- Leader: heals and buffs the party (Cleric, Warlord, Bard, Shaman, Ardent,
  Runepriest).
- Striker: deals concentrated damage to single targets (Rogue, Ranger, Warlock,
  Sorcerer, Barbarian, Avenger, Monk, Assassin).

The first Player's Handbook covers Cleric, Fighter, Paladin, Ranger, Rogue,
Warlock, Warlord, and Wizard. Its races are Dragonborn, Dwarf, Eladrin, Elf,
Half-elf, Halfling, Human, and Tiefling.

## Advancement: Tiers, Paths, and Destinies

Characters advance from level 1 to level 30 in three tiers:

- Heroic tier: levels 1 to 10.
- Paragon tier: levels 11 to 20. At 11th level each character picks a paragon path
  (a specialty that grants extra features and powers).
- Epic tier: levels 21 to 30. At 21st level each character picks an epic destiny.

Characters gain feats at 1st level, at every even level, and at levels 11 and 21.
New powers are gained on a fixed class schedule, and higher-level powers can
replace lower-level ones.

## Monsters and Encounter Building

Monsters have a level and a role:

- Artillery: ranged attackers.
- Brute: high hit points and damage, low defenses.
- Controller: imposes conditions and moves enemies around.
- Lurker: hides and strikes in bursts.
- Skirmisher: mobile.
- Soldier: high defenses, holds enemies in place.

Each monster also has a threat rank:

- Minion: 1 hit point, and a missed attack never damages it.
- Standard monster.
- Elite: counts as two standard monsters.
- Solo: counts as five.

A standard encounter's experience budget is the experience value of one standard
monster of the party's level for each player character. A monster's experience
value grows with its level. A level 1 standard monster is worth 100 XP, rising to
500 XP at level 10, and a minion is worth one-quarter of a standard monster.

## Rituals and Magic Items

Rituals are non-combat magic. Casting one takes time (often 10 minutes or more)
and consumes components bought with gold. A character needs the Ritual Caster feat
(some classes have it automatically).

Magic weapons, implements, and armor have an enhancement bonus from +1 to +6 that
adds to attack rolls and damage rolls (weapons and implements) or to AC and
defenses (armor and neck slot items). Many items also have a daily power.

## Glossary

- AC, Fort, Ref, Will: the four defenses. "NADs" (non-AC defenses) means Fortitude,
  Reflex, and Will together.
- At-will, encounter, daily: how often a power can be used (any time, once per
  encounter, once per day).
- [W]: one roll of the weapon's damage die. "2[W]" means roll it twice.
- AP: action point. Spend one per encounter for an extra action.
- Bloodied: at or below half maximum hit points.
- CA: combat advantage (+2 to attack rolls).
- EoNT / SoNT: "end of next turn" and "start of next turn", used for effect
  durations.
- Healing surge / surge value: the daily healing resource, and how much one restores
  (one-quarter of maximum hit points).
- Immediate interrupt / immediate reaction: off-turn actions, one per round, that
  resolve before or after their trigger.
- Implement: a holy symbol, rod, staff, wand, orb, or other focus used for implement
  powers instead of a weapon.
- MBA / RBA: melee basic attack and ranged basic attack.
- Mark: a defender's tag that gives the target -2 to attacks that don't include the
  marker.
- Milestone: every two encounters without an extended rest.
- Minion, standard, elite, solo: monster threat ranks (worth one-quarter, one, two,
  or five standard monsters).
- OA: opportunity attack.
- Paragon path / epic destiny: the specialties chosen at levels 11 and 21.
- Push, pull, slide: types of forced movement.
- Save ends: the effect lasts until the creature rolls 10 or higher on a saving
  throw at the end of its turn.
- Shift: move 1 square without provoking opportunity attacks.
- Skill challenge: a non-combat scene of skill checks against a success/failure
  count.
- Striker, defender, leader, controller: the four class roles.

## RoleVerse Character Sheet Fields

What each field on RoleVerse's D&D 4E character sheet holds and how it's used:

- AC and Other Defenses (Fortitude, Reflex, Will): the four defenses attacks target.
  Each already includes the half-level bonus.
- Initiative, Speed: the initiative modifier (Dexterity modifier + half level +
  bonuses) and squares of movement per move action.
- Passive Insight, Passive Perception: 10 + the skill bonus, used by the GM to notice
  lies and hidden things without a roll.
- Action Points: current action points (1 after each extended rest, +1 per
  milestone).
- Temporary HP: temporary hit points, lost before real hit points.
- Bloodied: half the character's maximum hit points (rounded down).
- Surge Value, Surges per Day, Current Surges: healing surge size, the daily
  maximum, and how many are left.
- Second Wind Used: whether Second Wind has been used this encounter.
- Skills and Trained Skills: the total bonus for each of the 17 skills, and which
  ones are trained (+5).
- Attacks: one row per attack (basic attacks and attack powers): the defense it
  targets, total attack bonus, damage, and range.
- Powers: one row per power, with its usage (at-will, encounter, daily, or
  utility), level and keywords, action type and range, effects, and special notes.
- Feats & Special Features, Rituals, Magic Items, Companions & Allies, Languages:
  free lists.
- Carrying Capacity (Normal Load, Heavy Load, Max Drag Load): derived from Strength.
- Money & Other Wealth, Experience Points, Experience Needed for Next Level.
- Alignment, Deity / Religion, Paragon Path, Epic Destiny.
- Age, Sex, Size, Height, Weight, Eyes, Hair, Skin, Description, Personality,
  Contacts & Friends, Enemies, Quotes, Will (Goals & Motivations), Background &
  Notes: roleplaying details.

## GM Quick Reference

- Difficulty classes: in 4E, DCs scale with level. A rough guide: at low heroic
  levels an easy check is around DC 8 to 10, a moderate one around 12 to 15, and a
  hard one around 19 to 20. Each tier adds roughly 5 to 10 to all three. Set the DC
  by the party's level, not by a fixed number.
- Building an encounter: add up an XP budget of one standard monster of the
  party's level per character. For an easier fight, use monsters one or two levels
  below the party; for a harder one, one to three levels above. Keep monsters
  within about four levels of the party, or they'll be impossible to hit or
  trivial.
- Mix roles: a typical fight has a couple of soldiers or brutes in front, one or two
  artillery or controllers behind, and a skirmisher or lurker. Minions fill out a
  group cheaply (four minions cost about one standard monster).
- Solos and elites: a solo is a whole encounter on its own. Give it ways to act more
  than once per round or to shake off conditions, or the party will lock it down.
- Pacing: most groups manage three to five encounters between extended rests. Use
  milestones and healing surges as the clock.
- Rewards: give experience for every encounter and skill challenge. Spread treasure
  across a level in several parcels: some magic items around the party's level, and
  the rest as gold, gems, art, or consumables.

## Commonly Confused Rules

- The half-level bonus applies to defenses, skills, and attacks alike. Forgetting it
  on defenses makes characters far too easy to hit.
- Only one action point can be spent per encounter, even with several saved up.
- Immediate actions are limited to one per round, not one per turn. Opportunity
  attacks are limited to one per other creature's turn.
- Saving throws happen at the end of the affected creature's turn. Ongoing damage
  happens at the start.
- Minions aren't damaged by a miss, even when the power says it deals half damage
  on a miss.
- A critical hit maximizes the power's damage dice. Extra critical dice from a magic
  item are rolled and added on top.
- A creature can only be marked by one source at a time. The newest mark replaces
  the old one.
- Bonuses of the same type (enhancement, item, power, feat, and so on) don't stack;
  only the highest counts. Untyped bonuses do stack.
- Flanking needs two allies on directly opposite sides or corners of the enemy, both
  adjacent to it.
- 4E vs Essentials: the Essentials line (Heroes of the Fallen Lands, the Rules
  Compendium) added classes with a different structure (for example the Slayer,
  Knight, Thief, and Mage, with stances and fewer daily attack powers), revised the
  skill DCs, and changed Stealth and magic item rarity. They can mix with original
  classes, but check which version a player is using.
