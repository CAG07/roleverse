'use client';

interface DND5ESheetProps {
  data: Record<string, unknown>;
}

function getVal<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  return (data[key] as T) ?? fallback;
}

function getRecord(data: Record<string, unknown>, key: string): Record<string, unknown> {
  return (data[key] as Record<string, unknown>) ?? {};
}

function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export default function DND5ESheet({ data }: DND5ESheetProps) {
  const name = getVal(data, 'name', 'Unknown');
  const race = getVal(data, 'race', '—');
  const characterClass = getVal(data, 'class', '—');
  const subclass = getVal(data, 'subclass', '');
  const level = getVal(data, 'level', 0);
  const background = getVal(data, 'background', '—');
  const alignment = getVal(data, 'alignment', '—');
  const proficiencyBonus = getVal(data, 'proficiencyBonus', 2);
  const ac = getVal(data, 'ac', 10);
  const hp = getVal(data, 'hp', 0);
  const maxHp = getVal(data, 'maxHp', 0);
  const hitDice = getVal(data, 'hitDice', '—');

  const abilityScores = getRecord(data, 'abilityScores');
  const savingThrowProf = getVal<string[]>(data, 'savingThrowProficiencies', []);
  const skillProf = getVal<string[]>(data, 'skillProficiencies', []);
  const features = getVal<string[]>(data, 'features', []);

  const spellSaveDC = getVal<number | null>(data, 'spellSaveDC', null);
  const spellAttackMod = getVal<number | null>(data, 'spellAttackModifier', null);
  const spellSlots = getVal<Record<string, number>>(data, 'spellSlots', {});

  const statLabels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const statKeys = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

  return (
    <div className="flex flex-col gap-3 overflow-y-auto rounded border border-gold/40 bg-cream/90 p-3 text-sm">
      {/* Header */}
      <div className="border-b border-gold/30 pb-2">
        <h3 className="font-medieval text-lg text-rust">{name}</h3>
        <p className="text-xs text-brown/70">
          {race} {characterClass}
          {subclass ? ` (${subclass})` : ''} · Level {level}
        </p>
        <p className="text-xs text-brown/50">
          {background} · {alignment}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-1 text-center">
        {statLabels.map((label, i) => {
          const score = (abilityScores[statKeys[i]] as number) ?? 10;
          return (
            <div key={label} className="rounded bg-brown/10 p-1">
              <div className="text-[10px] font-medium text-brown/60">{label}</div>
              <div className="font-medieval text-base text-brown">{score}</div>
              <div className="text-[10px] text-teal">{abilityModifier(score)}</div>
            </div>
          );
        })}
      </div>

      {/* Combat */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded bg-teal/10 p-1.5">
          <div className="text-[10px] text-brown/60">AC</div>
          <div className="font-medieval text-lg text-teal">{ac}</div>
        </div>
        <div className="rounded bg-green-600/10 p-1.5">
          <div className="text-[10px] text-brown/60">HP</div>
          <div className="font-medieval text-lg text-green-700">
            {hp}/{maxHp}
          </div>
        </div>
        <div className="rounded bg-brown/10 p-1.5">
          <div className="text-[10px] text-brown/60">Hit Dice</div>
          <div className="text-xs text-brown">{hitDice}</div>
        </div>
        <div className="rounded bg-gold/10 p-1.5">
          <div className="text-[10px] text-brown/60">Prof.</div>
          <div className="font-medieval text-lg text-gold">+{proficiencyBonus}</div>
        </div>
      </div>

      {/* Saving Throws */}
      {savingThrowProf.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Saving Throw Proficiencies</h4>
          <p className="text-xs text-brown/70">{savingThrowProf.join(', ')}</p>
        </div>
      )}

      {/* Skills */}
      {skillProf.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Skill Proficiencies</h4>
          <p className="text-xs text-brown/70">{skillProf.join(', ')}</p>
        </div>
      )}

      {/* Spellcasting */}
      {spellSaveDC !== null && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Spellcasting</h4>
          <div className="flex gap-3 text-xs text-brown/70">
            <span>Save DC: {spellSaveDC}</span>
            {spellAttackMod !== null && <span>Attack: +{spellAttackMod}</span>}
          </div>
          {Object.keys(spellSlots).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(spellSlots).map(([lvl, count]) => (
                <span key={lvl} className="rounded bg-gold/20 px-2 py-0.5 text-xs text-brown">
                  Lv{lvl}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Features */}
      {features.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Features & Traits</h4>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-brown/70">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
