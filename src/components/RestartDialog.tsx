import { useEffect, useRef } from 'react';

export function RestartDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current!;
    // jsdom does not implement showModal; the semantic fallback is only for tests.
    if (typeof node.showModal === 'function') node.showModal(); else node.setAttribute('open', '');
    cancel.current?.focus();
    return () => { node.close?.(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="restart-title" aria-describedby="restart-description" onCancel={event => { event.preventDefault(); onCancel(); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); onCancel(); } }}>
    <h2 id="restart-title">Start fresh?</h2><p id="restart-description">Your choices will be cleared. Your items will stay so you can edit the list and rank it again.</p>
    <div className="dialog-actions"><button ref={cancel} className="ghost" onClick={onCancel}>Keep sorting</button><button className="primary" onClick={onConfirm}>Start over and edit list</button></div>
  </dialog>;
}
