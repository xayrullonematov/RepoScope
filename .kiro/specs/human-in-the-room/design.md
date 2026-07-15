# Human-in-the-Room Directives - Technical Design

## Summary

This document specifies the technical design for adding human directives as a first-class concept in the RepoScope event-sourced architecture. A "human directive" is a piece of free-text guidance issued by the human participant that persists in the event log and influences all subsequent agent LLM calls until deactivated.

## Architecture Changes

### 1. New Event Type: `human-directive`

The `EventType` union in `src/types/domain.ts` currently contains 13 types. This feature adds a 14th:

```typescript
export type EventType =
  | "session-created"
  | "round-started"
  | "round-completed"
  | "proposal"
  | "critique"
  | "revision"
  | "user-intervention"
  | "consensus-update"
  | "clarification-request"
  | "artifact-created"
  | "artifact-updated"
  | "artifact-status-changed"
  | "stage-progress"
  | "human-directive"; // NEW - 14th event type
```

**Rationale:** A separate event type (rather than reusing `user-intervention`) makes directives semantically distinct. Constraints from `user-intervention` are scoped to round-level context; directives are session-wide standing instructions.

### 2. HumanDirective Interface

New interface added to `src/types/domain.ts`:

```typescript
export interface HumanDirective {
  id: string;
  text: string;
  createdAt: string;
  source: "human";
  active: boolean;
}
```

**Fields:**
- `id` - Unique identifier (cuid), used for deactivation targeting.
- `text` - Free-text directive content provided by the human.
- `createdAt` - ISO 8601 timestamp of creation.
- `source` - Literal `"human"` for provenance tracking; future expansion could include `"system"` or `"agent-suggested"`.
- `active` - Whether the directive currently influences agent calls. Deactivation emits a new event with `active: false`.

### 3. State Projector Extension

In `src/lib/state-projector.ts`, a new case is added to both `projectSessionState` and `applyEvents` switch statements:

```typescript
case "human-directive":
  return handleHumanDirective(state, content);
```

Handler implementation:

```typescript
function handleHumanDirective(
  state: SessionState,
  content: Record<string, unknown>
): SessionState {
  const directive: HumanDirective = {
    id: (content.id as string) || "",
    text: (content.text as string) || "",
    createdAt: (content.createdAt as string) || "",
    source: "human",
    active: content.active !== false, // defaults to true
  };

  if (!directive.active) {
    // Deactivation: remove from projected state
    return {
      ...state,
      directives: state.directives.filter((d) => d.id !== directive.id),
    };
  }

  // Activation: add or replace
  const existing = state.directives.findIndex((d) => d.id === directive.id);
  if (existing >= 0) {
    const updated = [...state.directives];
    updated[existing] = directive;
    return { ...state, directives: updated };
  }

  return {
    ...state,
    directives: [...state.directives, directive],
  };
}
```

The `SessionState` interface gains a new field:

```typescript
export interface SessionState {
  // ... existing fields ...
  directives: HumanDirective[];
}
```

The `createEmptySessionState()` initializer sets `directives: []`.

### 4. Context Assembler Integration

In `src/lib/context-assembler.ts`, directives are added between constraints (priority 3) and workspace summary (priority 4) in the assembly order:

```typescript
// Priority 3: Active constraints
const constraints: Constraint[] = state.constraints;

// Priority 3.5: Active human directives
const directives: HumanDirective[] = state.directives;

// Priority 4: Workspace summary
const workspaceSummary: string = await workspaceSummaryService.generateSummary(sessionId);
```

The `WorkspaceContext` interface gains:

```typescript
export interface WorkspaceContext {
  // ... existing fields ...
  directives: HumanDirective[];
}
```

Token-budget truncation: directives are truncated after workspace summary but before constraints:

```
Truncation order (first removed to last removed):
6. Prior session context
5. Round summaries (oldest first)
4. Workspace summary
3.5. Directives    <-- NEW
3. Constraints
2. Artifact state
1. Current round events (NEVER truncated)
```

### 5. Prompt Builder Formatting

In `src/lib/prompt-builder.ts`, the stable system block includes a new section after constraints:

