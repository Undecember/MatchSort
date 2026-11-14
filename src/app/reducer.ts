import { answerSession, createSession, deriveSession, undoSession } from '../ranking/session';
import { InvalidSessionError, type Answer, type Pair, type SessionRecord } from '../ranking/types';

export type AppState = { record: SessionRecord | null; error: string | null };
export type SessionAction =
  | { type: 'add'; id: string; label: string }
  | { type: 'remove'; id: string }
  | { type: 'start' | 'undo' | 'restart' }
  | { type: 'answer'; pair: Pair; answer: Answer }
  | { type: 'restore'; record: SessionRecord };
export type AppAction = SessionAction | { type: 'reset' } | { type: 'retry' };

export function reducer(state: AppState, action: SessionAction): AppState {
  if (action.type === 'restore') return { record: action.record, error: null };
  const record = state.record;
  if (!record) return state;
  try {
    switch (action.type) {
      case 'add': {
        if (record.started) throw new InvalidSessionError('Start over before editing your list.');
        const label = action.label.trim();
        if (!label) throw new InvalidSessionError('Please enter an item.');
        if (record.items.some(item => item.label === label)) throw new InvalidSessionError('That item is already on your list.');
        return { record: createSession([...record.items, { id: action.id, label }]), error: null };
      }
      case 'remove':
        if (record.started) throw new InvalidSessionError('Start over before editing your list.');
        return { record: createSession(record.items.filter(item => item.id !== action.id)), error: null };
      case 'start': {
        const next = { ...record, started: true };
        deriveSession(next);
        return { record: next, error: null };
      }
      case 'answer': return { record: answerSession(record, action.pair, action.answer), error: null };
      case 'undo': return { record: undoSession(record), error: null };
      case 'restart': return { record: createSession(record.items), error: null };
    }
  } catch (error) {
    if (!(error instanceof InvalidSessionError)) throw error;
    return { ...state, error: error.message };
  }
}
