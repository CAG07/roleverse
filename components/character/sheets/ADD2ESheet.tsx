'use client';

interface ADD2ESheetProps {
  data: Record<string, unknown>;
}

function getVal<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  return (data[key] as T) ?? fallback;
}

function getRecord(data: Record<string, unknown>, key: string): Record<string, unknown> {
  return (data[key] as Record<string, unknown>) ?? {};
}

export default function ADD2ESheet({ data }: ADD2ESheetProps) {
  const name = getVal(data, 'name', 'Unknown');
  const race = getVal(data, 'race', '—');
  const characterClass = getVal(data, 'class', '—');
  const level = getVal(data, 'level', 0);
  const alignment = getVal(data, 'alignment', '—');
  const thac0 = getVal(data, 'thac0', 20);
  const ac = getVal(data, 'ac', 10);
  const hp = getVal(data, 'hp', 0);
  const maxHp = getVal(data, 'maxHp', 0);

  const abilityScores = getRecord(data, 'abilityScores');
  const savingThrows = getRecord(data, 'savingThrows');
  const weaponProf = getVal<string[]>(data, 'weaponProficiencies', []);
  const nonWeaponProf = getVal<string[]>(data, 'nonWeaponProficiencies', []);
  const spellSlots = getVal<Record<string, number>>(data, 'spellSlots', {});

  const statLabels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const statKeys = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

  const saveLabels: Record<string, string> = {
    paralyzation: 'Para/Poison/Death',
    rod: 'Rod/Staff/Wand',
    petrification: 'Petrif./Polymorph',
    breath: 'Breath Weapon',
    spell: 'Spell',
  };

  return (
    <div className="flex flex-col gap-3 overflow-y-auto rounded border border-gold/40 bg-cream/90 p-3 text-sm">
      {/* Header */}
      <div className="border-b border-gold/30 pb-2">
        <h3 className="font-medieval text-lg text-rust">{name}</h3>
        <p className="text-xs text-brown/70">
          {race} {characterClass} · Level {level} · {alignment}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-1 text-center">
        {statLabels.map((label, i) => (
          <div key={label} className="rounded bg-brown/10 p-1">
            <div className="text-[10px] font-medium text-brown/60">{label}</div>
            <div className="font-medieval text-base text-brown">
              {(abilityScores[statKeys[i]] as number) ?? '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Combat */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-rust/10 p-1.5">
          <div className="text-[10px] text-brown/60">THAC0</div>
          <div className="font-medieval text-lg text-rust">{thac0}</div>
        </div>
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
      </div>

      {/* Saving Throws */}
      {Object.keys(savingThrows).length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Saving Throws</h4>
          <div className="space-y-0.5">
            {Object.entries(saveLabels).map(([key, label]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-brown/70">{label}</span>
                <span className="font-medium text-brown">
                  {(savingThrows[key] as number) ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proficiencies */}
      {weaponProf.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Weapon Proficiencies</h4>
          <p className="text-xs text-brown/70">{weaponProf.join(', ')}</p>
        </div>
      )}
      {nonWeaponProf.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Non-Weapon Proficiencies</h4>
          <p className="text-xs text-brown/70">{nonWeaponProf.join(', ')}</p>
        </div>
      )}

      {/* Spell Slots */}
      {Object.keys(spellSlots).length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-brown/80">Spell Slots</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(spellSlots).map(([lvl, count]) => (
              <span key={lvl} className="rounded bg-gold/20 px-2 py-0.5 text-xs text-brown">
                Lv{lvl}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
