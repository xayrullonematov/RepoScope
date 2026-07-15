# Day 2: Kiro Birthday Challenge - Human-in-the-Room Directives

## What This Is

**RepoScope already existed before Day 2.** Human-in-the-Room Directives is the specific feature built during the Kiro Birthday Challenge Day 2 window.

The core idea: make the human a visible **fifth engineer** in the shared engineering room. Rather than passively watching four AI agents deliberate, you now sit at the table with them, issuing structured directives that enter the shared context and shape every subsequent agent decision.

Before this feature, the human could only observe and intervene between rounds. Now, the human is a named participant -- "You / Human Engineer" -- whose directives are treated as first-class constraints alongside agent-generated proposals, critiques, and revisions.

---

## How It Extends the Existing Architecture

Human-in-the-Room Directives integrates cleanly with RepoScope's event-sourced architecture by adding a single new event type and threading it through the existing pipeline:

```
Human types directive
      |
      v
POST /api/sessions/[sessionId]/directives  (Zod-validated)
      |
      v
Event Store appends 'human-directive' event
      |
      v
State Projector (pure function) handles new case
      |
      v
Context Assembler includes humanDirectives in WorkspaceContext
      |
      v
Prompt Builder formats directives in agent system prompt
      |
      v
Agents receive directive as constraint in next round
```

No existing invariants were broken. The state projector remains pure. The event log remains append-only and replayable.

---

## Event Model Changes

### New Event Type: `human-directive` (14th type)

Added to the `EventType` union in `src/types/domain.ts`:

```typescript
export type EventType =
  | 'session-created'
  | 'round-started'
  | 'proposal-submitted'
  | 'critique-submitted'
  | 'revision-submitted'
  | 'consensus-reached'
  | 'round-completed'
  | 'session-ended'
  | 'intervention'
  | 'artifact-created'
  | 'stage-progress'
  | 'summary-generated'
  | 'constraint-added'
  | 'human-directive';    // <-- new
```

### HumanDirective Interface

```typescript
export interface HumanDirective {
  id: string;
  text: string;
  createdAt: string;
  source: 'human';
  active: boolean;
}
```

Directives are projected into `SessionState.humanDirectives` by the state projector's `handleHumanDirective` function.

---

## How Directives Enter Agent Shared Context

The flow from directive to agent awareness:

1. **Context Assembler** (`src/lib/context-assembler.ts`) reads `state.humanDirectives` from projected state and includes them in the `WorkspaceContext` object.

2. **Prompt Builder** (`src/lib/prompt-builder.ts`) formats active directives into the agent system prompt under a clearly delimited section:

   ```
   ## Human Team Directives (from human engineer)

   - Deployment must stay below $50/month. Do not recommend Kubernetes.
   - All API responses must include cache headers.
   ```

3. **Agent Executor** passes this system prompt to the LLM. Every agent in the room receives the same directives, ensuring consistent shared context.

This means directives are:
- **Auditable** -- stored as events, visible in the event log
- **Replayable** -- projecting from events always produces the same directive state
- **Scoped** -- directives only affect the session they belong to

---

## Demo Scenario

### Step-by-Step Commands

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Navigate to the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Create or open a session:**
   Paste a GitHub repository URL (e.g., `https://github.com/vercel/next.js`) and click to create a new session.

4. **Go to the "Team Room" tab:**
   In the workspace view, click the "Team Room" tab in the navigation.

5. **See the 5 team members:**
   The Team Room displays all five engineers:
   - You / Human Engineer
   - Senior Engineer (AI)
   - Security Engineer (AI)
   - Performance Engineer (AI)
   - Product Engineer (AI)

6. **Add a directive:**
   In the Directive Panel, type:
   ```
   Deployment must stay below $50/month. Do not recommend Kubernetes.
   ```
   Click "Add Directive" to submit.

7. **Observe the directive in shared state:**
   The directive appears in the Directives List as an active constraint. The Team Activity Feed shows the submission event with timestamp.

8. **Advance the round:**
   Navigate back to the main workspace and advance the round. Agents now receive your directive in their system prompt context.

9. **Observe changed recommendations:**
   In agent proposals and revisions, observe that recommendations now respect the cost constraint -- lighter deployment options (Docker Compose, single VPS, serverless) appear instead of Kubernetes.

---

## 60-90 Second Demo Script

> Use this as a narrated walkthrough for screen recording.

**[0:00 - 0:10] Introduction**

"This is RepoScope's Human-in-the-Room Directives feature, built for Kiro Birthday Challenge Day 2. I'm going to show how the human becomes a visible fifth engineer in the AI design room."

**[0:10 - 0:20] Show the Team Room**

"Here's the Team Room tab. You can see five team members listed -- four AI engineers plus me, the Human Engineer. This is the shared engineering room."

**[0:20 - 0:40] Add a Directive**

"I'll add a directive: 'Deployment must stay below $50/month. Do not recommend Kubernetes.' This enters the shared context as a structured constraint."

*Type the directive and click Add Directive.*

"Notice it appears in the active directives list and the activity feed logs my contribution with a timestamp."

**[0:40 - 0:55] Show Context Flow**

"When I advance the round, every agent receives this directive in their system prompt under 'Human Team Directives.' It's clearly delimited -- agents know it comes from the human engineer."

*Advance the round and show agent output.*

**[0:55 - 1:10] Show the Result**

"Look at the proposals now -- the agents recommend Docker Compose on a single VPS instead of Kubernetes. My constraint shaped their reasoning. The directive is auditable in the event log and replayable from the event stream."

**[1:10 - 1:20] Wrap Up**

"Human-in-the-Room Directives -- making the human a first-class participant in multi-agent deliberation. Built with Kiro for the Birthday Challenge Day 2."

---

## Privacy and Security

- **Validation:** Directive text is validated via Zod schema (1-500 characters, non-empty string). Malformed or oversized inputs are rejected with a 400 response.
- **Rendering:** Directive text is rendered as plain text in the UI (no HTML interpretation, no markdown rendering in the directive display). React's default escaping prevents XSS.
- **Prompt Delimitation:** Directives are clearly delimited in agent system prompts under a dedicated `## Human Team Directives (from human engineer)` section, preventing prompt injection confusion with other context sections.
- **Scope:** Directives are scoped to a single session and cannot cross session boundaries.

---

## Social Post

RepoScope now has a fifth engineer in the room -- you. Human-in-the-Room Directives lets you issue structured constraints that enter the shared agent context, shaping how four AI engineers reason about your code. Built during the Kiro Birthday Challenge Day 2 window.

#BuildWithKiro #TeamKiro #1YearOfKiro @kirodotdev

---

## Links

- [README.md](README.md) -- project overview and getting started
- [DESIGN.md](DESIGN.md) -- full architecture documentation
- [Kiro Spec](.kiro/specs/human-in-the-room/) -- requirements and design documents for this feature
- [Product Principles](.kiro/steering/product-principles.md) -- steering file for development guidance
