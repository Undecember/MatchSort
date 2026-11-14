import { InvalidSessionError, type Item, type Pair, type ComparisonEvent } from './types';

export type Relations = {
  representatives: Map<string, string>;
  groups: Map<string, string[]>;
  below: Map<string, Set<string>>;
};

export function buildRelations(items: Item[], events: ComparisonEvent[]): Relations {
  const parent = new Map(items.map(item => [item.id, item.id]));
  if (parent.size !== items.length) throw new InvalidSessionError('Item IDs must be unique.');
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  for (const { pair, answer } of events) {
    if (!parent.has(pair.left) || !parent.has(pair.right) || pair.left === pair.right) {
      throw new InvalidSessionError();
    }
    if (answer === 'tie') parent.set(find(pair.right), find(pair.left));
  }
  const representatives = new Map(items.map(item => [item.id, find(item.id)]));
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const root = representatives.get(item.id)!;
    groups.set(root, [...(groups.get(root) ?? []), item.id]);
  }
  const edges = new Map([...groups.keys()].map(id => [id, new Set<string>()]));
  for (const { pair, answer } of events) {
    if (answer !== 'left' && answer !== 'right') continue;
    const winner = representatives.get(answer === 'left' ? pair.left : pair.right)!;
    const loser = representatives.get(answer === 'left' ? pair.right : pair.left)!;
    if (winner === loser) throw new InvalidSessionError();
    edges.get(winner)!.add(loser);
  }
  const below = new Map<string, Set<string>>();
  for (const root of groups.keys()) {
    const visited = new Set<string>();
    const pending = [...edges.get(root)!];
    while (pending.length) {
      const next = pending.pop()!;
      if (next === root) throw new InvalidSessionError();
      if (visited.has(next)) continue;
      visited.add(next);
      pending.push(...edges.get(next)!);
    }
    below.set(root, visited);
  }
  return { representatives, groups, below };
}

export function resolvePair(relations: Relations, pair: Pair): 'left' | 'right' | 'tie' | 'unknown' {
  const left = relations.representatives.get(pair.left);
  const right = relations.representatives.get(pair.right);
  if (left === undefined || right === undefined) throw new InvalidSessionError();
  if (left === right) return 'tie';
  if (relations.below.get(left)!.has(right)) return 'left';
  if (relations.below.get(right)!.has(left)) return 'right';
  return 'unknown';
}

export function orderedGroups(relations: Relations): string[][] | null {
  const roots = [...relations.groups.keys()].sort((a, b) => relations.below.get(b)!.size - relations.below.get(a)!.size);
  for (let i = 1; i < roots.length; i++) {
    if (!relations.below.get(roots[i - 1])!.has(roots[i])) return null;
  }
  return roots.map(id => [...relations.groups.get(id)!]);
}
