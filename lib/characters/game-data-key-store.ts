// Module-level save coordinator for sheet panels that write one key of a JSONB
// column (the Spell Book). Lives outside React so it survives a sheet modal being
// closed and reopened mid-save.
//
// Per character+column+key:
// - At most one write is in flight. Edits made meanwhile only replace `latest`;
//   when the write finishes, the newest value is sent next (latest wins), so
//   writes can't land out of order and nothing is rebased onto a stale snapshot.
// - While an entry exists, panels display `latest` instead of their props.
// - On success the host is notified with the saved value (so its props catch up)
//   and the entry is marked settled; the panel clears it once its props change.
// - On failure the entry is dropped, so the panel falls back to its props — the
//   host's last confirmed value — and an error is recorded for display.

import { updateCharacterGameDataKey, type GameDataColumn } from './character-updates';

type Listener = () => void;

interface Entry {
  latest: unknown;
  inFlight: boolean;
  dirty: boolean;
  settled: boolean;
}

export type SavedCallback = (value: unknown) => void;

const entries = new Map<string, Entry>();
const errors = new Map<string, string>();
const listeners = new Map<string, Set<Listener>>();
const savedCallbacks = new Map<string, SavedCallback | undefined>();

export function gameDataStoreKey(characterId: string, column: GameDataColumn, key: string): string {
  return `${characterId}\u0000${column}\u0000${key}`;
}

function emit(storeKey: string) {
  listeners.get(storeKey)?.forEach((l) => l());
}

function parseStoreKey(storeKey: string): [string, GameDataColumn, string] {
  const [characterId, column, key] = storeKey.split('\u0000');
  return [characterId, column as GameDataColumn, key];
}

async function flush(storeKey: string) {
  const entry = entries.get(storeKey);
  if (!entry) return;
  entry.inFlight = true;
  entry.dirty = false;
  const value = entry.latest;
  const [characterId, column, key] = parseStoreKey(storeKey);
  try {
    await updateCharacterGameDataKey(characterId, column, key, value);
    entry.inFlight = false;
    savedCallbacks.get(storeKey)?.(value);
    if (entry.dirty) {
      void flush(storeKey);
      return;
    }
    entry.settled = true;
    emit(storeKey);
  } catch {
    entries.delete(storeKey);
    errors.set(storeKey, 'That change could not be saved. Please try again.');
    emit(storeKey);
  }
}

/** Queue `value` as the new value of one JSONB key. `onSaved` runs after each
 *  successful write (the newest callback registered for this key wins). */
export function setGameDataKey(
  characterId: string,
  column: GameDataColumn,
  key: string,
  value: unknown,
  onSaved?: SavedCallback
) {
  const storeKey = gameDataStoreKey(characterId, column, key);
  savedCallbacks.set(storeKey, onSaved);
  errors.delete(storeKey);
  const entry = entries.get(storeKey);
  if (entry) {
    entry.latest = value;
    entry.settled = false;
    if (entry.inFlight) entry.dirty = true;
    else void flush(storeKey);
  } else {
    entries.set(storeKey, { latest: value, inFlight: false, dirty: false, settled: false });
    void flush(storeKey);
  }
  emit(storeKey);
}

/** Drop a settled entry once the host's props have caught up (or moved on). */
export function clearSettledGameDataKey(storeKey: string) {
  const entry = entries.get(storeKey);
  if (entry?.settled) {
    entries.delete(storeKey);
    emit(storeKey);
  }
}

export function subscribeGameDataKey(storeKey: string, listener: Listener): () => void {
  let set = listeners.get(storeKey);
  if (!set) {
    set = new Set();
    listeners.set(storeKey, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(storeKey);
  };
}

/** Pending/just-saved value, or undefined when the panel should show its props. */
export function getGameDataKeyValue(storeKey: string): unknown {
  return entries.get(storeKey)?.latest;
}

export function isGameDataKeySettled(storeKey: string): boolean {
  return entries.get(storeKey)?.settled ?? false;
}

export function getGameDataKeyError(storeKey: string): string | undefined {
  return errors.get(storeKey);
}
