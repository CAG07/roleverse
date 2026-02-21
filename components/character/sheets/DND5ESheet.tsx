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

        .sheet-header {
          border-bottom: 1px solid var(--crimson-dim);
          padding-bottom: 0.625rem;
        }
        .sheet-name {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 600;
          color: var(--ivory);
          margin: 0 0 0.2rem;
        }
        .sheet-meta {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-muted);
          margin: 0;
        }

        .section-label {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 0.375rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.25rem;
        }
        .stat-box {
          background: var(--void-raised);
          border: var(--rule-thin);
          padding: 0.375rem 0.25rem;
          text-align: center;
        }
        .stat-abbr {
          font-family: var(--font-heading);
          font-size: 0.525rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory-muted);
          display: block;
        }
        .stat-score {
          font-family: var(--font-heading);
          font-size: 0.925rem;
          font-weight: 700;
          color: var(--ivory);
          display: block;
        }
        .stat-mod {
          font-family: var(--font-heading);
          font-size: 0.625rem;
          color: var(--gold);
          display: block;
        }

        .combat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
          font-size: 1rem;
          font-weight: 700;
        }
        .combat-value.ac { color: var(--gold); }
        .combat-value.hp { color: #4a9a5a; }
        .combat-value.prof { color: var(--crimson-bright); }
        .combat-value.dice { color: var(--ivory); font-size: 0.75rem; }

        .prof-text {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-muted);
          margin: 0;
        }

        .spell-info {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-muted);
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.375rem;
        }

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

        .features-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .feature-item {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ivory-muted);
          padding: 0.2rem 0;
          border-bottom: 1px solid var(--void-border);
        }
        .feature-item:last-child { border-bottom: none; }
        .feature-item::before { content: '◆ '; color: var(--crimson-dim); font-size: 0.6rem; }
      `}</style>

      <div className="sheet-header">
        <h3 className="sheet-name">{name}</h3>
        <p className="sheet-meta">
          {race} {characterClass}{subclass ? ` (${subclass})` : ''} · Level {level}
        </p>
        <p className="sheet-meta">{background} · {alignment}</p>
      </div>

      <div>
        <div className="section-label">Ability Scores</div>
        <div className="stats-grid">
          {statLabels.map((label, i) => {
            const score = (abilityScores[statKeys[i]] as number) ?? 10;
            return (
              <div key={label} className="stat-box">
                <span className="stat-abbr">{label}</span>
                <span className="stat-score">{score}</span>
                <span className="stat-mod">{abilityModifier(score)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="section-label">Combat</div>
        <div className="combat-grid">
          <div className="combat-box">
            <span className="combat-label">AC</span>
            <span className="combat-value ac">{ac}</span>
          </div>
          <div className="combat-box">
            <span className="combat-label">HP</span>
            <span className="combat-value hp">{hp}/{maxHp}</span>
          </div>
          <div className="combat-box">
            <span className="combat-label">Hit Dice</span>
            <span className="combat-value dice">{hitDice}</span>
          </div>
          <div className="combat-box">
            <span className="combat-label">Prof.</span>
            <span className="combat-value prof">+{proficiencyBonus}</span>
          </div>
        </div>
      </div>

      {savingThrowProf.length > 0 && (
        <div>
          <div className="section-label">Saving Throw Proficiencies</div>
          <p className="prof-text">{savingThrowProf.join(', ')}</p>
        </div>
      )}

      {skillProf.length > 0 && (
        <div>
          <div className="section-label">Skill Proficiencies</div>
          <p className="prof-text">{skillProf.join(', ')}</p>
        </div>
      )}

      {spellSaveDC !== null && (
        <div>
          <div className="section-label">Spellcasting</div>
          <div className="spell-info">
            <span>Save DC: {spellSaveDC}</span>
            {spellAttackMod !== null && <span>Attack: +{spellAttackMod}</span>}
          </div>
          {Object.keys(spellSlots).length > 0 && (
            <div className="spell-slots">
              {Object.entries(spellSlots).map(([lvl, count]) => (
                <span key={lvl} className="spell-slot">Lv{lvl}: {count}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {features.length > 0 && (
        <div>
          <div className="section-label">Features &amp; Traits</div>
          <ul className="features-list">
            {features.map((f) => (
              <li key={f} className="feature-item">{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
