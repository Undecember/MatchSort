# MatchSort design

Date: 2026-11-14
Status: Approved by the user on 2026-11-14.

## Intent

MatchSort is a frontend-only webpage where people enter custom text items and build a complete personal ranking by choosing between pairs. Human decisions are the expensive operation, so the sorting strategy prioritizes few comparisons over processor time.

The user selected TypeScript, Vite, React, and Ford–Johnson merge-insertion sorting. They requested ties, skipping comparisons, undo, automatic browser persistence, and an item list with an input, Add button, and individual Remove buttons. They approved the three-screen visual mockup on 2026-11-14.

## Goals and boundaries

- Produce a complete ordered ranking, grouping items the user considers equal.
- Reuse previous decisions and transitive relationships instead of asking implied comparisons.
- Support pausing by simply closing the page and resuming in the same browser.
- Make all primary interactions usable by keyboard and on mobile.
- Keep everything in the browser, without accounts, backend services, or item uploads.

The first version handles plain text items and one active ranking. Images, multiple saved projects, sharing, cloud sync, imports, exports, and collaborative ranking are outside its scope. It must not silently treat skipped pairs as ties, invent ranking relationships, or claim a universal minimum number of decisions.

## Approaches considered

1. **Ford–Johnson merge-insertion:** selected by the user because it targets low comparison counts. Its scheduling and adaptation to ties and skips require more care.
2. **Merge sort:** simpler to implement and validate, but generally asks more comparisons. Rejected in favor of prioritizing the user's time.

Ford–Johnson is not optimal for every input size. Classical comparison bounds apply to distinct items without skipping; no identical guarantee is promised for the interactive adaptation. Reference: https://arxiv.org/abs/1905.09656.

## Approved visual direction

Reference mockup: `.superpowers/brainstorm/3562655-1794652611/content/matchsort-flow.html`.

Use a warm off-white background, white panels, muted green actions, spacious typography, rounded controls, and a compact MatchSort wordmark. The three stages are item entry, comparison, and results. The mockup's navigation tabs allow inspecting example screens; the production application must only make stages available when valid. Its sample comparison count and results are illustrative, not production data.

### Item entry

Show an input and Add button above a list pane. Each row shows its text and a Remove button. Enter submits the input. Show the number of items and enable Start comparing when there are at least two items.

Implementation defaults proposed by the designer: trim input, reject empty entries, and reject exact duplicate labels after trimming with an inline message. Comparisons of labels are case sensitive. Store immutable IDs separately from labels. No arbitrary list-size limit is part of the product requirement.

Starting freezes the list for that session. Editing it requires explicitly starting over, with confirmation before deleting decisions. Retain the existing item list as the starting point for that edit.

### Comparison

Show two large selectable item cards and equally accessible Tie and Skip for now buttons. Include Undo and an accurate count of submitted non-skipped decisions. Do not show a fabricated percentage or exact number remaining.

Left/right winners create a strict preference. Tie records equality. Skip postpones a question without creating an ordering relationship. Provide a brief explanation when a skipped pair returns because no other comparison can advance the sort.

The production screen should say that progress is saved only after persistence succeeds. Do not show the mockup's sample statistics. A neutral save status should not compete with the comparison.

### Results

Show every original item exactly once, ordered from most preferred to least preferred. Tied items share a row and rank. Proposed rank convention: competition ranking, such as 1, 2, 2, 4; this matches the approved mockup. Within a tie group, preserve original input order without implying preference.

Allow Undo from the completed state to return to the final comparison. Provide Start over, with confirmation before discarding the session's decisions, retaining the list for editing. Do not expose a back-to-editor action that silently invalidates a completed result.

## Ranking model and algorithm

Assume a consistent, transitive preference relation with equivalence for ties. If A ties B and B beats C, infer A beats C. The app elicits a ranking, rather than independently surveying every possible pair.

Keep the deterministic sorting engine independent of React. It accepts items and recorded events, and yields either a pair needing a decision or a completed ranking. Use Ford–Johnson's pair formation, recursive ordering, and Jacobsthal-guided bounded binary insertion as the baseline; do not substitute ordinary binary insertion and retain the Ford–Johnson name.

