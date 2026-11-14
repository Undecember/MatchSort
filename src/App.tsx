import { useState } from 'react';
import { useSession } from './app/useSession';
import { ItemEditor } from './components/ItemEditor';
import { Comparison } from './components/Comparison';
import { Results } from './components/Results';
import { RestartDialog } from './components/RestartDialog';
import './styles.css';

const copy = {
  editing: ['Your items. Your order.', 'Add what you want to rank. We’ll help you sort out the rest.'],
  comparing: ['Which one wins?', 'Choose the one you prefer. It’s okay to love them equally.'],
  complete: ['Everything in its place.', 'A complete ranking, based on your choices.'],
};

export default function App() {
  const { record, view, recovery, saveStatus, saveMessage, error, dispatch } = useSession();
  const [restart, setRestart] = useState(false);
  const stage = view?.stage ?? 'editing';
  const blocked = recovery?.kind === 'invalid';
  const warning = saveMessage ?? (recovery?.kind === 'unavailable' ? recovery.message : null);
  return <>
    <header className="site-header"><a className="brand" href="./" aria-label="MatchSort home">Match<span>Sort</span><span aria-hidden="true"> ↗</span></a><span className={`save-badge ${warning || blocked ? 'save-warning' : ''}`} role="status"><span className="save-dot" aria-hidden="true" />{blocked ? 'Saved session needs attention' : warning ? 'Not saved' : saveStatus === 'saved' ? 'Saved in this browser' : 'Saving…'}</span></header>
    <main>
      <div className="eyebrow">A little clarity, one choice at a time</div><h1>{blocked ? 'Let’s recover your list.' : copy[stage][0]}</h1><p className="intro">{blocked ? 'Your saved data is still here. You choose what happens next.' : copy[stage][1]}</p>
      {!blocked && <ol className="steps" aria-label="Ranking stages">{(['editing', 'comparing', 'complete'] as const).map((name, i) => <li key={name} className={stage === name ? 'active' : ''} aria-current={stage === name ? 'step' : undefined}><span aria-hidden="true">0{i + 1} &nbsp;</span>{['Your items', 'Compare', 'Your ranking'][i]}</li>)}</ol>}
      {blocked ? <section className="panel recovery"><h2>Saved session needs attention</h2><p>{recovery.message}</p>{saveMessage && <p role="alert" className="error">{saveMessage}</p>}<button className="primary" onClick={() => dispatch({ type: 'reset' })}>Reset saved session</button></section> : record && view && <>
        {view.stage === 'editing' && <ItemEditor items={record.items} error={error} onAdd={label => dispatch({ type: 'add', id: crypto.randomUUID(), label })} onRemove={id => dispatch({ type: 'remove', id })} onStart={() => dispatch({ type: 'start' })} />}
        {view.stage === 'comparing' && <Comparison items={record.items} pair={view.pair} decisionCount={view.decisionCount} revisiting={view.revisiting} canUndo={record.events.length > 0} onAnswer={answer => dispatch({ type: 'answer', pair: view.pair, answer })} onUndo={() => dispatch({ type: 'undo' })} onRestart={() => setRestart(true)} />}
        {view.stage === 'complete' && <Results items={record.items} groups={view.groups} decisionCount={view.decisionCount} onUndo={() => dispatch({ type: 'undo' })} onRestart={() => setRestart(true)} />}
        {error && view.stage !== 'editing' && <p className="error" role="alert">{error}</p>}
      </>}
      {warning && !blocked && <div className="storage-warning"><p role="status">{warning}</p><button className="ghost" onClick={() => dispatch({ type: 'retry' })}>Retry saving</button></div>}
      {!blocked && <p className="caption">{stage === 'comparing' ? 'One pair at a time. No need to decide everything at once.' : 'Simple lists. Thoughtful choices. A ranking that feels like you.'}</p>}
      <footer>Made for your preferences.<span aria-hidden="true"> · </span>Kept in your browser.</footer>
    </main>
    {restart && <RestartDialog onCancel={() => setRestart(false)} onConfirm={() => { dispatch({ type: 'restart' }); setRestart(false); }} />}
  </>;
}
