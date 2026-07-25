'use client';

import { useState } from 'react';
import styles from './CustomFieldsSection.module.css';
import type { CustomField } from '@/lib/types/character';
import { updateCharacterGameDataColumn } from '@/lib/characters/character-updates';

interface CustomFieldsSectionProps {
  characterId: string;
  customFields: CustomField[];
}

function newFieldId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Open-ended per-character tracking (Pact Points, Reputation, homebrew resources), stored
 *  in game_data_custom. Inline add/edit/remove, click-to-edit like InlineNumberEditor but
 *  text-flavored since CustomField.value is a string. */
export default function CustomFieldsSection({ characterId, customFields }: CustomFieldsSectionProps) {
  const [fields, setFields] = useState<CustomField[]>(customFields);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  const persist = (next: CustomField[]) => {
    setFields(next);
    void updateCharacterGameDataColumn(characterId, 'game_data_custom', next);
  };

  const startEdit = (field: CustomField) => {
    setEditingId(field.id);
    setDraft(field.value);
  };

  const commitEdit = (id: string) => {
    persist(fields.map((f) => (f.id === id ? { ...f, value: draft } : f)));
    setEditingId(null);
  };

  const remove = (id: string) => {
    persist(fields.filter((f) => f.id !== id));
  };

  const confirmAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    persist([...fields, { id: newFieldId(), label, value: newValue.trim() }]);
    setNewLabel('');
    setNewValue('');
    setAdding(false);
  };

  return (
    <div>
      <div className={styles.sectionLabel}>Custom Fields</div>

      {fields.length === 0 && !adding && <p className={styles.emptyText}>No custom fields yet.</p>}

      <div className={styles.list}>
        {fields.map((field) => (
          <div key={field.id} className={styles.row}>
            <span className={styles.label}>{field.label}</span>
            {editingId === field.id ? (
              <input
                className={styles.valueInput}
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitEdit(field.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <button
                type="button"
                className={styles.valueDisplay}
                onClick={() => startEdit(field)}
                aria-label={`Edit ${field.label}`}
              >
                {field.value || '—'}
              </button>
            )}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => remove(field.id)}
              aria-label={`Remove ${field.label}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            placeholder="Field name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            autoFocus
          />
          <input
            className={styles.addInput}
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAdd();
            }}
          />
          <button type="button" className={styles.addConfirm} onClick={confirmAdd}>
            Add
          </button>
          <button type="button" className={styles.addCancel} onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
          + Add Field
        </button>
      )}
    </div>
  );
}
