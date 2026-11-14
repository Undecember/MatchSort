import { describe, it, expect } from 'vitest';
import { buildRelations, resolvePair, orderedGroups } from './relations';
import type { ComparisonEvent } from './types';

const items = ['A', 'B', 'C'].map(id => ({ id, label: id }));
const event = (left: string, right: string, answer: ComparisonEvent['answer']): ComparisonEvent => ({ pair: { left, right }, answer });
describe('preference relations', () => {
  it('infers strict transitivity', () => {
    const r = buildRelations(items, [event('A', 'B', 'left'), event('B', 'C', 'left')]);
    expect(resolvePair(r, { left: 'A', right: 'C' })).toBe('left');
    expect(orderedGroups(r)).toEqual([['A'], ['B'], ['C']]);
  });
  it('propagates ties and preserves input order within a group', () => {
    const r = buildRelations(items, [event('B', 'A', 'tie'), event('B', 'C', 'left')]);
    expect(resolvePair(r, { left: 'C', right: 'A' })).toBe('right');
    expect(orderedGroups(r)).toEqual([['A', 'B'], ['C']]);
  });
  it('rejects cycles and contradictory ties', () => {
    const wins = [event('A', 'B', 'left'), event('B', 'C', 'left')];
    expect(() => buildRelations(items, [...wins, event('C', 'A', 'left')])).toThrow();
    expect(() => buildRelations(items, [...wins, event('A', 'C', 'tie')])).toThrow();
  });
  it('skip creates no relation and unknown groups are not a ranking', () => {
    const r = buildRelations(items, [event('A', 'B', 'skip')]);
    expect(resolvePair(r, { left: 'A', right: 'B' })).toBe('unknown');
    expect(orderedGroups(r)).toBeNull();
  });
  it('rejects unknown or identical pair IDs', () => {
    expect(() => buildRelations(items, [event('A', 'X', 'left')])).toThrow();
    expect(() => buildRelations(items, [event('A', 'A', 'skip')])).toThrow();
  });
});
