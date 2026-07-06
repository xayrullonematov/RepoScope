# Submission copy

## Title

RepoScope — Evidence-backed repository review by an Agent Society

## Tagline

Scope your repo before you ship.

## Short description

RepoScope is a Qwen-powered repository review system where four specialized AI
engineers inspect code, challenge opposing positions, revise their findings,
and produce a schema-validated consensus with file-level evidence and exact
debate lineage.

## Full description

One AI review can be articulate without being challenged. RepoScope replaces
that single opinion with an inspectable engineering society.

Four Qwen agents have distinct objective functions: architecture and
correctness, security and trust boundaries, performance and scale, and product
value and shipping risk. Each round follows a fixed protocol—proposal,
opposing critique, revision, and consensus. Critique routing intentionally
pairs agents with conflicting priorities so disagreement is structural rather
than cosmetic.

During proposal, agents inspect the target GitHub repository with bounded,
read-only tools. Tool calls, files read, and cap status are persisted as
execution evidence. Every stage must produce a Zod-validated structured output
before it enters the append-only event log. Consensus findings preserve exact
event references, allowing the interface to show how a proposal changed after
critique and revision.

RepoScope is designed for real execution rather than a one-shot demo. Durable
review jobs use leases and heartbeats, session locks prevent concurrent rounds,
and expired work is recovered after restarts. The application runs on Alibaba
Cloud ECS with Docker Compose, Nginx, and TLS.

The project also includes a reproducible benchmark harness comparing one Qwen
reviewer with the four-agent debate under controlled conditions. Its current
two-trial result does not establish a quality advantage for debate and shows a
clear cost increase. We include that limitation because credible Agent Society
evaluation requires falsifiable measurements, not selected anecdotes.

## Why Track 3: Agent Society

- **Specialization:** four agents optimize for materially different engineering
  objectives.
- **Interaction:** fixed opposing critique forces agents to address another
  discipline's strongest objection.
- **Adaptation:** revision records whether positions were accepted, rejected,
  strengthened, or partially conceded.
- **Collective output:** consensus contains agreements, disagreements, risks,
  decisions, and evidence chains.
- **Governance:** bounded tools, schema validation, token budgets, locks, and
  durable jobs constrain the society.
- **Observability:** persisted events expose tool usage and complete finding
  lineage in the product UI.

## Technical highlights

- Qwen through DashScope's OpenAI-compatible API.
- Bounded `list_files`, `read_file`, and `search_code` tool loop.
- Zod schemas for proposal, critique, revision, and consensus.
- Event-sourced state with snapshot-assisted projection.
- Durable SQLite/Prisma review queue with leases and recovery.
- Next.js 16 and React 19 interface.
- Alibaba Cloud ECS deployment with a public proof endpoint.

## Links

- Live app: https://reposcope.myrepo.xyz
- Deployment proof: https://reposcope.myrepo.xyz/api/deployment-proof
- Source: https://github.com/xayrullonematov/RepoScope

## Known limitation

The controlled benchmark currently contains two trials on one pinned revision.
Both arms scored zero under the current evidence matcher, so it cannot support
a claim that multi-agent debate improves review quality. The harness and raw
outputs remain useful for calibrating the evaluator and expanding the dataset.

