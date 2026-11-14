import { it, expect } from 'vitest';
import { createMachine, advanceMachine } from './fordJohnson';
import { buildRelations } from './relations';
import type { ComparisonEvent } from './types';

function* permutations(values: number[]): Generator<number[]> {
  if (!values.length) { yield []; return; }
  for (let i = 0; i < values.length; i++) {
    for (const rest of permutations(values.filter((_, index) => index !== i))) yield [values[i], ...rest];
  }
}

function sort(values: number[]) {
  const items = values.map(value => ({ id: String(value), label: String(value) }));
  const machine = createMachine(items.map(item => item.id));
  const events: ComparisonEvent[] = [];
  const asked = new Set<string>();
  for (let count = 0; count <= values.length * values.length; count++) {
    const frontier = advanceMachine(machine, buildRelations(items, events));
    if (frontier.result) return { result: frontier.result.map(Number), count: events.length };
    const pair = frontier.runnable[0];
    expect(pair).toBeDefined();
    const key = [pair.left, pair.right].sort().join(':');
    expect(asked.has(key)).toBe(false);
    asked.add(key);
    events.push({ pair, answer: Number(pair.left) < Number(pair.right) ? 'left' : 'right' });
  }
  throw new Error('Sort failed to terminate');
}

it('sorts every permutation through eight items with Ford–Johnson worst-case counts and no repeated pair', () => {
  const maxima = [];
  for (let n = 0; n <= 8; n++) {
    let maximum = 0;
    for (const input of permutations(Array.from({ length: n }, (_, i) => i))) {
      const output = sort(input);
      expect(output.result).toEqual(Array.from({ length: n }, (_, i) => i));
      maximum = Math.max(maximum, output.count);
    }
    maxima.push(maximum);
    const theoretical = Array.from({ length: n }, (_, i) => Math.ceil(Math.log2(3 * (i + 1) / 4))).reduce((a, b) => a + b, 0);
    expect(maximum).toBe(theoretical);
  }
  expect(maxima).toEqual([0, 0, 1, 3, 5, 7, 10, 13, 16]);
}, 60000);

it('exposes independent initial pair tasks without mutating its deterministic serializable machine', () => {
  const ids = ['A', 'B', 'C', 'D', 'E'];
  const machine = createMachine(ids);
  const before = JSON.stringify(machine);
  const relations = buildRelations(ids.map(id => ({ id, label: id })), []);
  const expected = [{ left: 'A', right: 'B' }, { left: 'C', right: 'D' }];
  expect(advanceMachine(machine, relations).runnable).toEqual(expected);
  expect(advanceMachine(JSON.parse(before), relations).runnable).toEqual(expected);
  expect(JSON.stringify(machine)).toBe(before);
});

it('handles seeded larger and odd-size inputs within the comparison bound', () => {
  let seed = 301;
  for (const n of [9, 11, 17, 32, 63, 100]) {
    const input = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [input[i], input[j]] = [input[j], input[i]];
    }
    const output = sort(input);
    expect(output.result).toEqual(Array.from({ length: n }, (_, i) => i));
    const bound = Array.from({ length: n }, (_, i) => Math.ceil(Math.log2(3 * (i + 1) / 4))).reduce((a, b) => a + b, 0);
    expect(output.count).toBeLessThanOrEqual(bound);
  }
});
