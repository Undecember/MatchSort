# Graph Report - MatchSort  (2026-11-14)

## Corpus Check
- 26 files · ~10,535 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 173 nodes · 361 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c5d26ff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- session.ts
- types.ts
- App.tsx
- MatchSort design
- compilerOptions
- useSession.ts
- File map
- MemoryStorage
- MatchSort
- scripts

## God Nodes (most connected - your core abstractions)
1. `deriveSession()` - 18 edges
2. `createSession()` - 14 edges
3. `InvalidSessionError` - 13 edges
4. `answerSession()` - 12 edges
5. `compilerOptions` - 12 edges
6. `validateSession()` - 11 edges
7. `react` - 10 edges
8. `vitest` - 10 edges
9. `resolvePair()` - 10 edges
10. `MatchSort design` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Task 2: Comparison-efficient Ford–Johnson scheduler` --references--> `SortMachine`  [INFERRED]
  docs/superpowers/plans/2026-11-14-matchsort.md → src/ranking/fordJohnson.ts
- `Task 2: Comparison-efficient Ford–Johnson scheduler` --references--> `Relations`  [INFERRED]
  docs/superpowers/plans/2026-11-14-matchsort.md → src/ranking/relations.ts
- `Task 2: Comparison-efficient Ford–Johnson scheduler` --references--> `resolvePair()`  [INFERRED]
  docs/superpowers/plans/2026-11-14-matchsort.md → src/ranking/relations.ts
- `Task 1: Preference model and runnable TypeScript test harness` --references--> `orderedGroups()`  [INFERRED]
  docs/superpowers/plans/2026-11-14-matchsort.md → src/ranking/relations.ts
- `Task 3: Interactive sessions, ties, deferred comparisons, and undo` --references--> `SessionView`  [INFERRED]
  docs/superpowers/plans/2026-11-14-matchsort.md → src/ranking/session.ts

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (32): devDependencies, jsdom@^29.1.1, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.10, @types/node@^26.6.6, @types/react@^19.3.0, @types/react-dom@^19.3.0 (+24 more)

### Community 1 - "session.ts"
Cohesion: 0.23
Nodes (20): Task 1: Preference model and runnable TypeScript test harness, Task 4: Validated browser persistence and recovery, AppState, reducer(), SessionAction, buildRelations(), orderedGroups(), answerSession() (+12 more)

### Community 2 - "types.ts"
Cohesion: 0.20
Nodes (14): Task 2: Comparison-efficient Ford–Johnson scheduler, advanceMachine(), sort(), createMachine(), insertionOrder(), SortFrontier, SortMachine, permutations() (+6 more)

### Community 3 - "App.tsx"
Cohesion: 0.17
Nodes (15): dependencies, react@^19.3.1, react-dom@^19.3.1, react, react-dom, App(), copy, Comparison() (+7 more)

### Community 4 - "MatchSort design"
Cohesion: 0.13
Nodes (14): Approaches considered, Approval, Approved visual direction, Comparison, Goals and boundaries, Intent, Item entry, MatchSort design (+6 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 6 - "useSession.ts"
Cohesion: 0.33
Nodes (9): AppAction, readStorage(), useSession(), LoadResult, loadSession(), resetStoredSession(), SaveResult, saveSession() (+1 more)

### Community 7 - "File map"
Cohesion: 0.20
Nodes (9): File map, Global Constraints, MatchSort Implementation Plan, Review Focus, Self-review and execution handoff, Task 3: Interactive sessions, ties, deferred comparisons, and undo, Task 5: Approved React flow and accessible interactions, Task 6: Rendered verification, documentation, and final delivery (+1 more)

### Community 9 - "MatchSort"
Cohesion: 0.29
Nodes (6): How it works, MatchSort, Project structure, Run locally, Saved progress, Sorting engine

### Community 10 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, test, typecheck

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `package.json` to `session.ts`, `types.ts`, `useSession.ts`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08412698412698413 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App.tsx` to `package.json`, `useSession.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `MatchSort design` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `File map` connect `File map` to `session.ts`, `types.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._