```typescript
function buildStableSystemBlock(agent: AgentConfig, context: WorkspaceContext): string {
  return [
    ENGINEERING_ROOM_PREAMBLE,
    ``,
    `---`,
    ``,
    buildAgentRoleBlock(agent),
    ``,
    `## Problem Description (constant for this session)`,
    context.problemDescription,
    ``,
    `## Active Constraints (constant for this session)`,
    formatConstraints(context.constraints),
    ``,
    `## Human Directives (active for this session)`,
    formatDirectives(context.directives),
  ].join("\n");
}
```

Formatter:

```typescript
function formatDirectives(directives: WorkspaceContext["directives"]): string {
  if (!directives || directives.length === 0) return "None";
  return directives
    .map((d) => `- [directive] ${d.text}`)
    .join("\n");
}
```

The `[directive]` prefix distinguishes these from constraints (`[category]`) in the prompt, making it clear to agents that these are standing human instructions rather than domain constraints.

### 6. API Route

New route at `src/app/api/sessions/[sessionId]/directives/route.ts`:

**POST** - Create a new directive:
```typescript
// Request body
{ text: string }

// Response
{ directive: HumanDirective, status: "created" }
```

**DELETE** - Deactivate a directive:
```typescript
// Request body
{ directiveId: string }

// Response
{ directiveId: string, status: "deactivated" }
```

Both operations append a `human-directive` event to the event store. The POST creates with `active: true`; the DELETE creates with `active: false`.

**Implementation pattern:** Follows the existing `intervene/route.ts` pattern:
- Validates sessionId exists
- Validates request body
- Uses `cuid()` for id generation
- Calls `eventStore.appendEvent()` directly (no orchestrator needed since directives are passive context, not round-advancing)

### 7. UI Components

All components are placed in `src/components/workspace/` following existing conventions (Tailwind CSS, Framer Motion, lucide-react icons, `"use client"` directive).

#### TeamRoomPanel

Top-level container that composes the directive and activity sub-panels:

```
+------------------------------------------+
|  TeamRoomPanel                           |
|  +------------------------------------+  |
|  | DirectivePanel (input form)        |  |
|  +------------------------------------+  |
|  | DirectivesList (active directives) |  |
|  +------------------------------------+  |
|  | TeamActivityFeed (event timeline)  |  |
|  +------------------------------------+  |
+------------------------------------------+
```

- Props: `{ sessionId: string }`
- Uses `useSession` hook to get current state (including `directives`)
- Uses `useEventStream` hook for real-time updates

#### DirectivePanel

Input form for submitting new directives:

- Text input (multi-line textarea)
- Submit button
- Calls `POST /api/sessions/[sessionId]/directives`
- Follows the same pattern as `InterventionPanel.tsx` (loading state, error handling, motion animations)

#### TeamActivityFeed

Chronological feed of session events with emphasis on human-agent interaction:

- Renders events in reverse-chronological order
- Human directive events get a distinct visual treatment (icon, color)
- Agent responses that follow a directive are visually linked
- Uses existing event stream data

#### DirectivesList

Displays all currently-active directives:

- Each directive shows text, timestamp, and a deactivate button
- Deactivate calls `DELETE /api/sessions/[sessionId]/directives`
- Empty state shows "No active directives"
- Updates in real-time as directives are added/removed

## Data Flow

```
Human Input
    |
    v
POST /api/sessions/[sessionId]/directives
    |
    v
eventStore.appendEvent({ type: "human-directive", ... })
    |
    v
Event Log (append-only, immutable)
    |
    v
State Projector (folds event -> SessionState.directives)
    |
    v
Context Assembler (includes directives in WorkspaceContext)
    |
    v
Prompt Builder (formats as "## Human Directives" section)
    |
    v
Agent LLM Call (directive text influences reasoning)
    |
    v
Agent Output (cites/responds to directive in structured response)
```

## Relationship to Existing `user-intervention`

The existing `user-intervention` event type and its `Constraint` model are preserved unchanged. The key differences:

| Aspect | user-intervention (Constraint) | human-directive (Directive) |
|--------|-------------------------------|---------------------------|
| Scope | Round-level context | Session-wide standing instruction |
| Lifecycle | Added once, never deactivated | Can be activated/deactivated |
| Round advancement | Triggers round advancement via orchestrator | Passive - does not advance rounds |
| Prompt position | "Active Constraints" section | "Human Directives" section |
| Category | Has a category field | No category (free-form) |

## Migration and Backward Compatibility

- No schema migration needed. The Prisma `Event` model stores `type` as a string and `content` as JSON, both of which accommodate the new event type without DDL changes.
- Existing event replay continues to work because the projector's `default` case silently ignores unknown event types. However, old snapshots will not contain the `directives` field; the projector initializes it as `[]` in `createEmptySessionState()`.
- The `applyEvents` function used by SnapshotManager will correctly project directives from events after the snapshot point.
