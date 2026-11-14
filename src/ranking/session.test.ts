import { it, expect } from 'vitest';
import { createSession, deriveSession, answerSession, undoSession, validateSession } from './session';
import { buildRelations, resolvePair } from './relations';
import type { Answer, SessionRecord } from './types';

const start = (ids: string[]): SessionRecord => ({ ...createSession(ids.map(id => ({ id, label: id }))), started: true });
function answer(record: SessionRecord, choice: Answer): SessionRecord {
  const view = deriveSession(record);
  if (view.stage !== 'comparing') throw new Error('Expected a comparison');
  return answerSession(record, view.pair, choice);
}

it('skip selects another independent task then revisits the oldest necessary pair', () => {
  let record = start(['A', 'B', 'C', 'D']);
  record = answer(record, 'skip');
  expect(deriveSession(record)).toMatchObject({ stage: 'comparing', pair: { left: 'C', right: 'D' }, revisiting: false });
  record = answer(record, 'skip');
  expect(deriveSession(record)).toMatchObject({ stage: 'comparing', pair: { left: 'A', right: 'B' }, revisiting: true, decisionCount: 0 });
  record = answer(record, 'left');
  expect(deriveSession(record)).toMatchObject({ pair: { left: 'C', right: 'D' }, revisiting: true, decisionCount: 1 });
});

it('repeated sole-pair skip stays incomplete and can be undone exactly', () => {
  let record = start(['A', 'B']);
  for (let i = 0; i < 10; i++) {
    const before = record;
    record = answer(record, 'skip');
    expect(deriveSession(record)).toMatchObject({ stage: 'comparing', revisiting: true });
    expect(undoSession(record)).toEqual(before);
  }
});

it.each<Answer>(['left', 'right', 'tie', 'skip'])('undo restores the exact state before %s', choice => {
  const record = answer(start(['A', 'B', 'C', 'D']), 'skip');
  const next = answer(record, choice);
  expect(undoSession(next)).toEqual(record);
  expect(deriveSession(undoSession(next))).toEqual(deriveSession(record));
});

it('undo from completion restores its final pair and empty undo is harmless', () => {
  const record = start(['A', 'B']);
  expect(undoSession(record)).toEqual(record);
  const completed = answer(record, 'tie');
  expect(deriveSession(completed)).toEqual({ stage: 'complete', groups: [['A', 'B']], decisionCount: 1 });
  expect(deriveSession(undoSession(completed))).toEqual(deriveSession(record));
});

it('rejects stale expected pairs and cannot start fewer than two items', () => {
  const record = start(['A', 'B', 'C', 'D']);
  const next = answer(record, 'left');
  expect(() => answerSession(next, { left: 'A', right: 'B' }, 'right')).toThrow();
  expect(() => deriveSession(start(['A']))).toThrow();
});

it('ranks seeded weak orders, invalidates tied insertion bounds, and never asks an inferred comparison', () => {
  let seed = 914;
  for (let trial = 0; trial < 60; trial++) {
    const count = 3 + trial % 28;
    const ids = Array.from({ length: count }, (_, i) => String(i));
    const ranks = ids.map(() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 7; });
    let record = start(ids);
    for (let step = 0; step < count * count * 2; step++) {
      const view = deriveSession(record);
      if (view.stage === 'complete') {
        expect(view.groups.flat().slice().sort()).toEqual(ids.slice().sort());
        const expected = [...new Set(ranks)].sort((a, b) => a - b).map(rank => ids.filter((_, i) => ranks[i] === rank));
        expect(view.groups).toEqual(expected);
        break;
      }
      if (view.stage !== 'comparing') throw new Error('Unexpected editing');
      expect(resolvePair(buildRelations(record.items, record.events), view.pair)).toBe('unknown');
      if (step % 5 === 0 && !view.revisiting) record = answerSession(record, view.pair, 'skip');
      else {
        const a = ranks[Number(view.pair.left)], b = ranks[Number(view.pair.right)];
        record = answerSession(record, view.pair, a === b ? 'tie' : a < b ? 'left' : 'right');
      }
    }
    expect(deriveSession(record).stage).toBe('complete');
  }
});

it('drops a deferred pair when its relation becomes known and retains all learned preferences', () => {
  // A skipped A/C can become implied by A>B>C. This is a scheduler checkpoint,
  // intentionally constructed directly; external records require history replay.
  const record = start(['A', 'B', 'C', 'D']);
  record.events = [
    { pair: { left: 'A', right: 'C' }, answer: 'skip' },
    { pair: { left: 'A', right: 'B' }, answer: 'left' },
    { pair: { left: 'B', right: 'C' }, answer: 'left' },
  ];
  const view = deriveSession(record);
  expect(view.stage).toBe('comparing');
  if (view.stage === 'comparing') {
    expect(view.pair.left === 'D' || view.pair.right === 'D').toBe(true);
    expect(view.revisiting).toBe(false);
  }
});

it('JSON roundtrip preserves the pair, undo, and future behavior', () => {
  let record = answer(answer(start(['A', 'B', 'C', 'D', 'E']), 'skip'), 'tie');
  let restored = validateSession(JSON.parse(JSON.stringify(record)));
  for (let i = 0; i < 30; i++) {
    expect(deriveSession(restored)).toEqual(deriveSession(record));
    if (deriveSession(record).stage === 'complete') break;
    record = answer(record, 'left');
    restored = answer(restored, 'left');
  }
  expect(undoSession(restored)).toEqual(undoSession(record));
});
