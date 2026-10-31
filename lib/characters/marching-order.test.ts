// lib/characters/marching-order.test.ts
import { describe, expect, it } from 'vitest';

import { formatMarchingOrder, normalizeMarchingOrder, swapPlaces } from './marching-order';

const ids = ['raybay', 'enos', 'serafina', 'spritz', 'adran', 'aldric'];

describe('normalizeMarchingOrder', () => {
  it('fills ranks of two in character order when nothing is saved', () => {
    expect(normalizeMarchingOrder(null, ids)).toEqual([
      ['raybay', 'enos'],
      ['serafina', 'spritz'],
      ['adran', 'aldric'],
    ]);
  });

  it('keeps a saved order, a lone character in a rank included', () => {
    const saved = [['raybay', null], ['enos', 'serafina'], ['spritz', 'adran'], ['aldric', null]];
    expect(normalizeMarchingOrder(saved, ids)).toEqual(saved);
  });

  it('drops removed characters, repeats, and empty ranks, and adds new characters at the rear', () => {
    const saved = [['raybay', 'gone'], ['gone', null], ['enos', 'raybay']];
    expect(normalizeMarchingOrder(saved, ['raybay', 'enos', 'newcomer'])).toEqual([
      ['raybay', null],
      ['enos', 'newcomer'],
    ]);
  });

  it('ignores a malformed saved value', () => {
    expect(normalizeMarchingOrder({ not: 'a list' }, ['a', 'b', 'c'])).toEqual([['a', 'b'], ['c', null]]);
  });
});

describe('swapPlaces', () => {
  const order = [['raybay', 'enos'], ['serafina', 'spritz']];

  it('swaps two characters', () => {
    expect(swapPlaces(order, { rank: 0, place: 0 }, { rank: 1, place: 1 })).toEqual([
      ['spritz', 'enos'],
      ['serafina', 'raybay'],
    ]);
  });

  it('moves a character into a new rank past the rear', () => {
    expect(swapPlaces(order, { rank: 0, place: 1 }, { rank: 2, place: 0 })).toEqual([
      ['raybay', null],
      ['serafina', 'spritz'],
      ['enos', null],
    ]);
  });

  it('removes a rank left empty by a move', () => {
    const lone = [['raybay', null], ['enos', 'serafina']];
    expect(swapPlaces(lone, { rank: 0, place: 0 }, { rank: 1, place: 0 })).toEqual([
      ['enos', null],
      ['raybay', 'serafina'],
    ]);
    expect(swapPlaces([['raybay', null], ['enos', null]], { rank: 0, place: 0 }, { rank: 1, place: 1 })).toEqual([
      ['enos', 'raybay'],
    ]);
  });
});

describe('formatMarchingOrder', () => {
  it('labels the front and rear ranks', () => {
    const names: Record<string, string> = { raybay: 'Raybay', enos: 'Enos', adran: 'Adran' };
    expect(formatMarchingOrder([['raybay', 'enos'], ['adran', null]], (id) => names[id])).toBe(
      '- Rank 1 (front): Raybay and Enos\n- Rank 2 (rear): Adran'
    );
  });
});
