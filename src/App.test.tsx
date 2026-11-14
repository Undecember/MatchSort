// @vitest-environment jsdom
import './test/setup';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createSession, deriveSession, answerSession } from './ranking/session';
import type { SessionRecord } from './ranking/types';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
const itemInput = () => screen.getByRole('textbox', { name: 'New item' });
async function add(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(itemInput(), text);
  await user.click(screen.getByRole('button', { name: 'Add' }));
}
function saved(ids: string[], started = false) {
  const record = { ...createSession(ids.map(id => ({ id, label: id }))), started };
  localStorage.setItem('matchsort.session', JSON.stringify(record));
  return record;
}

it('adds by Enter or button, validates input, removes items, and enables Start only with two items', async () => {
  const user = userEvent.setup(); render(<App />);
  expect(screen.getByRole('button', { name: /Start comparing/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/enter an item/i);
  await user.type(itemInput(), '  Coffee  {Enter}');
  expect(screen.getByText('Coffee', { selector: '.item-name' })).toBeInTheDocument();
  await add(user, 'Coffee');
  expect(screen.getByRole('alert')).toHaveTextContent(/already/i);
  await user.clear(itemInput());
  await add(user, 'Ocean');
  expect(screen.getByRole('button', { name: /Start comparing/ })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Remove Coffee' }));
  expect(screen.getByRole('button', { name: /Start comparing/ })).toBeDisabled();
  expect(itemInput()).toHaveFocus();
});

it('supports skip, forced revisit, ties, completion undo, and exact reload', async () => {
  saved(['A', 'B']); const user = userEvent.setup(); const mounted = render(<App />);
  await user.click(screen.getByRole('button', { name: /Start comparing/ }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Skip for now/ }));
  expect(screen.getByText(/needed to finish/i)).toBeInTheDocument();
  const bytes = localStorage.getItem('matchsort.session');
  mounted.unmount(); render(<App />);
  expect(localStorage.getItem('matchsort.session')).toBe(bytes);
  expect(screen.getByText(/needed to finish/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /They’re tied/ }));
  expect(screen.getByRole('heading', { name: 'Your ranking' })).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Ranked items' })).getAllByRole('listitem')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: /Undo/ }));
  expect(screen.getByRole('button', { name: 'Choose A' })).toBeInTheDocument();
});

it.each(['A', 'B'])('records a winner from either side (%s)', async winner => {
  saved(['A', 'B'], true); const user = userEvent.setup(); render(<App />);
  await user.click(screen.getByRole('button', { name: `Choose ${winner}` }));
  const rows = within(screen.getByRole('list', { name: 'Ranked items' })).getAllByRole('listitem');
  expect(rows[0]).toHaveTextContent(winner);
});

it('confirms restart, returns focus on cancel, and retains the editable list', async () => {
  saved(['A', 'B'], true); const user = userEvent.setup(); render(<App />);
  const restart = screen.getByRole('button', { name: 'Start over' });
  await user.click(restart);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(restart).toHaveFocus();
  await user.click(restart);
  await user.click(screen.getByRole('button', { name: 'Start over and edit list' }));
  expect(itemInput()).toBeInTheDocument();
  expect(screen.getByText('A', { selector: '.item-name' })).toBeInTheDocument();
});

it('does not overwrite invalid saved data before explicit reset', async () => {
  localStorage.setItem('matchsort.session', '{broken'); const user = userEvent.setup(); render(<App />);
  expect(screen.getByText(/could not be restored/i)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(localStorage.getItem('matchsort.session')).toBe('{broken');
  await user.click(screen.getByRole('button', { name: 'Reset saved session' }));
  expect(itemInput()).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('matchsort.session')!).items).toEqual([]);
});

it('preserves in-memory work when saving fails and reports recovery accurately', async () => {
  const user = userEvent.setup(); render(<App />);
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  await add(user, 'Retain me');
  expect(screen.getByText('Retain me', { selector: '.item-name' })).toBeInTheDocument();
  expect(screen.getByText(/could not be saved/i)).toBeInTheDocument();
  expect(screen.queryByText('Saved in this browser')).not.toBeInTheDocument();
  Storage.prototype.setItem = original;
  await user.click(screen.getByRole('button', { name: 'Retry saving' }));
  expect(screen.getByText('Saved in this browser')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('matchsort.session')!).items[0].label).toBe('Retain me');
});

it('allows in-memory work when acquiring localStorage throws', async () => {
  const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Denied'); });
  const user = userEvent.setup(); render(<App />);
  await add(user, 'Still works');
  expect(screen.getByText('Still works', { selector: '.item-name' })).toBeInTheDocument();
  expect(screen.getByText(/only kept in this tab/i)).toBeInTheDocument();
  getter.mockRestore();
});

it('renders text literally, supports Korean and emoji, and ranks ties 1,2,2,4', async () => {
  const ids = ['<script>alert(1)</script>', '바다 🌊', 'Coffee', 'Walks'];
  const ranks = [0, 1, 1, 2];
  let record: SessionRecord = { ...createSession(ids.map((label, i) => ({ id: String(i), label }))), started: true };
  while (true) {
    const view = deriveSession(record);
    if (view.stage !== 'comparing') break;
    const a = ranks[Number(view.pair.left)], b = ranks[Number(view.pair.right)];
    record = answerSession(record, view.pair, a === b ? 'tie' : a < b ? 'left' : 'right');
  }
  localStorage.setItem('matchsort.session', JSON.stringify(record)); render(<App />);
  expect(screen.getByText(ids[0])).toBeInTheDocument(); expect(screen.getByText(ids[1])).toBeInTheDocument();
  const rows = within(screen.getByRole('list', { name: 'Ranked items' })).getAllByRole('listitem');
  expect(rows.map(row => row.querySelector('.rank')?.textContent)).toEqual(['1', '2', '4']);
  expect(within(rows[1]).getByText('바다 🌊')).toBeInTheDocument();
  expect(rows[1].textContent!.indexOf('바다 🌊')).toBeLessThan(rows[1].textContent!.indexOf('Coffee'));
});

it('StrictMode and rapid stale clicks do not duplicate answers', () => {
  saved(['A', 'B', 'C', 'D'], true); render(<StrictMode><App /></StrictMode>);
  const firstButton = screen.getByRole('button', { name: 'Choose A' });
  fireEvent.click(firstButton); fireEvent.click(firstButton);
  expect(JSON.parse(localStorage.getItem('matchsort.session')!).events).toHaveLength(1);
});

it('ignores the second click of a pointer double-click', async () => {
  saved(['A', 'B', 'C', 'D'], true); const user = userEvent.setup(); render(<App />);
  await user.dblClick(screen.getByRole('button', { name: 'Choose A' }));
  expect(JSON.parse(localStorage.getItem('matchsort.session')!).events).toHaveLength(1);
});
