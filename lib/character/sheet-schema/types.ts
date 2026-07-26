// lib/character/sheet-schema/types.ts
// Field-kind taxonomy shared by BaseSheet (display) and SystemFields (creation/edit).
// Each field targets exactly one of the four flexible JSONB columns on `characters`;
// the generic reader/writer buckets by `column` instead of every sheet/form hand-rolling
// its own single-column dump.

export type FieldColumn = 'stats' | 'combat' | 'saves' | 'skills';

interface FieldBase {
  key: string;
  label: string;
  column: FieldColumn;
}

export interface NumberField extends FieldBase {
  kind: 'number';
}

export interface StringField extends FieldBase {
  kind: 'string';
}

/** Newline-separated list — proficiencies, features, feats, corruption. */
export interface StringListField extends FieldBase {
  kind: 'string-list';
}

/** Fixed keyset numeric record with known labels — ADD2E's 5 saves, DCC/PF2E's 3. */
export interface RecordFixedField extends FieldBase {
  kind: 'record-fixed';
  keys: string[];
  labels: Record<string, string>;
}

/** Open keyset numeric record — PF2E skills/proficiency ranks, key set varies per character. */
export interface RecordOpenField extends FieldBase {
  kind: 'record-open';
}

/** Level -> slot count. */
export interface SpellSlotsField extends FieldBase {
  kind: 'spell-slots';
  levels: string[];
}

export type SheetField =
  | NumberField
  | StringField
  | StringListField
  | RecordFixedField
  | RecordOpenField
  | SpellSlotsField;

export interface SystemSheetSchema {
  gameSystem: string;
  fields: SheetField[];
}

/** Form-draft value for a single schema field: scalar kinds keep a raw string;
 *  record-fixed/spell-slots keep one raw string per sub-key; record-open is an
 *  editable list of key/value pairs (key set isn't known ahead of time). */
export type ScalarDraft = string;
export type KeyedDraft = Record<string, string>;
export interface OpenEntryDraft {
  name: string;
  value: string;
}
export type OpenDraft = OpenEntryDraft[];

export type FieldDraft = ScalarDraft | KeyedDraft | OpenDraft;

export type SchemaDraft = Record<string, FieldDraft>;

export function emptyFieldDraft(field: SheetField): FieldDraft {
  switch (field.kind) {
    case 'record-fixed':
      return Object.fromEntries(field.keys.map((k) => [k, '']));
    case 'spell-slots':
      return Object.fromEntries(field.levels.map((l) => [l, '']));
    case 'record-open':
      return [];
    default:
      return '';
  }
}

export function emptySchemaDraft(schema: SystemSheetSchema): SchemaDraft {
  return Object.fromEntries(schema.fields.map((f) => [f.key, emptyFieldDraft(f)]));
}
