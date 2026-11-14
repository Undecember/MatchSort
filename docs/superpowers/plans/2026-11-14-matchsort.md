# MatchSort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the approved browser-only item sorter with comparison-efficient ranking, ties, skip, undo, and reliable local resume.

**Architecture:** A pure TypeScript ranking engine drives a React interface through a versioned action log. The engine maintains equality groups, inferred strict preferences, and an explicit resumable Ford–Johnson task schedule. Storage is an adapter outside reducers; application views are derived from validated session records.

**Tech Stack:** TypeScript, React, Vite, plain CSS; Vitest for engine/storage tests and React Testing Library with jsdom for integration tests. npm and a committed lockfile.

**Spec:** `docs/superpowers/specs/2026-11-14-matchsort-design.md`

## Global Constraints

- "Keep everything in the browser, without accounts, backend services, or item uploads."
- "The first version handles plain text items and one active ranking."
- "Skip must not be passed to a comparator as an ordering result."
- "Never emit an arbitrary topological order as a complete personal ranking."
- "Within a tie group, preserve original input order without implying preference."
- "Undo removes the latest submitted comparison action, including skip, restoring the exact pair and state immediately before that action."
- "Data remains local to the same browser and origin; it does not synchronize across devices."
- "Unknown schema versions or invalid data must not crash the page or be silently overwritten."
- Use port 8084, host `0.0.0.0`, and strict port binding for development. Stop only the owned visual companion before using that port.
- No new product capabilities beyond the spec. No dependency on external assets or services at runtime.

## Review Focus

- A tie between previously separate groups can invalidate pending insertion bounds; rebuild planning from known group relations (Task 3).
- Repeated skip with no independent task must remain incomplete and explain the revisit, without an infinite internal scheduler loop (Task 3).
- Malformed but valid JSON can include impossible action history; reject it without overwriting the saved bytes (Task 4).
- Rapid clicks and StrictMode must not submit duplicate answers or generate duplicate IDs (Task 5).
- Long labels, non-Latin text, and HTML-looking text must remain readable literal text at a narrow viewport (Tasks 5–6).

## File map

- `package.json`, `package-lock.json`, `index.html`, `tsconfig*.json`, `vite.config.ts`, `.gitignore`: build, test, and development configuration.
- `src/main.tsx`: React entry point; `src/App.tsx`: view orchestration; `src/styles.css`: approved visual system and responsive rules.
- `src/ranking/types.ts`: shared engine/session types.
- `src/ranking/relations.ts`: equality groups, strict preferences, transitive inference, contradiction checks.
- `src/ranking/fordJohnson.ts`: explicit task scheduler and Jacobsthal insertion ordering.
- `src/ranking/session.ts`: deterministic action replay, skip scheduling, undo, completion.
- `src/storage/sessionStorage.ts`: versioned localStorage loading and saving.
- `src/app/reducer.ts`, `src/app/useSession.ts`: immutable UI transitions and persistence lifecycle.
- `src/components/ItemEditor.tsx`, `Comparison.tsx`, `Results.tsx`, `RestartDialog.tsx`: focused accessible views.
- Tests colocated with their owning modules; `src/test/setup.ts` configures DOM assertions and cleanup.
- `README.md`: setup, commands, product behavior, storage scope, and algorithm limits.

### Task 1: Preference model and runnable TypeScript test harness

**Files:** Create build/test configuration, `src/ranking/types.ts`, `src/ranking/relations.ts`, `src/ranking/relations.test.ts`, and `.gitignore`.

**Interfaces:** `Item = { id: string; label: string }`; `Pair = { left: string; right: string }`; `Answer = 'left' | 'right' | 'tie' | 'skip'`; `ComparisonEvent = { pair: Pair; answer: Answer }`; `SessionRecord = { version: 1; items: Item[]; started: boolean; events: ComparisonEvent[] }`. Relations export `buildRelations(items: Item[], events: ComparisonEvent[]): Relations`, `resolvePair(relations: Relations, pair: Pair): 'left' | 'right' | 'tie' | 'unknown'`, and `orderedGroups(relations: Relations): string[][] | null`. Invalid or contradictory input throws a typed `InvalidSessionError` from `types.ts`.

