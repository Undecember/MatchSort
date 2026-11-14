import { validateSession } from '../ranking/session';
import type { SessionRecord } from '../ranking/types';

const KEY = 'matchsort.session';
export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; record: SessionRecord }
  | { kind: 'invalid' | 'unavailable'; message: string };
export type SaveResult = { ok: true } | { ok: false; message: string };

export function loadSession(storage: Storage): LoadResult {
  let bytes: string | null;
  try { bytes = storage.getItem(KEY); }
  catch { return { kind: 'unavailable', message: 'Browser storage is unavailable. Your progress is only kept in this tab.' }; }
  if (bytes === null) return { kind: 'empty' };
  try { return { kind: 'loaded', record: validateSession(JSON.parse(bytes)) }; }
  catch { return { kind: 'invalid', message: 'Your saved session could not be restored. It may be damaged or from another version. It has not been changed.' }; }
}

export function saveSession(storage: Storage, record: SessionRecord): SaveResult {
  try { storage.setItem(KEY, JSON.stringify(record)); return { ok: true }; }
  catch { return { ok: false, message: 'Progress could not be saved. Keep this tab open to retain your choices.' }; }
}

export function resetStoredSession(storage: Storage): SaveResult {
  try { storage.removeItem(KEY); return { ok: true }; }
  catch { return { ok: false, message: 'The saved session could not be reset. Check your browser storage settings and try again.' }; }
}
