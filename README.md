<div align="center">

# 🔬 RepoScope

### The AI Engineering Room — where four AI engineers argue about your code so you don't have to.

Point it at a GitHub repository and a swarm of four specialized LLM agents — each with a **different, deliberately conflicting objective** — propose, critique, revise, and negotiate their way to a structured engineering review. Not a chatbot. A design room.

<br />

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-reposcope.myrepo.xyz-6366f1?style=for-the-badge)](https://reposcope.myrepo.xyz)
[![Deployment Proof](https://img.shields.io/badge/🛰_Deployment-Alibaba_Cloud_ECS-ff6a00?style=for-the-badge)](deployment/alibaba-cloud.md)

<br />

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3e67b1?logo=zod&logoColor=white)
![Qwen](https://img.shields.io/badge/LLM-Qwen_/_DashScope-615ced)
![Tests](https://img.shields.io/badge/tests-property--based_(fast--check)-8a2be2)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 🏆 Hackathon Submission

> Submitted to the **Qwen Cloud Global AI Hackathon** — **Track 3: Agent Society** (Multi-Agent Swarm Collaboration).

RepoScope models a **real engineering design room** rather than a single assistant. Four LLM agents — `senior-engineer`, `security-engineer`, `performance-engineer`, and `product-engineer` — each carry a distinct **objective function**, partition the work, and negotiate through structured **proposal → critique → revision → consensus** rounds to produce engineering artifacts: decisions, risks, trade-offs, and recommendations.

The LLM layer talks to **Qwen** through the OpenAI-compatible **DashScope** endpoint (see [`.env.example`](.env.example)). Licensed under the [MIT License](LICENSE).

---

## ✨ Why it's interesting

|  | |
|---|---|
| 🧠 **Adversarial by design** | Critique routing is fixed by *maximum objective conflict* — Senior ↔ Performance, Security ↔ Product. Agents can't rubber-stamp each other; disagreement is structural, not accidental. |
| 🗂️ **Event-sourced** | All session state is derived by replaying an append-only event log. The projector is a **pure function** (`events → SessionState`), snapshot-accelerated, fully replayable. |
| 📐 **Structured outputs only** | Every agent response is validated against a **Zod schema** — no prose-parsing heuristics. Clarification is a first-class field, not a guess. Auto-retries on schema failure. |
| 🗜️ **Context-compressed** | Agents never see the full history. Workspace / round / artifact **summary services** keep every call inside a token budget. |
| 💥 **Crash-safe** | A crash mid-round is recovered from `stage-progress` events — completed agent work is never lost, the stale lock is released, and only unfinished stages re-run. |
| 💸 **Cost-governed** | Per-session **token budgets** and per-stage **model tiering** (cheap models for critique/summary, strong model for proposals) keep spend bounded. |

---

## 🧬 How a round works

```
                    ┌──────────────────────────────────────────────┐
   GitHub repo ─▶   │            RepoScope Engineering Room         │
                    └──────────────────────────────────────────────┘
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
   👷 Senior       🔐 Security     ⚡ Performance     📦 Product
   (architecture)  (threats)      (latency/scale)   (UX / velocity)
        │               │               │               │
        └───────────────┴───────┬───────┴───────────────┘
                                 ▼
   1. PROPOSE   each agent independently drafts a structured proposal
   2. CRITIQUE  agents cross-review by maximum-conflict routing
   3. REVISE    agents update positions in light of critiques
   4. CONSENSUS emergent decisions are synthesized → Artifacts
                                 │
                                 ▼
        📄 Artifacts  ·  ✅ Decisions  ·  ⚠️ Risks  ·  ❓ Open questions
```

Each round runs those four stages in a single transaction, generates summaries, then lands in `awaiting-intervention` — where **you** can inject constraints before the next round auto-advances.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+**
- A **Qwen / DashScope** API key ([get one here](https://bailian.console.alibabacloud.com)) — or any OpenAI-compatible endpoint.

### 1. Install

```bash
git clone https://github.com/xayrullonematov/RepoScope.git
cd RepoScope
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Fill in the essentials:

| Variable | Purpose |
|---|---|
| `LLM_API_KEY` | Your DashScope (or OpenAI-compatible) API key |
| `LLM_API_ENDPOINT` | e.g. `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `LLM_MODEL` | Primary model — default `qwen3.5-plus` |
| `LLM_MODEL_CRITIQUE_TIER` | Cheaper tier for critique — default `qwen3-coder-next` |
| `LLM_MODEL_SUMMARY_TIER` | Cheapest tier for summaries — default `qwen-turbo` |
| `GITHUB_TOKEN` | *(optional)* raises the public GitHub rate limit |
| `DEMO_PASSWORD` | *(optional)* gates the app behind a password |

### 3. Set up the database

```bash
npx prisma db push     # sync schema.prisma → SQLite
npx prisma generate    # regenerate the client into src/generated/prisma
```

### 4. Run

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**, paste a GitHub repo URL, and watch the room convene.

---

## 🛠️ Commands

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run test       # vitest (one-shot)

# Run a single test file / by name
npx vitest run src/lib/state-projector.test.ts
npx vitest run -t "pure function round-trip"
```

> ℹ️ Tests run against a **separate `test.db`** and truncate all tables before each test. Run `npx prisma db push` once against it before your first test run.

---

## 🧪 Testing philosophy

Correctness properties from the design spec are enforced with **property-based tests** ([`fast-check`](https://github.com/dubzzz/fast-check)) — not just hand-picked examples. Invariants like *projection round-trip*, *snapshot ≡ full projection*, and the *four-agent invariant* are checked across thousands of generated event logs. When event handling, artifacts, or projection change, the property test changes with them.

---

## 🗺️ Architecture at a glance

```
src/
├── app/
│   ├── api/sessions/[sessionId]/   REST: rounds · events · artifacts · intervene
│   │                               advance · replay · export · token-usage · results
│   └── ...                         App Router UI
├── lib/                            Domain layer
│   ├── state-projector.ts          ⭐ pure events → SessionState
│   ├── round-orchestrator.ts       drives proposal→critique→revision→consensus
│   ├── agent-executor.ts           prompt → tier select → LLM → validate → track
│   ├── llm-provider.ts             OpenAI-compatible client (retry, backoff, timeout)
│   ├── crash-recovery.ts           replays stage-progress to resume mid-round
│   ├── github-fetcher.ts           repo grounding for the proposal stage
│   └── ...                         stores · summary services · token budget
├── schemas/                        Zod schemas per stage (proposal · critique · …)
├── components/workspace/           outcome-focused UI panels
└── generated/prisma/               generated Prisma client (not in node_modules)
```

**Core invariants** (the load-bearing ones):

- 🧷 **Event sourcing** — the only mutable state is `Artifact`; everything else replays from events. `projectSessionState` stays *pure*.
- 🧾 **Structured outputs** — Zod-validated, retry-on-failure, clarification as a first-class field.
- 🗜️ **Summaries over history** — agents receive compressed context, never the raw log.
- 🔒 **Session lock** — one round at a time; concurrent starts return `409`; stale locks (>5 min) auto-recover.

📚 The full spec lives in [`.kiro/specs/ai-engineering-room/`](.kiro/specs/ai-engineering-room/) — `design.md` is the source of truth for component contracts and the 23 correctness properties.

---

## 🌐 Deployment

RepoScope runs on **Alibaba Cloud ECS** via Docker / Docker Compose, fronted by host **Nginx** with Let's Encrypt TLS.

- 🔗 **Live demo:** [reposcope.myrepo.xyz](https://reposcope.myrepo.xyz)
- 📄 **Deployment proof:** [`deployment/alibaba-cloud.md`](deployment/alibaba-cloud.md) — platform, commands, and how to verify the host is Alibaba Cloud ECS.
- 🛰️ **Runtime proof endpoint:** [`/api/deployment-proof`](https://reposcope.myrepo.xyz/api/deployment-proof) — returns safe, non-sensitive deployment metadata (no secrets).

---

## 🧰 Tech Stack

**Framework** Next.js 16 (App Router) · React 19 · TypeScript 5
**Data** Prisma 7 + libSQL/SQLite adapter · event-sourced persistence
**AI** Qwen via OpenAI-compatible DashScope · pluggable (OpenAI / AWS Bedrock backends included)
**Validation** Zod 4 · **Testing** Vitest + fast-check · **UI** Tailwind CSS 4 · Framer Motion · lucide-react · SWR

---

<div align="center">

Built for the **Qwen Cloud Global AI Hackathon** · Track 3 — Agent Society
[MIT Licensed](LICENSE)

</div>
