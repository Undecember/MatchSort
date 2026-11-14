import { useEffect, useRef, type MouseEvent } from 'react';
import type { Item, Pair, Answer } from '../ranking/types';

type Props = { items: Item[]; pair: Pair; decisionCount: number; revisiting: boolean; canUndo: boolean; onAnswer: (answer: Answer) => void; onUndo: () => void; onRestart: () => void };

export function Comparison({ items, pair, decisionCount, revisiting, canUndo, onAnswer, onUndo, onRestart }: Props) {
  const left = items.find(item => item.id === pair.left)!, right = items.find(item => item.id === pair.right)!;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, [pair.left, pair.right]);
  const choose = (answer: Answer, event: MouseEvent<HTMLButtonElement>) => { if (event.detail < 2) onAnswer(answer); };
  return <section key={JSON.stringify(pair)} className="panel" aria-label="Compare items">
    <div className="compare-top"><span className="muted">{items.length} items · {decisionCount} {decisionCount === 1 ? 'choice' : 'choices'} made</span><div className="actions"><button className="ghost" disabled={!canUndo} onClick={onUndo}>↶ Undo</button><button className="text-button" onClick={onRestart}>Start over</button></div></div>
    <div className="pairs"><button ref={first} className="pair" aria-label={`Choose ${left.label}`} onClick={event => choose('left', event)}><span className="pair-name">{left.label}</span><span className="choose">Choose this</span></button><span className="versus" aria-hidden="true">or</span><button className="pair" aria-label={`Choose ${right.label}`} onClick={event => choose('right', event)}><span className="pair-name">{right.label}</span><span className="choose">Choose this</span></button></div>
    <div className="secondary"><button className="ghost" onClick={event => choose('tie', event)}>They’re tied</button><button className="ghost" onClick={event => choose('skip', event)}>Skip for now <span aria-hidden="true">→</span></button></div>
    {revisiting && <p className="revisit" role="status">This pair is needed to finish. There are no other comparisons available right now; you can still skip and decide later.</p>}
    <p className="hint">Ties share a rank. Skipped pairs may return later.</p>
  </section>;
}
