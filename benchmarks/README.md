# Review Quality Benchmark

This benchmark compares one comprehensive Qwen reviewer with RepoScope's four-agent debate on the same pinned repository revision.

## Run

```bash
npm run benchmark:quality -- --trials 3
```

Required environment variables are the same as the application (`LLM_API_KEY`, `LLM_API_ENDPOINT`, `LLM_MODEL`, and optionally `GITHUB_TOKEN`). The harness uses an isolated SQLite database at `benchmarks/benchmark.db` and writes auditable JSON and Markdown reports under `benchmarks/output/`.

## Controls

- Same Qwen model family, repository ref, problem statement, read-only tools, call cap, and byte cap.
- At least three paired trials; arm order alternates to reduce provider-load bias.
- Ground truth is a reviewed, pinned manifest—not model-generated labels.
- Deterministic matching requires an exact known path or at least 60% reviewed-keyword coverage.
- The same low-temperature Qwen verifier evaluates file-backed findings from both arms.
- Raw outputs, matches, token usage, and costs remain in the JSON report for audit.

The report is intentionally scoped to one pinned revision. It must not be presented as evidence that debate is universally superior across repositories.
