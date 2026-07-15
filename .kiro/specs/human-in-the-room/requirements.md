# Human-in-the-Room Directives - Requirements

## Overview

Enable humans to issue directives that persist as first-class events in the event-sourced architecture, influence agent reasoning in subsequent rounds, and remain fully auditable through the event log.

## Acceptance Criteria

### 1. Directive Creation

- 1.1 A human user can create a directive by providing free-text input via the UI or API.
- 1.2 Each directive is assigned a unique `id`, a `createdAt` timestamp, `source: 'human'`, and an `active: boolean` flag (defaulting to `true`).
- 1.3 Directives can be deactivated (soft-deleted) but are never removed from the event log.
- 1.4 The API validates that directive text is non-empty and is a string.

### 2. Event Persistence

- 2.1 Creating a directive appends a `human-directive` event to the session's append-only event log.
- 2.2 The event content contains the full `HumanDirective` object (id, text, createdAt, source, active).
- 2.3 Deactivating a directive appends a new `human-directive` event with `active: false` for the same directive id.
- 2.4 The event type `human-directive` is added to the `EventType` union in `src/types/domain.ts`.

### 3. State Projection

- 3.1 The state projector handles `human-directive` events via a new `case` in the existing `switch` statement.
- 3.2 Projected `SessionState` exposes a `directives: HumanDirective[]` field containing only currently-active directives.
- 3.3 When a directive with a given id is re-emitted with `active: false`, it is removed from the projected `directives` array.
- 3.4 The projector remains a pure function with no side effects.

### 4. Context Propagation

- 4.1 The context assembler includes active directives in the `WorkspaceContext` passed to agent LLM calls.
- 4.2 Directives are included at a priority level between constraints (priority 3) and workspace summary (priority 4), ensuring they survive token-budget truncation in most scenarios.
- 4.3 If the token budget forces truncation, directives are removed before constraints but after workspace summary.

### 5. Prompt Builder Formatting

- 5.1 The prompt builder formats directives with clear delimiters so agents can distinguish them from constraints.
- 5.2 Directives are rendered under a `## Human Directives (active for this session)` heading.
- 5.3 Each directive is formatted as `- [directive] <text>` to distinguish from constraint formatting (`- [category] <text>`).
- 5.4 When no active directives exist, the section renders "None".

### 6. Team Room UI

- 6.1 A `TeamRoomPanel` component provides the top-level container for human-agent collaboration.
- 6.2 A `DirectivePanel` component allows the human to compose and submit new directives.
- 6.3 A `TeamActivityFeed` component shows a chronological feed of events including human directives and agent responses.
- 6.4 A `DirectivesList` component displays all active directives with the option to deactivate them.
- 6.5 The UI updates in real-time when new events arrive (using the existing `useEventStream` hook pattern).

### 7. Auditability

- 7.1 The full history of directive creation and deactivation is visible via event log replay.
- 7.2 The `projectStateAtIndex` function correctly includes/excludes directives at any replay position.
- 7.3 Each directive's effect on agent output can be traced by correlating directive timestamps with subsequent agent events.

### 8. Privacy and Security

- 8.1 Directives are scoped to a single session and cannot leak to other sessions.
- 8.2 The API route validates the session exists before appending events.
- 8.3 Directive text is stored as-is without execution or interpretation (no injection risk in storage).
- 8.4 Directive text is escaped/delimited in prompts to prevent prompt injection from affecting agent behavior beyond the intended influence.

## Non-Functional Requirements

- The state projector must remain O(n) in the number of events (no nested loops for directive lookup).
- The new event type must not break existing event replay or snapshot restoration.
- UI components follow the existing Tailwind + Framer Motion patterns established by other workspace components.
