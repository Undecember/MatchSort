import { useEffect, useMemo, useReducer, useState } from 'react';
import { createSession, deriveSession } from '../ranking/session';
import { loadSession, resetStoredSession, saveSession, type LoadResult } from '../storage/sessionStorage';
import { reducer, type AppAction } from './reducer';

function readStorage(): LoadResult {
  try { return loadSession(window.localStorage); }
  catch { return { kind: 'unavailable', message: 'Browser storage is unavailable. Your progress is only kept in this tab.' }; }
}

export function useSession() {
  const [initial] = useState(readStorage);
  const [state, send] = useReducer(reducer, {
    record: initial.kind === 'loaded' ? initial.record : initial.kind === 'invalid' ? null : createSession([]),
    error: null,
  });
  const [recovery, setRecovery] = useState<LoadResult | null>(initial.kind === 'invalid' || initial.kind === 'unavailable' ? initial : null);
  const [writable, setWritable] = useState(initial.kind === 'loaded' || initial.kind === 'empty');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'unavailable'>('unsaved');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!state.record || !writable) return;
    try {
      const result = saveSession(window.localStorage, state.record);
      setSaveStatus(result.ok ? 'saved' : 'unsaved');
      setSaveMessage(result.ok ? null : result.message);
    } catch {
      setSaveStatus('unavailable');
      setSaveMessage('Browser storage is unavailable. Your progress is only kept in this tab.');
    }
  }, [state.record, writable, retryCount]);

  const dispatch = (action: AppAction) => {
    if (action.type === 'reset') {
      try {
        const result = resetStoredSession(window.localStorage);
        if (!result.ok) { setSaveMessage(result.message); return; }
        send({ type: 'restore', record: state.record ?? createSession([]) });
        setRecovery(null); setWritable(true); setRetryCount(value => value + 1);
      } catch { setSaveMessage('The saved session could not be reset. Check your browser storage settings.'); }
      return;
    }
    if (action.type === 'retry') {
      if (!writable) {
        const loaded = readStorage();
        if (loaded.kind === 'invalid' || loaded.kind === 'unavailable') { setRecovery(loaded); return; }
        if (loaded.kind === 'loaded') {
          if (!state.record?.items.length) send({ type: 'restore', record: loaded.record });
          else if (JSON.stringify(loaded.record) !== JSON.stringify(state.record)) {
            setRecovery({ kind: 'invalid', message: 'A different saved session is now available. Reload to restore it, or reset the saved session to keep the work in this tab.' });
            return;
          }
        }
        setRecovery(null); setWritable(true);
      }
      setRetryCount(value => value + 1);
      return;
    }
    send(action);
  };

  const blocked = recovery?.kind === 'invalid';
  const view = useMemo(() => state.record && !blocked ? deriveSession(state.record) : null, [state.record, blocked]);
  return { record: state.record, view, recovery, saveStatus, saveMessage, error: state.error, dispatch };
}
