import { createMachine, advanceMachine } from './fordJohnson';
import { buildRelations, orderedGroups, resolvePair } from './relations';
import { InvalidSessionError, samePair, type Item, type Pair, type Answer, type SessionRecord } from './types';

export type SessionView =
  | { stage: 'editing' }
  | { stage: 'comparing'; pair: Pair; decisionCount: number; revisiting: boolean }
  | { stage: 'complete'; groups: string[][]; decisionCount: number };

function validateItems(items: Item[]): void {
  const ids = new Set<string>(), labels = new Set<string>();
  for (const item of items) {
    if (!item.id || !item.label.trim() || item.label !== item.label.trim() || ids.has(item.id) || labels.has(item.label)) {
      throw new InvalidSessionError('Items must have unique IDs and nonempty, unique labels.');
    }
    ids.add(item.id); labels.add(item.label);
  }
}

export function createSession(items: Item[]): SessionRecord {
  validateItems(items);
  return { version: 1, items: items.map(item => ({ ...item })), started: false, events: [] };
}

const pairKey = (pair: Pair): string => JSON.stringify([pair.left, pair.right].sort());

export function deriveSession(record: SessionRecord): SessionView {
  if (!record.started) return { stage: 'editing' };
  if (record.items.length < 2) throw new InvalidSessionError('Add at least two items to start.');
  const relations = buildRelations(record.items, record.events);
  const decisionCount = record.events.filter(event => event.answer !== 'skip').length;
  const groups = orderedGroups(relations);
  if (groups) return { stage: 'complete', groups, decisionCount };
  const frontier = advanceMachine(createMachine([...relations.groups.keys()]), relations);
  // Reconstruct a FIFO of still-unknown deferred relationships. Equivalence
  // representatives may have changed since a pair was skipped.
  const deferred: string[] = [];
  for (const event of record.events) {
    if (event.answer !== 'skip' || resolvePair(relations, event.pair) !== 'unknown') continue;
    const key = pairKey({
      left: relations.representatives.get(event.pair.left)!,
      right: relations.representatives.get(event.pair.right)!,
    });
    const previous = deferred.indexOf(key);
    if (previous >= 0) deferred.splice(previous, 1);
    deferred.push(key);
  }
  const fresh = frontier.runnable.find(pair => !deferred.includes(pairKey(pair)));
  const revisited = deferred.map(key => frontier.runnable.find(pair => pairKey(pair) === key)).find(pair => pair !== undefined);
  const pair = fresh ?? revisited;
  if (!pair) throw new InvalidSessionError('The comparison schedule could not be restored.');
  return { stage: 'comparing', pair, decisionCount, revisiting: !fresh };
}

export function answerSession(record: SessionRecord, expectedPair: Pair, answer: Answer): SessionRecord {
  const view = deriveSession(record);
  if (view.stage !== 'comparing' || !samePair(view.pair, expectedPair)) {
    throw new InvalidSessionError('That comparison has already changed. Please answer the current pair.');
  }
  const next = { ...record, events: [...record.events, { pair: { ...expectedPair }, answer }] };
  buildRelations(next.items, next.events);
  return next;
}

export const undoSession = (record: SessionRecord): SessionRecord => ({ ...record, events: record.events.slice(0, -1) });

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateSession(value: unknown): SessionRecord {
  if (!object(value) || value.version !== 1 || typeof value.started !== 'boolean' || !Array.isArray(value.items) || !Array.isArray(value.events)) {
    throw new InvalidSessionError('This saved session is invalid or uses an unsupported version.');
  }
  for (const item of value.items) {
    if (!object(item) || typeof item.id !== 'string' || typeof item.label !== 'string') throw new InvalidSessionError();
  }
  for (const event of value.events) {
    if (!object(event) || !object(event.pair) || typeof event.pair.left !== 'string' || typeof event.pair.right !== 'string'
      || !['left', 'right', 'tie', 'skip'].includes(event.answer as string)) throw new InvalidSessionError();
  }
  const record = value as unknown as SessionRecord;
  validateItems(record.items);
  if (!record.started && record.events.length) throw new InvalidSessionError();
  let replay: SessionRecord = { ...createSession(record.items), started: record.started };
  deriveSession(replay);
  for (const event of record.events) replay = answerSession(replay, event.pair, event.answer);
  return replay;
}
