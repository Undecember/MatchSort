# MatchSort

A browser-only sorter for your own items. Add a list, choose between pairs, and get a complete ranking, including ties.

## Run locally

Use Node.js 22.12+, 24+, or 26+ in accordance with the `engines` field in `package.json`, and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:8084**. The development server listens on `0.0.0.0` for remote port forwarding and fails if port 8084 is occupied. Forward port 8084 when running on a remote host.

```sh
npm test           # engine, persistence, and interface tests
npm run typecheck # TypeScript checks
npm run build     # typecheck and production bundle in dist/
```

Deploy the contents of `dist/` to a static host. The app needs no backend or accounts.

## How it works

- Add plain text items with the input and Add button, or press Enter. Remove items before starting. Blank and exact duplicate labels are rejected after trimming; labels are case sensitive.
- Choose either item, **They’re tied**, or **Skip for now**. The list stays fixed during sorting.
- Earlier choices imply later relationships: A > B and B > C imply A > C, so that pair is answered automatically. Ties propagate too. Preferences are assumed to be consistent and transitive.
- Skip records no preference. Independent comparisons proceed first; a necessary skipped pair returns when nothing else can advance. Skipping indefinitely leaves the ranking incomplete.
- Undo restores the state before the last choice, tie, or skip. It also works after completion and after reloading.
- The result contains every item. Tied items share a position using competition ranks, e.g. 1, 2, 2, 4, with original input order inside a tied group.
- Start over asks for confirmation, clears decisions, and keeps the list for editing.

## Saved progress

The current list and comparison history are saved to `localStorage` under `matchsort.session`, with schema version 1. Resume works in the same browser and origin. The app sends no item data to a service; there is no cross-device synchronization. Clearing browser data removes the saved session, and private browsing may limit persistence.

A damaged or unsupported save is preserved until you explicitly reset it. If browser storage fails, the current session remains usable in memory and the interface reports that progress is not saved. Keep that tab open until saving works again. Undo history is included in saved progress.

## Sorting engine

MatchSort uses Ford–Johnson merge-insertion sorting with Jacobsthal-guided bounded binary insertion. A preference graph tracks strict order and equality groups, answering known and transitively implied comparisons before asking the user. A deterministic dependency frontier allows independent pair tasks to proceed when a comparison is skipped. Ties rebuild the plan over equivalence groups without losing learned preferences.

The aim is few human comparisons, not a universal optimum. Standard Ford–Johnson comparison bounds concern distinct items with no skips; ties, deferred decisions, and revisiting questions change the interaction count. Tests exhaustively check all permutations through eight items, including worst-case counts, and exercise larger inputs and weak orders with ties.

## Project structure

- `src/ranking/`: pure preference model, Ford–Johnson engine, session replay and undo.
- `src/storage/`: validated, versioned browser persistence.
- `src/app/`: immutable reducer and React persistence lifecycle.
- `src/components/`: item editor, comparisons, results, and restart confirmation.
- `docs/superpowers/`: approved design and implementation plan.

React + TypeScript + Vite, with plain CSS and no runtime UI dependencies beyond React.
