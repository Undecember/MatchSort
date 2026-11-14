import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Item } from '../ranking/types';

type Props = { items: Item[]; error: string | null; onAdd: (label: string) => void; onRemove: (id: string) => void; onStart: () => void };

export function ItemEditor({ items, error, onAdd, onRemove, onStart }: Props) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault(); onAdd(value);
    if (value.trim() && !items.some(item => item.label === value.trim())) setValue('');
    input.current?.focus();
  };
  return <section className="panel" aria-label="Item editor">
    <div className="panel-head"><h2>Your list</h2><span className="muted">{items.length} {items.length === 1 ? 'item' : 'items'}</span></div>
    <form className="add-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="new-item">New item</label>
      <input ref={input} id="new-item" value={value} onChange={event => setValue(event.target.value)} placeholder="Add an item…" autoComplete="off" aria-invalid={!!error} aria-describedby={error ? 'input-error' : undefined} />
      <button className="primary" type="submit"><span aria-hidden="true">+ </span>Add</button>
    </form>
    {error && <p className="error" role="alert" id="input-error">{error}</p>}
    {items.length ? <ul className="item-list" aria-label="Your items">{items.map((item, index) => <li key={item.id}>
      <span className="index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="item-name">{item.label}</span>
      <button className="remove" aria-label={`Remove ${item.label}`} onClick={() => { onRemove(item.id); input.current?.focus(); }}>Remove</button>
    </li>)}</ul> : <div className="empty"><span aria-hidden="true" className="empty-icon">↗</span><p>A good ranking starts with a list.</p><span className="muted">Add at least two things you’d like to compare.</span></div>}
    <div className="panel-foot"><span className="note">You can edit this list until sorting begins.</span><button className="primary" disabled={items.length < 2} onClick={onStart}>Start comparing <span aria-hidden="true">→</span></button></div>
  </section>;
}