- [x] Check Node/npm versions and registry package engine compatibility; select compatible current stable React, Vite, TypeScript, Vitest, plugin-react, jsdom, and Testing Library versions and lock them. Consult fetched docs before configuring. Create only the minimal config needed for the tests; scripts: `dev`, `build`, `typecheck`, `test` (`vitest run`). Set Node test environment by default, jsdom per component test file. Ignore `node_modules/`, `dist/`, and `.superpowers/`; preserve unrelated files.
- [x] Write failing tests: `infers strict transitivity` asserts A>B and B>C imply A>C; `propagates ties` asserts A=B and B>C imply A>C; `rejects cycles and contradictory ties`; `skip creates no relation`; `unknown groups are not a ranking`; `preserves input order within equal groups`.
- [x] Run `npm test -- src/ranking/relations.test.ts`; confirm assertion/import failure before implementation.
- [x] Implement the declared types and relation functions with stable representative IDs, equality union, and reachability checks; strict preferences use winner-to-loser edges. Reject unknown/repeated item IDs in a pair. `orderedGroups` returns null unless all groups form a known total order, rather than returning an arbitrary topological order.
- [x] Run the focused test and `npm run typecheck`; require both to pass. Commit this independently tested deliverable.

### Task 2: Comparison-efficient Ford–Johnson scheduler

**Files:** Create `src/ranking/fordJohnson.ts` and `src/ranking/fordJohnson.test.ts`.

**Consumes:** `Pair`, `Relations`, and `resolvePair` from Task 1.
**Produces:** `createMachine(groupIds: string[]): SortMachine`; `advanceMachine(machine: SortMachine, relations: Relations): SortFrontier`; `SortFrontier = { machine: SortMachine; runnable: Pair[]; result: string[] | null }`. `SortMachine` is an explicit immutable serializable task/dependency structure, with stable IDs and task priorities. `runnable[0]` is the canonical Ford–Johnson comparison; later entries are currently independent tasks. Known results advance automatically; advancing alone never assumes an unknown outcome.

- [x] Write failing tests: `sorts all permutations through eight items`; `matches Ford-Johnson worst-case counts` expects maxima `[0,0,1,3,5,7,10,13,16]` indexed by n=0..8; `never compares an identical pair twice`; `exposes independent initial pair tasks`; `is deterministic and input immutable`. Include odd-size inputs and partner-bound insertion regressions.
- [x] Run `npm test -- src/ranking/fordJohnson.test.ts`; confirm failure.
- [x] Implement pair ordering, recursive winner sorting with retained partner identities, the initial main chain, and Jacobsthal-guided pending insertion. Resolve the insertion upper bound from the current partner position after each insertion; do not use stale numeric bounds. Represent independent tasks explicitly so deferral cannot reorder dependent insertion operations. A runnable pair list must exclude duplicate/reversed pairs. Handle n=0 and n=1 without comparisons.
- [x] Run the exhaustive test suite; verify measured maxima match the standard sum `sum(ceil(log2(3*k/4)), k=1..n)` as well as fixed values. Add seeded larger permutations to check correct complete output. Require tests and typecheck to pass, then commit.

### Task 3: Interactive sessions, ties, deferred comparisons, and undo

**Files:** Create `src/ranking/session.ts` and `src/ranking/session.test.ts`.

**Consumes:** Task 1 record types and Task 2 machine functions.
**Produces:** `createSession(items: Item[]): SessionRecord`; `deriveSession(record: SessionRecord): SessionView`; `answerSession(record: SessionRecord, expectedPair: Pair, answer: Answer): SessionRecord`; `undoSession(record: SessionRecord): SessionRecord`. `SessionView` is `{ stage: 'editing' } | { stage: 'comparing'; pair: Pair; decisionCount: number; revisiting: boolean } | { stage: 'complete'; groups: string[][]; decisionCount: number }`. Export `validateSession(value: unknown): SessionRecord`, checking shape and complete deterministic replay.

