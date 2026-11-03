import { beforeEach, describe, expect, it, vi } from 'vitest';

const writes: unknown[] = [];
let pending: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];

vi.mock('./character-updates', () => ({
  updateCharacterGameDataKey: vi.fn((_id: string, _col: string, _key: string, value: unknown) => {
    writes.push(value);
    return new Promise<void>((resolve, reject) => pending.push({ resolve, reject }));
  }),
}));

const store = await import('./game-data-key-store');

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

let n = 0;
function freshKey() {
  n += 1;
  return { id: `char-${n}`, storeKey: store.gameDataStoreKey(`char-${n}`, 'game_data_combat', 'spellbook') };
}

beforeEach(() => {
  writes.length = 0;
  pending = [];
});

describe('game-data-key-store', () => {
  it('keeps one write in flight and sends only the newest value next', async () => {
    const { id, storeKey } = freshKey();
    const saved: unknown[] = [];
    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 1, (v) => saved.push(v));
    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 2, (v) => saved.push(v));
    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 3, (v) => saved.push(v));
    expect(writes).toEqual([1]);
    expect(store.getGameDataKeyValue(storeKey)).toBe(3);

    pending.shift()!.resolve();
    await flushMicrotasks();
    expect(writes).toEqual([1, 3]);
    expect(saved).toEqual([1]);
    expect(store.isGameDataKeySettled(storeKey)).toBe(false);

    pending.shift()!.resolve();
    await flushMicrotasks();
    expect(saved).toEqual([1, 3]);
    expect(store.isGameDataKeySettled(storeKey)).toBe(true);

    store.clearSettledGameDataKey(storeKey);
    expect(store.getGameDataKeyValue(storeKey)).toBeUndefined();
  });

  it('on failure drops the pending value (falling back to props) and records an error', async () => {
    const { id, storeKey } = freshKey();
    const saved: unknown[] = [];
    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 1, (v) => saved.push(v));
    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 2, (v) => saved.push(v));

    pending.shift()!.reject(new Error('offline'));
    await flushMicrotasks();
    expect(store.getGameDataKeyValue(storeKey)).toBeUndefined();
    expect(store.getGameDataKeyError(storeKey)).toMatch(/could not be saved/);
    expect(writes).toEqual([1]);
    expect(saved).toEqual([]);

    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 5);
    expect(store.getGameDataKeyError(storeKey)).toBeUndefined();
  });

  it('does not clear an entry that is still saving', () => {
    const { id, storeKey } = freshKey();
    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 1);
    store.clearSettledGameDataKey(storeKey);
    expect(store.getGameDataKeyValue(storeKey)).toBe(1);
  });

  it('notifies subscribers, independent of any component lifetime', async () => {
    const { id, storeKey } = freshKey();
    const listener = vi.fn();
    const unsubscribe = store.subscribeGameDataKey(storeKey, listener);
    store.setGameDataKey(id, 'game_data_combat', 'spellbook', 1);
    unsubscribe();
    pending.shift()!.resolve();
    await flushMicrotasks();
    expect(listener).toHaveBeenCalledTimes(1);
    // A panel mounting later still sees the saved value until its props catch up.
    expect(store.getGameDataKeyValue(storeKey)).toBe(1);
    expect(store.isGameDataKeySettled(storeKey)).toBe(true);
  });
});
