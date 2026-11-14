export type Item = { id: string; label: string };
export type Pair = { left: string; right: string };
export type Answer = 'left' | 'right' | 'tie' | 'skip';
export type ComparisonEvent = { pair: Pair; answer: Answer };
export type SessionRecord = {
  version: 1;
  items: Item[];
  started: boolean;
  events: ComparisonEvent[];
};

export class InvalidSessionError extends Error {
  constructor(message = 'This session contains an invalid choice. Use Undo to revise a previous choice.') {
    super(message);
    this.name = 'InvalidSessionError';
  }
}

export const samePair = (a: Pair, b: Pair): boolean => a.left === b.left && a.right === b.right;