- [x] Write failing tests: `ranks seeded weak orders with ties`; `tie invalidates pending insertion bounds safely`; `skip selects another independent task`; `oldest necessary deferred pair returns`; `repeated sole-pair skip stays incomplete`; `inferred deferred pair disappears`; `undo restores exact previous pair for each answer`; `undo completed sort`; `JSON roundtrip preserves future pairs and decisions`; `stale expectedPair is rejected`; `every item appears exactly once`; `cannot start fewer than two items`.
- [x] Run `npm test -- src/ranking/session.test.ts`; confirm failure.
- [x] Implement event-by-event replay from ordered items. Maintain a stable FIFO deferred queue and choose a nondeferred runnable task before revisiting the oldest necessary deferred one. Resolve the dependency frontier first; if a previously deferred task is blocked by a current dependency, execute that dependency. Return a pair instead of internally looping on unresolved skipped work. Explain a forced revisit via `revisiting`.
- [x] On ties, rebuild the machine over current equivalence representatives while retaining all learned strict relations and necessary deferred relationships. Resolve obsolete deferred pairs by representative equality or reachability. Expand groups back to original IDs at completion. Derive Undo by removing one action; no opaque generator or function is serialized. Guard actions using `expectedPair`, so a stale UI action cannot answer a different comparison.
- [x] Run all ranking tests and typecheck. Check classical counts separately for no-tie/no-skip sessions and correctness/inference for weak-order sessions. Commit.

### Task 4: Validated browser persistence and recovery

**Files:** Create `src/storage/sessionStorage.ts` and `src/storage/sessionStorage.test.ts`.

**Consumes:** `SessionRecord`, `createSession`, `validateSession` from Task 3.
**Produces:** `loadSession(storage: Storage): LoadResult`; `saveSession(storage: Storage, record: SessionRecord): SaveResult`; `resetStoredSession(storage: Storage): SaveResult`. `LoadResult = { kind: 'empty' } | { kind: 'loaded'; record: SessionRecord } | { kind: 'invalid' | 'unavailable'; message: string }`; `SaveResult = { ok: true } | { ok: false; message: string }`. Storage key: `matchsort.session`, payload schema version 1.

- [x] Write failing tests for exact save/load roundtrip including skip and undo, invalid JSON, unknown version, missing fields, duplicate IDs, impossible event history, unavailable reads, quota failures, and explicit reset. Assert invalid existing bytes remain unchanged on load and on initial mounting recovery state. Assert reset removes only `matchsort.session`.
- [x] Run `npm test -- src/storage/sessionStorage.test.ts`; confirm failure.
- [x] Implement guarded storage access, validation, and discriminated results. Separate invalid-record recovery from normal empty initialization; never call `localStorage.clear()`. A failed read or invalid load blocks automatic writes until an explicit reset/retry succeeds. A failed write retains the in-memory session and reports failure; a later successful write clears that failure state.
- [x] Run focused tests plus typecheck, then commit.

### Task 5: Approved React flow and accessible interactions

**Files:** Create `index.html`, `src/main.tsx`, `src/App.tsx`, `src/app/reducer.ts`, `src/app/useSession.ts`, the four components in the file map, `src/styles.css`, `src/test/setup.ts`, `src/App.test.tsx`, and `src/app/reducer.test.ts`.

**Consumes:** All Task 3 session functions and Task 4 storage functions.
**Produces:** `App(): React.JSX.Element`; `useSession(): { record: SessionRecord | null; view: SessionView | null; recovery: LoadResult | null; saveStatus: 'saved' | 'unsaved' | 'unavailable'; dispatch: React.Dispatch<AppAction> }`. Actions cover add/remove/start/answer/undo/restart/reset/retry; add includes the ID generated once in the UI event handler, answer includes the currently displayed expected pair. Reducers are pure and storage writes occur outside them.

