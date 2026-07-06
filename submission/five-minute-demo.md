# Five-minute Agent Society demo

Target runtime: **4:45–5:00**. Rehearse with a completed session already open;
do not depend on a fresh model run finishing during the recording.

## 0:00–0:25 — Hook: one answer is not review

**On screen:** Slide 1, then the RepoScope landing page.

**Say:**

> A single AI reviewer can sound certain while missing the perspective that
> would challenge it. RepoScope turns repository review into an inspectable
> engineering debate. Four Qwen agents optimize for architecture, security,
> performance, and product risk—then challenge, revise, and converge on a
> report a developer can actually audit.

## 0:25–0:55 — The Agent Society

**On screen:** Slide 2.

**Say:**

> This is not four copies of one prompt. Each agent has a distinct objective
> function. Critique routing deliberately pairs the agents most likely to
> disagree: Senior versus Performance, Security versus Product. Every round is
> proposal, critique, revision, then consensus.

**Point to:** the four roles and the stage sequence.

## 0:55–1:25 — Start with the user outcome

**On screen:** Landing page. Paste a prepared public GitHub URL and show the
review-type choices, but use the pre-completed session for the rest of the demo.

**Say:**

> The user experience stays simple: paste a GitHub repository, choose the risk
> you care about, and get a file-level report. The multi-agent machinery is a
> trust layer, not extra work for the user.

**Transition:** Open the prepared completed session.

## 1:25–2:15 — Show the report and finding lineage

**On screen:** Report overview, then **How this finding evolved**.

**Say:**

> The report leads with the verdict and concrete fixes. But every consensus
> finding can expose how it evolved: the original proposal, the opposing
> critique, the revision, and the final consensus. These are exact persisted
> event references—not a summary invented by the UI.

**Point to:** one lineage with all four stages and the agent names.

**Proof sentence:**

> If the evidence chain is incomplete, RepoScope does not fabricate a lineage.

## 2:15–3:05 — Show Qwen tool use and structured output

**On screen:** **Agent Debate → Qwen evidence**. Expand the panel.

**Say:**

> Before a proposal is accepted, each Qwen agent can inspect the repository
> through bounded, read-only tools. This panel is derived from persisted stage
> events and shows the stage, files read, tool-call count, and whether the cap
> was hit. The final response must match the stage's Zod schema. Invalid JSON is
> repaired and retried before anything becomes a typed debate event.

**Point to:** tool calls, files read, “schema validated,” then a proposal or
critique message beside the evidence panel.

## 3:05–3:45 — Explain why this is an engineered society

**On screen:** Slide 5.

**Say:**

> Coordination is durable. The debate is an append-only event log. A background
> review job has a lease and heartbeat. If the server restarts, expired work is
> recovered and retried without pretending it completed. Session locks prevent
> two rounds from mutating the same review at once. That makes the society
> observable and recoverable, not just a chain of API calls.

## 3:45–4:15 — Evaluation without inflated claims

**On screen:** Slide 6.

**Say:**

> We also built a reproducible single-reviewer versus four-agent harness. Both
> arms use the same pinned repository, Qwen family, problem, tools, and limits.
> The current two-trial report does not prove debate is better—it scores both
> arms at zero evidence support and shows debate costs more. That is a real
> limitation and a useful result: our next work is evaluator calibration and a
> broader repository set, not a marketing claim the data cannot support.

## 4:15–4:40 — Alibaba Cloud proof

**On screen:** Slide 7 or
`https://reposcope.myrepo.xyz/api/deployment-proof`.

**Say:**

> RepoScope runs on Alibaba Cloud ECS in Singapore, behind Docker Compose,
> Nginx, and TLS. The public proof endpoint reports the safe region result from
> the ECS metadata service, and the submission includes independent ASN and ECS
> console evidence.

## 4:40–5:00 — Close

**On screen:** Closing state on Slide 7.

**Say:**

> RepoScope's thesis is simple: important code decisions should not depend on
> one unchallenged model answer. Let agents disagree, require structured
> evidence, preserve the lineage, and give the developer the final say. Scope
> your repo before you ship.

## Recording fallbacks

- If the live site is slow, switch to the prepared session; never wait on a
  model call during the five-minute recording.
- If a finding lacks four-stage lineage, select another finding. Do not imply
  lineage exists when its evidence chain is incomplete.
- If the deployment endpoint cannot reach ECS metadata, use the captured
  endpoint, ECS console, metadata-region, and ASN screenshots.
- Do not claim the benchmark proves debate superiority.

