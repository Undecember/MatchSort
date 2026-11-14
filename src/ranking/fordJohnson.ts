import { resolvePair, type Relations } from './relations';
import type { Pair } from './types';

// A machine is a serializable recipe. Re-evaluation against known preferences
// reconstructs the dependency frontier; no suspended JavaScript generator is saved.
export type SortMachine = { groupIds: string[] };
export type SortFrontier = { machine: SortMachine; runnable: Pair[]; result: string[] | null };

export const createMachine = (groupIds: string[]): SortMachine => ({ groupIds: [...groupIds] });

// One-based b-indices: b1 is already in the main chain; insert b3,b2,b5,b4,…
function insertionOrder(count: number): number[] {
  const order: number[] = [];
  let previous = 1;
  let boundary = 3;
  let older = 1;
  while (previous < count) {
    for (let i = Math.min(boundary, count); i > previous; i--) order.push(i);
    [older, boundary, previous] = [boundary, boundary + 2 * older, boundary];
  }
  return order;
}

export function advanceMachine(machine: SortMachine, relations: Relations): SortFrontier {
  const runnable: Pair[] = [];
  // Internally order from least to most preferred. Each pair's more-preferred
  // anchor bounds insertion of its partner; reverse only the final output.
  function sort(ids: string[]): string[] | null {
    if (ids.length <= 1) return [...ids];
    const partners = new Map<string, string>();
    const anchors: string[] = [];
    let blocked = false;
    for (let i = 0; i + 1 < ids.length; i += 2) {
      const pair = { left: ids[i], right: ids[i + 1] };
      const answer = resolvePair(relations, pair);
      if (answer === 'unknown') {
        runnable.push(pair);
        blocked = true;
      } else {
        const anchor = answer === 'left' ? pair.left : pair.right;
        const partner = answer === 'left' ? pair.right : pair.left;
        anchors.push(anchor);
        partners.set(anchor, partner);
      }
    }
    // These initial pairs are independent. Recursive sorting depends on all
    // their anchors, so skipping may advance a sibling but never a dependent task.
    if (blocked) return null;
    const sortedAnchors = sort(anchors);
    if (sortedAnchors === null) return null;
    const chain = [partners.get(sortedAnchors[0])!, ...sortedAnchors];
    const pending = sortedAnchors.map(anchor => ({ id: partners.get(anchor)!, anchor }));
    if (ids.length % 2) pending.push({ id: ids[ids.length - 1], anchor: '' });
    for (const index of insertionOrder(pending.length)) {
      const next = pending[index - 1];
      let low = 0;
      let high = next.anchor ? chain.indexOf(next.anchor) : chain.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const pair = { left: next.id, right: chain[mid] };
        const answer = resolvePair(relations, pair);
        if (answer === 'unknown') {
          runnable.push(pair);
          return null;
        }
        if (answer === 'left') low = mid + 1;
        else high = mid;
      }
      chain.splice(low, 0, next.id);
    }
    return chain;
  }
  const sorted = sort(machine.groupIds);
  return { machine, runnable, result: sorted === null ? null : sorted.reverse() };
}