- [x] Write failing integration tests for Enter/Add, trim/empty/duplicate validation, remove and Start enablement, frozen active list, left/right/tie/skip, forced-revisit copy, Undo after completion, cancellation and confirmation of restart, live storage status, and invalid-data recovery without overwrite. Include a StrictMode rapid-double-click regression proving a stale expected pair cannot submit a second answer.
- [x] Write regression tests for same-input reducer determinism and no mutation, literal rendering of `<script>` text, and preservation of Korean/emoji labels. Test competition ranks 1,2,2,4, with original order inside tied groups.
- [x] Run `npm test -- src/App.test.tsx src/app/reducer.test.ts`; confirm failure before production UI implementation.
- [x] Implement the app flow and CSS from the approved HTML reference. The app starts with an empty editable list, not the mockup's example items. Use input labels and visible focus; focus the next relevant control after item removal or comparison replacement. Restart confirmation uses a labelled dialog with focus return and keyboard dismissal. For corrupt sessions, show an explanation and explicit Reset; do not render a usable new editor that triggers overwrite before that choice.
- [x] Implement saving after valid state changes, restoring before the first automatic write, and accurate status feedback. Keep localStorage operations outside reducers and catch access failures even when acquiring `window.localStorage`. Disable invalid stage navigation; don't reproduce preview-only tab access. Use restrained live status messages without announcing the entire page after every answer.
- [x] Run the UI tests, all engine/storage tests, typecheck, and production build. Require success, then commit.

### Task 6: Rendered verification, documentation, and final delivery

**Files:** Create `README.md`; modify only files where verification finds defects. Update `graphify-out/` using the project workflow after code changes.

**Consumes:** The working app and scripts from Tasks 1–5.
**Produces:** A verified app available through the user's forwarded `http://localhost:8084`, with documented commands and validation evidence.

- [x] Read the Playwright CLI skill, use its documented browser workflow, and check the actual owner of port 8084. Stop only the owned visual companion identified by its session state/process; leave any unrelated server untouched. Run `npm run dev` with configured host/port/strictPort and verify HTTP response.
- [x] Exercise in a real browser: create six items, remove one, add a replacement, start, skip, decide a winner, tie, undo, reload, complete a ranking, undo completion, and cancel then confirm restart. Check no browser errors, exact current-pair restoration, complete item coverage, and saved status. Test invalid stored JSON recovery and unavailable storage without claiming unsaved work is saved.
- [x] Inspect desktop and a 375px-wide viewport, including long unbroken labels, Korean, emoji, and HTML-looking text. Verify literal text rendering, wrapping without horizontal overflow, accessible keyboard focus, and usable tie/skip controls. Fix issues with targeted regression tests where behavior is affected.
- [x] Document Node/npm prerequisites selected in Task 1, install/dev/test/typecheck/build commands, port forwarding, local-only storage, ranking consistency, forced skip revisits, and the limits of comparison-count guarantees. Do not describe out-of-scope features as implemented.
- [x] Run `npm test`, `npm run typecheck`, and `npm run build`; retain actual results. Run `graphify update .` after production code changes; report any failure rather than claiming the graph is current. Check `git diff --check` and inspect scope before committing delivery changes.
- [x] Apply the requesting-code-review skill for one focused whole-change review, with particular attention to Ford–Johnson counts, skip scheduling, and persistence recovery. Address findings and rerun affected checks. Apply the finishing-a-development-branch skill without merging/publishing beyond user authorization.

## Self-review and execution handoff

Coverage: item input and lifecycle are owned by Task 5; relationships and strict completeness by Tasks 1–3; exact undo and deferral by Task 3; saving/recovery by Task 4; approved UI and accessibility by Tasks 5–6; algorithm comparison counts by Task 2. Each Review Focus item has a regression test in its owning task. Public interfaces use the same names across task boundaries.

Execution preference: inline in the main session, following AGENTS.md; this plan does not require independent implementation agents. The single final review is the review required by the execution workflow. Review this plan before implementation.
