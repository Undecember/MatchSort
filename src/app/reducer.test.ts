import { it, expect } from 'vitest';
import { reducer, type AppState } from './reducer';
import { createSession } from '../ranking/session';

it('is deterministic and does not mutate prior input or generate IDs internally', () => {
  const state: AppState = { record: createSession([]), error: null };
  const action = { type: 'add' as const, id: 'stable-id', label: '  Coffee  ' };
  expect(reducer(state, action)).toEqual(reducer(state, action));
  expect(state.record?.items).toEqual([]);
  expect(reducer(state, action).record?.items).toEqual([{ id: 'stable-id', label: 'Coffee' }]);
});

it('rejects duplicate and empty labels, and freezes a started list', () => {
  let state: AppState = { record: createSession([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]), error: null };
  expect(reducer(state, { type: 'add', id: 'c', label: ' A ' }).error).toBeTruthy();
  expect(reducer(state, { type: 'add', id: 'c', label: ' ' }).error).toBeTruthy();
  state = reducer(state, { type: 'start' });
  expect(reducer(state, { type: 'remove', id: 'a' }).record).toEqual(state.record);
});

it('rejects a rapid stale answer without consuming the next pair', () => {
  const initial = { ...createSession(['A', 'B', 'C', 'D'].map(id => ({ id, label: id }))), started: true };
  const state: AppState = { record: initial, error: null };
  const action = { type: 'answer' as const, pair: { left: 'A', right: 'B' }, answer: 'left' as const };
  const next = reducer(state, action);
  expect(reducer(next, action).record?.events).toHaveLength(1);
});
