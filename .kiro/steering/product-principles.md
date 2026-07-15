# Product Principles

## Human-in-the-Room

RepoScope is a shared engineering room, not a chatbot. Humans and AI engineers collaborate through shared structured project state. Human directives are team context and must influence subsequent agent work in an auditable way.

### Implications

- Human input is never ephemeral. Every directive is persisted as a first-class event in the append-only log and is subject to the same replay, projection, and auditability guarantees as agent-produced events.
- Agents do not "follow orders." They incorporate human directives into their reasoning the same way they incorporate constraints: by weighing them against their objective function and citing them in their output.
- The UI must make it obvious when a human directive has been issued, which agents have seen it, and how it influenced their subsequent output.
- Directive provenance is always traceable. Any observer can replay the event log and identify exactly which human directives were active at any point in time.
