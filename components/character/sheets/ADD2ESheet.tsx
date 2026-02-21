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
    <div className="sheet-root">
      <style jsx>{`
        .sheet-root {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          background: var(--surface-card);
          border: var(--rule-thin);
          padding: 0.875rem;
          font-size: 0.8125rem;
        }

        /* Header */
        .sheet-header {
          border-bottom: 1px solid var(--crimson-dim);
          padding-bottom: 0.625rem;
        }
        .sheet-name {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 600;
          color: var(--ivory);
          margin: 0 0 0.25rem;
        }
        .sheet-meta {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-muted);
          margin: 0;
        }

        /* Section label */
        .section-label {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 0.375rem;
        }

        /* Stat blocks grid — module-box pattern */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.25rem;
        }
        .stat-box {
          position: relative;
          background: var(--void-raised);
          border: var(--rule-thin);
          padding: 0.375rem 0.25rem;
          text-align: center;
        }
        .stat-label {
          font-family: var(--font-heading);
          font-size: 0.525rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory-muted);
          display: block;
        }
        .stat-value {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 700;
          color: var(--ivory);
          display: block;
        }

        /* Combat row */
        .combat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.375rem;
        }
        .combat-box {
          background: var(--void-raised);
          border: var(--rule-thin);
          padding: 0.5rem;
          text-align: center;
        }
        .combat-label {
          font-family: var(--font-heading);
          font-size: 0.525rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory-muted);
          display: block;
        }
        .combat-value {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 700;
        }
        .combat-value.thac0 { color: var(--crimson-bright); }
        .combat-value.ac { color: var(--gold); }
        .combat-value.hp { color: #4a9a5a; }

        /* Saves */
        .save-row {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-body);
          font-size: 0.775rem;
          padding: 0.25rem 0;
          border-bottom: 1px solid var(--void-border);
        }
        .save-row:last-child { border-bottom: none; }
        .save-name { color: var(--ivory-muted); }
        .save-val { color: var(--ivory); font-weight: 600; }

        /* Prof text */
        .prof-text {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-muted);
        }

        /* Spell slot badges */
        .spell-slots {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .spell-slot {
          background: rgba(184, 136, 42, 0.1);
          border: 1px solid var(--gold-dim);
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--gold);
          padding: 0.2rem 0.5rem;
        }
      `}</style>

      {/* Header */}
      <div className="sheet-header">
        <h3 className="sheet-name">{name}</h3>
        <p className="sheet-meta">
          {race} {characterClass} · Level {level} · {alignment}
        </p>
      </div>

      {/* Stats */}
      <div>
        <div className="section-label">Ability Scores</div>
        <div className="stats-grid">
          {statLabels.map((label, i) => (
            <div key={label} className="stat-box">
              <span className="stat-label">{label}</span>
              <span className="stat-value">{(abilityScores[statKeys[i]] as number) ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Combat */}
      <div>
        <div className="section-label">Combat</div>
        <div className="combat-grid">
          <div className="combat-box">
            <span className="combat-label">THAC0</span>
            <span className="combat-value thac0">{thac0}</span>
          </div>
          <div className="combat-box">
            <span className="combat-label">AC</span>
            <span className="combat-value ac">{ac}</span>
          </div>
          <div className="combat-box">
            <span className="combat-label">HP</span>
            <span className="combat-value hp">{hp}/{maxHp}</span>
          </div>
        </div>
      </div>

      {/* Saving Throws */}
      {Object.keys(savingThrows).length > 0 && (
        <div>
          <div className="section-label">Saving Throws</div>
          {Object.entries(saveLabels).map(([key, label]) => (
            <div key={key} className="save-row">
              <span className="save-name">{label}</span>
              <span className="save-val">{(savingThrows[key] as number) ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Proficiencies */}
      {weaponProf.length > 0 && (
        <div>
          <div className="section-label">Weapon Proficiencies</div>
          <p className="prof-text">{weaponProf.join(', ')}</p>
        </div>
      )}
      {nonWeaponProf.length > 0 && (
        <div>
          <div className="section-label">Non-Weapon Proficiencies</div>
          <p className="prof-text">{nonWeaponProf.join(', ')}</p>
        </div>
      )}

      {/* Spell Slots */}
      {Object.keys(spellSlots).length > 0 && (
        <div>
          <div className="section-label">Spell Slots</div>
          <div className="spell-slots">
            {Object.entries(spellSlots).map(([lvl, count]) => (
              <span key={lvl} className="spell-slot">Lv{lvl}: {count}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