Maintain equivalence groups and a directed acyclic graph of strict preferences derived from accepted decisions. Before asking a pair, resolve any known equality or transitive order automatically. A tie merges the groups and requires rebuilding affected planning state; rebuilding may use deterministic replay from the event log. Contradictory decisions must never corrupt the ranking: reject a contradictory decision and explain that Undo can revise the previous choice. Normally the planner avoids asking already determined pairs.

### Skip scheduling

Skip must not be passed to a comparator as an ordering result. Defer the unresolved comparison and advance another independent pending task if one is available without violating the Ford–Johnson schedule. Keep a deterministic queue of deferred pairs. Once independent tasks are exhausted, return to the oldest necessary unresolved pair, with an explanation. It is valid for that to be the immediately preceding pair when no other task can proceed; repeated skipping cannot force a complete ranking.

A deferred pair may become unnecessary through later ties or inferred ordering; discard it when resolved. Completion requires one fully ordered sequence of equivalence groups, with no unknown relation between adjacent groups. Never emit an arbitrary topological order as a complete personal ranking.

The builder owns the precise resumable task representation and replay strategy. It must preserve the baseline comparison schedule for ordinary distinct-item sessions without skips, provide deterministic restoration, and test ties and deferrals separately from classical comparison-count guarantees.

## State, undo, and persistence

Use immutable item IDs, ordered input items, a versioned session record, and a chronological action log. Log win, tie, and skip actions, together with enough deterministic planning information to restore the active pair and deferred-task order exactly. Derived rankings, equivalence groups, and preference graphs may be rebuilt; never persist opaque runtime generators.

Undo removes the latest submitted comparison action, including skip, restoring the exact pair and state immediately before that action. Undo remains available after reload and at completion; it is disabled before any actions exist. Item edits before sorting are outside comparison Undo.

Proposed persistence mechanism: localStorage, with a namespaced key and schema version. Save after valid edits and session transitions. Restore the latest valid snapshot automatically, including the current pair and undo history. Data remains local to the same browser and origin; it does not synchronize across devices.

Validate loaded records. Unknown schema versions or invalid data must not crash the page or be silently overwritten: explain that the saved session cannot be restored and offer an explicit reset. On storage failure, allow the current in-memory session to continue and show that progress cannot currently be saved. Discarding/resetting saved data requires the user's explicit action.

## Technical boundaries and builder decisions

Use React and TypeScript with Vite, as requested. Fetch current framework and tool documentation through Context7 before implementation. Keep the core algorithm and serialization pure and separately testable; React owns presentation and interaction, with a small persistence adapter.

The builder chooses package versions, internal file structure, state-management mechanics, test tooling, and detailed task representation. Prefer React's built-in state tools and plain CSS unless an additional dependency materially helps. These are designer defaults rather than choices explicitly made by the user.

Use semantic buttons, visible focus, accessible input labels, inline feedback, and responsive layouts. Move focus sensibly after removal, stage transitions, and comparison replacement. Treat item text as text, never HTML. Core use must not depend on animation, hover, color alone, or external assets.

The remote preview uses port 8084, bound to 0.0.0.0 and reached through the user's forwarded localhost. Avoid replacing an unrelated listener. The visual companion currently occupies this port; stop that owned preview before later serving the app there.

## Verification required for implementation

- Exhaustively check permutations through at least 8 distinct items: correct complete ranking and Ford–Johnson worst-case decision counts against its standard comparison formula.
- Exercise larger randomized distinct-item inputs and randomized weak orders with ties; prove every output includes each item once and respects all recorded preferences.
- Verify inferred relationships do not trigger extra user questions, ties do not create cycles, and unresolved skips cannot create a false completion.
- Verify skip followed by progress elsewhere, forced revisits, repeated skips, resolution of deferred pairs, undo of each action type, and undo after completion.
- Verify save/restore produces the same pair, deferred state, and future behavior, including after undo; cover invalid and unavailable storage.
- Check item entry, duplicate/empty validation, removal, restart confirmation, keyboard interaction, responsive layout, and result tie ranks in a real browser.
- Run type checks, the relevant automated tests, and a production build before claiming completion. Update Graphify after production code changes per AGENTS.md.

## Approval

The user approved the visual layout, selected algorithm, and this written document on 2026-11-14. Proceed to implementation planning using the defaults documented here.
