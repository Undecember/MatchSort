import { useEffect, useRef } from 'react';
import type { Item } from '../ranking/types';

export function Results({ items, groups, decisionCount, onUndo, onRestart }: { items: Item[]; groups: string[][]; decisionCount: number; onUndo: () => void; onRestart: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  let rank = 1;
  const labels = new Map(items.map(item => [item.id, item.label]));
  return <section className="panel" aria-label="Completed ranking"><div className="panel-head"><h2 ref={heading} tabIndex={-1}>Your ranking</h2><span className="muted">{items.length} items · complete</span></div>
    <ol className="ranking" aria-label="Ranked items">{groups.map(group => {
      const position = rank; rank += group.length;
      return <li key={group[0]} value={position}><span className="rank" aria-label={`Rank ${position}`}>{position}</span><div className="result-group">{group.map(id => <span className={group.length > 1 ? 'chip' : 'item-name'} key={id}>{labels.get(id)}</span>)}</div>{group.length > 1 && <span className="muted tied">Tied</span>}</li>;
    })}</ol>
    <p className="note">{decisionCount} {decisionCount === 1 ? 'choice' : 'choices'} made. Equal preferences share the same position.</p>
    <div className="panel-foot results-foot"><button className="ghost" onClick={onUndo}>↶ Undo last choice</button><button className="primary" onClick={onRestart}>Start over</button></div>
  </section>;
}
