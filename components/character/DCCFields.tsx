'use client';

import styles from './DCCFields.module.css';

export interface DCCFieldsValue {
  occupation: string;
  luckySign: string;
  alignment: 'Lawful' | 'Neutral' | 'Chaotic';
  currentLuck: string;
  startingLuck: string;
  deedDie: string;
  disapprovalRange: string;
  corruptionText: string;
  mercurialMagicText: string;
}

export const DCC_FIELDS_DEFAULT: DCCFieldsValue = {
  occupation: '',
  luckySign: '',
  alignment: 'Neutral',
  currentLuck: '10',
  startingLuck: '10',
  deedDie: '',
  disapprovalRange: '',
  corruptionText: '',
  mercurialMagicText: '',
};

interface DCCFieldsProps {
  value: DCCFieldsValue;
  onChange: (value: DCCFieldsValue) => void;
}

/** DCC-specific character creation inputs: occupation, luck, lucky sign, class-specific fields. */
export default function DCCFields({ value, onChange }: DCCFieldsProps) {
  const set = <K extends keyof DCCFieldsValue>(key: K, val: DCCFieldsValue[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className={styles.dccSection}>
      <div className={styles.sectionDivider}>Dungeon Crawl Classics Details</div>

      <div className={styles.formGroup}>
        <label htmlFor="occupation" className={styles.formLabel}>
          Occupation
        </label>
        <input
          id="occupation"
          className={styles.formInput}
          value={value.occupation}
          onChange={(e) => set('occupation', e.target.value)}
          placeholder="e.g. Chicken Butcher, Astrologer"
        />
      </div>

      <div className={styles.formRow}>
        <div>
          <label htmlFor="luckySign" className={styles.formLabel}>
            Lucky Sign (Birth Augur)
          </label>
          <input
            id="luckySign"
            className={styles.formInput}
            value={value.luckySign}
            onChange={(e) => set('luckySign', e.target.value)}
            placeholder="e.g. Harsh winter: all attack rolls"
          />
        </div>
        <div>
          <label htmlFor="alignment" className={styles.formLabel}>
            Alignment
          </label>
          <select
            id="alignment"
            className={styles.formInput}
            value={value.alignment}
            onChange={(e) => set('alignment', e.target.value as DCCFieldsValue['alignment'])}
          >
            <option value="Lawful">Lawful</option>
            <option value="Neutral">Neutral</option>
            <option value="Chaotic">Chaotic</option>
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div>
          <label htmlFor="currentLuck" className={styles.formLabel}>
            Current Luck
          </label>
          <input
            id="currentLuck"
            type="number"
            className={styles.formInput}
            value={value.currentLuck}
            onChange={(e) => set('currentLuck', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="startingLuck" className={styles.formLabel}>
            Starting Luck
          </label>
          <input
            id="startingLuck"
            type="number"
            className={styles.formInput}
            value={value.startingLuck}
            onChange={(e) => set('startingLuck', e.target.value)}
          />
        </div>
      </div>

      <p className={styles.hint}>
        Class-specific — leave blank if not applicable to this character&apos;s class.
      </p>

      <div className={styles.formRow}>
        <div>
          <label htmlFor="deedDie" className={styles.formLabel}>
            Deed Die (Warriors / Dwarves)
          </label>
          <input
            id="deedDie"
            className={styles.formInput}
            value={value.deedDie}
            onChange={(e) => set('deedDie', e.target.value)}
            placeholder="e.g. d3"
          />
        </div>
        <div>
          <label htmlFor="disapprovalRange" className={styles.formLabel}>
            Disapproval Range (Clerics)
          </label>
          <input
            id="disapprovalRange"
            type="number"
            className={styles.formInput}
            value={value.disapprovalRange}
            onChange={(e) => set('disapprovalRange', e.target.value)}
            placeholder="e.g. 1"
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="corruption" className={styles.formLabel}>
          Corruption (Wizards / Elves) — one per line
        </label>
        <textarea
          id="corruption"
          className={styles.formTextarea}
          value={value.corruptionText}
          onChange={(e) => set('corruptionText', e.target.value)}
          rows={2}
          placeholder="e.g. Skin turns faintly translucent"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="mercurialMagic" className={styles.formLabel}>
          Mercurial Magic (Wizards / Elves) — one per line, as &quot;Spell: Effect&quot;
        </label>
        <textarea
          id="mercurialMagic"
          className={styles.formTextarea}
          value={value.mercurialMagicText}
          onChange={(e) => set('mercurialMagicText', e.target.value)}
          rows={2}
          placeholder="e.g. Magic Missile: Caster's eyes glow while casting"
        />
      </div>
    </div>
  );
}
