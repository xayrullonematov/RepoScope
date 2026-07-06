# RepoScope — Design & Architecture

> **Scope your repo before you ship.**
>
> RepoScope inspects any GitHub repository before you ship, using a swarm of
> specialized AI agents to find bugs, security risks, architecture issues, and
> concrete fixes — with file-level evidence for every finding.

---

## 1. What it is

Paste a GitHub repo. Ask what's risky. Get a file-level report you can fix.

RepoScope is an **AI repository review tool**. Under the hood it runs a
four-agent *AI Engineering Room* that debates its way to a verdict, but the
user-facing value is the final report: findings, risks, affected files, and
fixes. The machinery is a trust mechanism — the result is the product.

**Design principle:** *Show the result first. Show the machinery second.*
The app should feel useful before it feels impressive.

---

## 2. Positioning

| | |
|---|---|
| **Product** | RepoScope |
| **Tagline** | Scope your repo before you ship. |
| **Category** | AI repository review tool (not "a multi-agent debate app") |
| **Promise** | AI repo reviews with evidence. |
| **Primary CTA** | Analyze repo |
| **Secondary CTA** | View sample report |

**Information hierarchy:** Repo first. Finding second. Agent third.

---

## 3. User flow

1. Paste a GitHub repository
2. Choose a review type (or ask a free-form question)
3. Run analysis
4. Receive a structured review report
5. Inspect findings → affected files → suggested fixes
6. Drill into agent reasoning only if you want to

Default review types: **Security vulnerabilities · Bugs & edge cases ·
Architecture review · Performance issues · Production readiness · Explain this
repo · What should I refactor first?**

The user never has to understand agents, rounds, artifacts, consensus, or token
budgets to get value. Those live in advanced/secondary surfaces.

---

## 4. The engine — AI Engineering Room

Four LLM agents, each with a **distinct objective function**, partition the work
and negotiate through structured debate rounds:

| Agent | Optimizes for |
|-------|---------------|
| `senior-engineer` | Correctness, maintainability, sound architecture |
| `security-engineer` | Auth, secrets, injection, trust boundaries |
| `performance-engineer` | Hot paths, allocations, query/IO cost |
| `product-engineer` | User impact, scope, shipping risk |

Each round runs four stages in order:

```
proposal → critique → revision → consensus
```

**Critique routing is fixed by maximum objective conflict:** Senior ↔ Performance,
Security ↔ Product — so every agent is challenged by the one most likely to
disagree with it.

### Engineering invariants

- **Event sourcing.** All session state is derived by replaying an append-only
  event log; the only mutable state is the artifact. Projection is a pure
  function `events → SessionState`, with per-round snapshots so reconstruction is
  *snapshot + incremental events*, never a full replay.
- **Structured outputs only.** Every agent response is validated against a Zod
  schema (`proposal`, `critique`, `revision`, `consensus`). Clarification is a
  first-class field — no prose is ever parsed with heuristics. Schema failures
  retry up to 2×.
- **Qwen tool loop before output.** During proposal, each Qwen agent receives a
  bounded set of read-only repository tools (`list_files`, `read_file`,
  `search_code`). Tool results are returned as inert `<repo-data>` context; the
  agent continues until it emits the stage's final structured JSON. Calls and
  files read are persisted as `stage-progress` evidence, including whether the
  hard call cap was reached.
- **Summaries, not full history.** Agents never see the raw event log; context is
  assembled from workspace/round/artifact summaries under a per-call token budget.
- **Crash recovery.** Because state is event-sourced, a crash mid-round replays
  `stage-progress` events to determine exactly which agents finished, re-runs only
  the rest, and releases the lock — completed work is never lost.
- **Model tiering.** Critique and summary stages default to a cheaper model tier;
  a per-session token budget hard-stops runaway cost.

The system is designed against **23 explicit correctness properties**, verified
with property-based tests (`fast-check`) rather than example cases alone.

### Qwen execution contract

```text
Qwen stage prompt
  → optional read-only tool calls (bounded by call + byte caps)
  → repository data returned as inert context
  → final JSON response
  → Zod validation
  → repair retry on schema failure
  → typed event persisted
  → UI projection + Qwen execution evidence
```

The demo exposes this contract in **Agent Debate → Qwen evidence**. The panel is
derived from persisted events rather than client-side counters, so judges can
inspect each agent's stage, files read, tool-call count, and cap status. The
debate messages beside it are projections of the validated proposal, critique,
revision, and consensus payloads.

---

## 5. Brand system

### Color

Violet is the brand color. Red, amber, and green are reserved for
severity/status only.

| Token | Value |
|-------|-------|
| Brand background | `#07090D` |
| Main surface | `#0D1117` |
| Raised surface | `#111827` |
| Soft border | `#1F2937` |
| Primary text | `#F8FAFC` |
| Secondary text | `#94A3B8` |
| Muted text | `#64748B` |
| Brand violet | `#7C3AED` |
| Violet hover | `#8B5CF6` |
| Success / Warning / Danger | `#22C55E` / `#F59E0B` / `#EF4444` |
| Code blue | `#38BDF8` |

### Typography

- **Geist Sans** — headings, body, buttons, navigation, marketing copy.
- **JetBrains Mono** — repo names, file paths, code, severity tags, scores.

Clean, technical, trustworthy.

### Logo

Concept: **repository + scope/lens** — branching nodes or a code file inside a
circular lens, in a rounded-square app-icon container. No robot, brain, sparkle,
or mascot. The mark must read at favicon size.

### Voice

Sound like a senior engineer, not AI marketing. Short, direct, technical.

> ✅ "Find risky files before they reach production."
> ❌ "Transform engineering tradeoffs into actionable decision intelligence."

Avoid: *unlock, empower, seamless, robust, comprehensive, next-generation.*

---

## 6. Report page — the most important screen

It should read like a professional code/security audit.

```
RepoScope Review
Repository: owner/repo
Question:   Find vulnerabilities before deployment
Verdict:    Fix before production        Score: 68/100

Critical Findings
  1. Missing authorization check in /api/admin
  2. Secret-like token found in config
  3. User input reaches DB query without validation

Fix Plan
  1. Add middleware auth guard
  2. Move secrets to environment variables
  3. Add a validation schema + permission-boundary tests
```

Every finding answers: **What is wrong? Where? Why does it matter? How do I fix
it? Which agent found it?**

Report tabs: **Report · Findings · Files · Agent Debate · Export.**

---

## 7. Tech stack

- **Next.js 16** + **React 19** (App Router, server-rendered)
- **Prisma 7** over SQLite (libSQL adapter) — event log + artifacts
- **Zod** structured-output validation
- **OpenAI-compatible LLM layer** (Qwen via DashScope) with retry/backoff and
  model tiering
- **Bounded Qwen tool loop** with read-only repository tools and persisted
  execution evidence
- **Vitest** + **fast-check** property-based tests
- Deployed on **Alibaba Cloud ECS** (Docker Compose behind host Nginx + Let's
  Encrypt TLS) — [`deployment/alibaba-cloud.md`](deployment/alibaba-cloud.md)

---

## 8. Product quality bar

> Would a tired developer understand this instantly at 1 AM before deploying?

If not, the screen is too complicated. RepoScope does not expose system
complexity before user value.
