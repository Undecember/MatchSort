import { it, expect } from 'vitest';
import { loadSession, saveSession, resetStoredSession } from './sessionStorage';
import { answerSession, createSession, deriveSession, undoSession } from '../ranking/session';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
const items = ['A', 'B', 'C', 'D'].map(id => ({ id, label: id }));

it('restores the exact pair and history after skip, tie, and undo', () => {
  const storage = new MemoryStorage();
  let record = { ...createSession(items), started: true };
  record = answerSession(record, { left: 'A', right: 'B' }, 'skip');
  record = answerSession(record, { left: 'C', right: 'D' }, 'tie');
  record = undoSession(record);
  expect(saveSession(storage, record)).toEqual({ ok: true });
  const loaded = loadSession(storage);
  expect(loaded).toEqual({ kind: 'loaded', record });
  if (loaded.kind === 'loaded') expect(deriveSession(loaded.record)).toEqual(deriveSession(record));
});

it.each([
  '{broken',
  JSON.stringify({ version: 99, items: [], started: false, events: [] }),
  JSON.stringify({ version: 1, items: [] }),
  JSON.stringify({ version: 1, items: [items[0], items[0]], started: true, events: [] }),
  JSON.stringify({ version: 1, items, started: true, events: [{ pair: { left: 'A', right: 'D' }, answer: 'left' }] }),
  JSON.stringify({ version: 1, items, started: false, events: [{ pair: { left: 'A', right: 'B' }, answer: 'left' }] }),
])('rejects malformed or impossible history without overwriting saved bytes (%s)', bytes => {
  const storage = new MemoryStorage();
  storage.setItem('matchsort.session', bytes);
  expect(loadSession(storage).kind).toBe('invalid');
  expect(storage.getItem('matchsort.session')).toBe(bytes);
});

it('distinguishes absent storage from an unavailable read', () => {
  const storage = new MemoryStorage();
  expect(loadSession(storage)).toEqual({ kind: 'empty' });
  storage.getItem = () => { throw new Error('Blocked'); };
  expect(loadSession(storage).kind).toBe('unavailable');
});

it('reports quota failures without changing the in-memory record', () => {
  const storage = new MemoryStorage();
  const record = createSession(items);
  const before = JSON.stringify(record);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  expect(saveSession(storage, record).ok).toBe(false);
  expect(JSON.stringify(record)).toBe(before);
});

it('explicit reset removes only this app session and reports reset failure', () => {
  const storage = new MemoryStorage();
  storage.setItem('other-app', 'keep');
  saveSession(storage, createSession(items));
  expect(resetStoredSession(storage)).toEqual({ ok: true });
  expect(loadSession(storage)).toEqual({ kind: 'empty' });
  expect(storage.getItem('other-app')).toBe('keep');
  storage.removeItem = () => { throw new Error('Blocked'); };
  expect(resetStoredSession(storage).ok).toBe(false);
});
