# Requirements Document

## Introduction

The AI Engineering Room is a production-quality web application where multiple AI engineering agents collaborate through a shared workspace to solve design problems. Unlike traditional chatbot interfaces, the system models a real engineering design room: agents propose solutions, critique each other, revise positions, and negotiate toward emergent consensus. Each agent makes real LLM API calls with a distinct objective function, independent reasoning, and full access to shared workspace state. The system produces structured engineering artifacts — architecture decisions, identified risks, trade-off analyses, and recommendations — that evolve collaboratively across rounds. Users observe the collaborative process, inject constraints between rounds, and guide the discussion toward actionable engineering decisions. The system uses event sourcing for full persistence and replay capability, context compression for scalable multi-round sessions, structured output schemas for reliable agent communication, and token budget management for cost control, all built on a minimal infrastructure of Next.js, Prisma, and SQLite.

## Glossary

- **Engineering_Room**: The primary workspace where a design session takes place, containing all agents, artifacts, debate history, and consensus state
- **Agent**: An autonomous AI participant powered by real LLM API calls with a distinct objective function and independent reasoning capability
- **Senior_Engineer_Agent**: An agent focused on architectural quality, code maintainability, and system design trade-offs
- **Security_Engineer_Agent**: An agent focused on threat modeling, vulnerability prevention, and security best practices
- **Performance_Engineer_Agent**: An agent focused on latency, throughput, resource efficiency, and scalability concerns
- **Product_Engineer_Agent**: An agent focused on user experience, feature completeness, shipping velocity, and business value
- **Shared_Workspace**: The collective state visible to all agents, containing artifacts, proposals, critiques, revisions, workspace summary, and consensus data
- **Round**: A structured phase of agent interaction consisting of proposal, critique, revision, and consensus synthesis stages
- **Proposal_Stage**: The first stage of a round where each agent independently generates a structured proposal output
- **Critique_Stage**: The second stage where agents cross-review other agents' proposals based on their objective functions
- **Revision_Stage**: The third stage where agents revise their positions based on critiques received
- **Consensus_Synthesis_Stage**: The final stage where consensus is derived from the complete interaction history
- **Event**: An immutable record of an interaction stored in the event log (proposal, critique, revision, user intervention, consensus update, artifact change, or clarification request)
- **User_Intervention**: An action by the user to inject constraints, guidance, or information between rounds
- **Constraint**: A requirement or limitation provided by the user that agents must consider in subsequent reasoning
- **Artifact**: A mutable working document produced collaboratively by agents, representing a structured engineering output such as a decision, risk, assumption, trade-off analysis, or recommendation
- **Artifact_Type**: The classification of an artifact: decision, risk, assumption, tradeoff, open-question, or recommendation
- **Artifact_Status**: The lifecycle state of an artifact: draft, accepted, or rejected
- **Workspace_Summary**: A compressed representation of the current workspace state including artifact summaries, round summaries, and key decisions, maintained for context-efficient agent calls
- **Round_Summary**: A condensed summary of a completed round capturing key proposals, critiques, revisions, and outcomes without full event detail
- **Token_Budget**: A configurable limit on cumulative token usage per session to control LLM API costs
- **Structured_Output**: A strongly-typed JSON response from an agent conforming to a defined schema for the current stage
- **Clarification_Request**: A first-class structured field in agent output indicating the agent requires additional information before proceeding
- **Consensus_Dashboard**: A UI component displaying the current emergent consensus state derived from agent interaction history
- **Debate_Timeline**: A collapsible chronological visualization of all agent interactions within a session, secondary to the artifacts and decisions view
- **Agent_Panel**: A secondary UI component showing an individual agent's current position, reasoning, and stance
- **Artifacts_Panel**: A primary UI component displaying all workspace artifacts with their current status, contributing agents, and version history
- **Engineering_Outcomes_Panel**: A UI component displaying decisions made, risks identified, and open questions remaining
- **Decision_Log**: A tracked record of all accepted decisions with provenance showing which agents contributed and their reasoning
- **Session**: A complete design discussion from initial prompt through final consensus, containing one or more rounds
- **Objective_Function**: The distinct evaluation criteria that guide each agent's reasoning and critique priorities
- **Context_Window_Budget**: A configurable per-agent-call limit on the number of tokens provided as context
- **Model_Tier**: A configuration that allows different LLM models to be assigned to different stages based on complexity requirements
- **TokenBudgetManager**: A service that tracks cumulative token usage per session and enforces budget limits
- **WorkspaceSummaryService**: A service that maintains a running compressed summary of workspace state for agent context
- **RoundSummaryService**: A service that produces condensed summaries of completed rounds
- **ArtifactSummaryService**: A service that summarizes current artifact state for inclusion in agent context

## Requirements

### Requirement 1: Session Initialization and Clarification Protocol

**User Story:** As a user, I want to start a new engineering design session by providing a problem description, so that AI agents can begin collaborating on a solution, with an explicit structured mechanism for agents to request clarification.

#### Acceptance Criteria

1. WHEN the user submits a problem description, THE Engineering_Room SHALL create a new Session and persist a session-created event to the event log.
2. WHEN a new Session is created, THE Engineering_Room SHALL instantiate four agents: Senior_Engineer_Agent, Security_Engineer_Agent, Performance_Engineer_Agent, and Product_Engineer_Agent.
3. THE Engineering_Room SHALL accept free-form text input as the primary problem description.
4. WHERE the user provides structured constraints, THE Engineering_Room SHALL store each constraint as a separate event and include the constraints in the Shared_Workspace state visible to all agents.
5. WHEN an Agent returns a Structured_Output with the needsClarification field set to true, THE Engineering_Room SHALL treat the clarification as a first-class structured request containing an array of specific questions.
6. WHEN one or more agents return Structured_Outputs with needsClarification set to true, THE Engineering_Room SHALL aggregate all questions from all agents and present them to the user, pausing the round until the user responds or dismisses the requests.
7. WHEN the user responds to clarification questions, THE Engineering_Room SHALL persist the responses as constraint events and include them in the Shared_Workspace for all subsequent agent calls.
8. THE Engineering_Room SHALL not use text-based heuristic parsing to detect clarification needs from agent prose output.

### Requirement 2: Agent Autonomy and LLM Integration

**User Story:** As a user, I want each agent to reason independently using real LLM calls with distinct objectives and summarized context, so that the collaboration produces genuinely diverse engineering perspectives without exceeding context limits.

#### Acceptance Criteria

1. THE Engineering_Room SHALL make independent LLM API calls for each Agent during every stage of a Round.
2. THE Senior_Engineer_Agent SHALL evaluate proposals using an Objective_Function focused on architectural quality, code maintainability, and system design trade-offs.
3. THE Security_Engineer_Agent SHALL evaluate proposals using an Objective_Function focused on threat modeling, vulnerability prevention, and security best practices.
4. THE Performance_Engineer_Agent SHALL evaluate proposals using an Objective_Function focused on latency, throughput, resource efficiency, and scalability.
5. THE Product_Engineer_Agent SHALL evaluate proposals using an Objective_Function focused on user experience, feature completeness, shipping velocity, and business value.
6. WHEN making an LLM API call, THE Engineering_Room SHALL provide the Agent with the current Workspace_Summary, current round events in full, current Artifact state, and recent events rather than the complete event history.
7. THE Engineering_Room SHALL ensure each Agent's LLM prompt includes the Agent's distinct Objective_Function definition and evaluation criteria.
8. THE Engineering_Room SHALL not use scripted, simulated, or pre-determined responses for any Agent interaction.
9. THE Engineering_Room SHALL preserve the full event history in the database but SHALL NOT send the complete event history to agents in LLM API calls.

### Requirement 3: Round Structure and Progression

**User Story:** As a user, I want agents to follow a structured debate process with clear stages and strongly-typed outputs, so that design discussions are systematic and produce actionable structured outcomes.

#### Acceptance Criteria

1. THE Engineering_Room SHALL execute rounds in four sequential stages: Proposal_Stage, Critique_Stage, Revision_Stage, and Consensus_Synthesis_Stage.
2. WHEN the Proposal_Stage begins, THE Engineering_Room SHALL prompt each Agent to return a Structured_Output conforming to the ProposalOutput schema containing summary, recommendations, risks, assumptions, confidence score, artifact suggestions, and an optional clarification request.
3. WHEN the Critique_Stage begins, THE Engineering_Room SHALL provide each Agent with all proposals from the Proposal_Stage and prompt each Agent to return a Structured_Output conforming to the CritiqueOutput schema.
3a. WHEN the Critique_Stage begins, THE Engineering_Room SHALL assign each Agent exactly one other Agent's proposal to critique based on maximum objective conflict, producing exactly 4 critiques per round (one per agent) rather than exhaustive cross-critique.
4. WHEN the Revision_Stage begins, THE Engineering_Room SHALL provide each Agent with all critiques received and prompt each Agent to return a Structured_Output conforming to the RevisionOutput schema.
5. WHEN an Agent revises its position during the Revision_Stage, THE Agent SHALL indicate in the RevisionOutput whether it agrees, disagrees, partially concedes, or strengthens its original position.
6. WHEN the Consensus_Synthesis_Stage begins, THE Engineering_Room SHALL analyze the complete interaction history of the current round to derive an emergent consensus and return a ConsensusOutput schema.
7. THE Engineering_Room SHALL auto-advance from one stage to the next after all agents complete the current stage with valid Structured_Outputs.
8. WHEN a round completes, THE Engineering_Room SHALL persist the consensus state, update workspace artifacts, and allow the user to start a new round or end the session.
9. WHEN a round execution is in progress, THE Engineering_Room SHALL acquire a session-level lock preventing concurrent round starts, and SHALL release the lock when the round completes or times out after 5 minutes.
10. WHEN a stage is executing, THE Engineering_Room SHALL persist a stage-progress event for each agent as it completes, enabling the frontend to display per-agent progress during parallel execution.

### Requirement 4: Emergent Consensus

**User Story:** As a user, I want consensus to emerge naturally from agent interactions rather than being predetermined, so that the final recommendation reflects genuine collaborative reasoning.

#### Acceptance Criteria

1. THE Engineering_Room SHALL derive consensus from the complete interaction history of proposals, critiques, revisions, and agent stances within the current Session.
2. THE Engineering_Room SHALL not use hardcoded rules, voting thresholds, or predetermined agreement patterns to determine consensus.
3. WHEN generating the consensus synthesis, THE Engineering_Room SHALL use an LLM API call that receives the full current-round debate history and workspace summary as input.
4. THE Consensus_Dashboard SHALL display areas of agreement, areas of ongoing disagreement, and the strength of each position based on the interaction history.
5. WHEN agents disagree after the Revision_Stage, THE Consensus_Dashboard SHALL present the unresolved disagreements with each agent's final reasoning.
6. WHEN a new round is initiated after a previous round, THE Engineering_Room SHALL include the prior round summary and unresolved disagreements in the Workspace_Summary provided to agents.

### Requirement 5: User Intervention

**User Story:** As a user, I want to inject constraints and guidance between rounds without disrupting the agent collaboration, so that I can steer the discussion toward relevant outcomes.

#### Acceptance Criteria

1. WHEN a round completes, THE Engineering_Room SHALL present an intervention window allowing the user to add constraints before the next round begins.
2. WHEN the user submits a new Constraint during the intervention window, THE Engineering_Room SHALL persist a user-intervention event and add the Constraint to the Shared_Workspace.
3. WHEN new Constraints are added to the Shared_Workspace, THE Engineering_Room SHALL include the Constraints in subsequent LLM API calls to all Agents via the Workspace_Summary.
4. THE Engineering_Room SHALL allow the user to skip the intervention window and let the next round proceed automatically.
5. WHEN the user adds a Constraint, THE Engineering_Room SHALL display the Constraint in the Shared_Workspace view visible alongside agent interactions and artifacts.
6. THE Engineering_Room SHALL support both free-form text constraints and structured constraint entries with category labels.

### Requirement 6: Event Sourcing and Persistence

**User Story:** As a user, I want all interactions persisted as immutable events, so that I can replay sessions, audit decisions, and never lose discussion history.

#### Acceptance Criteria

1. THE Engineering_Room SHALL persist every agent interaction as an immutable Event in the SQLite database via Prisma.
2. THE Engineering_Room SHALL store the following event types: proposal, critique, revision, user-intervention, consensus-update, session-created, round-started, round-completed, clarification-request, artifact-created, artifact-updated, and artifact-status-changed.
3. WHEN an Event is persisted, THE Engineering_Room SHALL record the event type, timestamp, associated agent identifier, round number, stage, and full content payload.
4. THE Engineering_Room SHALL reconstruct the complete Shared_Workspace state from the event log for any given point in time.
5. THE Engineering_Room SHALL not rely on browser-side state as the source of truth for session data.
6. WHEN the application restarts, THE Engineering_Room SHALL restore all active sessions from the persisted event log.
7. THE Engineering_Room SHALL use Next.js API routes as the server-side interface between the frontend and the Prisma/SQLite persistence layer.
8. THE Engineering_Room SHALL persist a SessionSnapshot after each completed round containing the projected SessionState at that point, enabling O(1) state reconstruction by replaying only events since the last snapshot.
9. WHEN the application restarts with an active session whose round was in-progress, THE Engineering_Room SHALL detect which agents completed the interrupted stage (by checking persisted events) and re-execute only the incomplete agents to resume the round.
10. THE Engineering_Room SHALL persist individual agent completion events immediately as each agent finishes during parallel execution, enabling real-time progress tracking before the full stage completes.

### Requirement 7: Engineering Room UI and Outcome-Focused Layout

**User Story:** As a user, I want a workspace-style interface that prioritizes engineering outcomes — decisions, artifacts, and risks — over process details, so that the room produces actionable results rather than appearing as multiple chatbots in columns.

#### Acceptance Criteria

1. THE Engineering_Room SHALL present a workspace-based layout with the Artifacts_Panel and Engineering_Outcomes_Panel as the primary view, and Agent_Panels and Debate_Timeline as secondary collapsible views.
2. THE Engineering_Room SHALL not use chat bubble UI patterns, sequential message threads, or conversational interface metaphors.
3. THE Artifacts_Panel SHALL display all workspace artifacts prominently with their type, title, status, contributing agents, and current content.
4. THE Engineering_Outcomes_Panel SHALL display the Decision_Log containing all accepted decisions with provenance, identified risks, and open questions remaining.
5. THE Debate_Timeline SHALL be collapsible and secondary, showing a chronological sequence of all events in the current session with stage and round indicators.
6. THE Agent_Panels SHALL be secondary views showing each agent's current position, stance indicator (agree/disagree/concede/strengthen), and latest reasoning.
7. THE Shared_Workspace SHALL display the current problem description, all active constraints, and the current artifact state.
8. WHEN a round is in progress, THE Engineering_Room SHALL indicate the current stage and which agents have completed their contributions.
9. THE Engineering_Room SHALL render all agent content using markdown formatting with support for code blocks, lists, and headings.
10. THE Engineering_Room SHALL display token usage information per round, per agent, and cumulative session total in the UI.

### Requirement 8: Input System

**User Story:** As a user, I want flexible input options including free-form text and structured constraints, so that I can express design problems naturally while also providing precise technical requirements.

#### Acceptance Criteria

1. THE Engineering_Room SHALL provide a free-form text input area as the primary method for submitting problem descriptions.
2. THE Engineering_Room SHALL provide an optional structured constraints panel where users can add labeled constraints with categories.
3. WHEN the user submits a problem description, THE Engineering_Room SHALL accept the input regardless of whether structured constraints are provided.
4. THE Engineering_Room SHALL allow the user to add, edit, and remove structured constraints before and between rounds.
5. WHEN an Agent returns a Structured_Output with needsClarification set to true, THE Engineering_Room SHALL display the questions in a dedicated clarification section and allow the user to respond inline.
6. THE Engineering_Room SHALL support constraint categories including but not limited to: technical, business, timeline, and resource constraints.

### Requirement 9: Session Management and Export

**User Story:** As a user, I want to manage multiple sessions and export results including cost information, so that I can reference past design discussions and share outcomes with my team.

#### Acceptance Criteria

1. THE Engineering_Room SHALL persist all sessions and allow the user to view a list of previous sessions.
2. WHEN the user selects a previous session, THE Engineering_Room SHALL reconstruct and display the full session state from the event log.
3. THE Engineering_Room SHALL provide a session replay capability that steps through events chronologically.
4. THE Engineering_Room SHALL export a session as a structured markdown report containing the problem description, constraints, artifacts, decisions, debate summary, and final consensus.
5. WHEN exporting a session, THE Engineering_Room SHALL include each agent's final position, the reasoning chain that led to the consensus, and a session cost summary showing total token usage and estimated cost.
6. THE Engineering_Room SHALL allow the user to resume a completed session by starting a new round with the existing Shared_Workspace state and artifacts.

### Requirement 10: Infrastructure and Technology

**User Story:** As a developer, I want the system built on minimal, proven infrastructure, so that the application remains simple to deploy, maintain, and extend.

#### Acceptance Criteria

1. THE Engineering_Room SHALL use Next.js as the application framework with both frontend pages and API routes.
2. THE Engineering_Room SHALL use Prisma as the database ORM with SQLite as the database engine.
3. THE Engineering_Room SHALL use Tailwind CSS for all styling and layout.
4. THE Engineering_Room SHALL implement all server-side logic as Next.js API routes without external microservices, message queues, or Redis.
5. THE Engineering_Room SHALL use TypeScript for all application code.
6. THE Engineering_Room SHALL store all application state in the SQLite database and not depend on external state management services.
7. THE Engineering_Room SHALL structure LLM API calls through a provider abstraction layer that supports configurable LLM endpoints and model tier selection per stage.
8. THE Engineering_Room SHALL use Zod schemas for runtime validation of all Structured_Outputs returned by agents.
9. THE Engineering_Room SHALL configure SQLite in WAL mode and batch all writes from a single stage execution into a single database transaction to prevent write contention during parallel agent execution.
10. THE Engineering_Room SHALL use Prisma upsert semantics for artifact creation to atomically handle the case where two parallel agents suggest artifacts with the same title and type.

### Requirement 11: Agent Interaction Dynamics

**User Story:** As a user, I want agents to exhibit genuine collaborative dynamics including disagreement and concession expressed through structured outputs, so that the design discussion surfaces real trade-offs rather than superficial agreement.

#### Acceptance Criteria

1. WHEN an Agent disagrees with a proposal during the Critique_Stage, THE Agent SHALL articulate specific objections in the CritiqueOutput schema grounded in the Agent's Objective_Function, including a confidence score and references to specific artifacts or proposals.
2. WHEN an Agent partially concedes during the Revision_Stage, THE Agent SHALL identify in the RevisionOutput which specific points it concedes and which it maintains, with reasoning for each and updated confidence scores.
3. WHEN an Agent strengthens its position during the Revision_Stage, THE Agent SHALL provide additional evidence or arguments in the RevisionOutput from its Objective_Function perspective with references to supporting artifacts.
4. THE Engineering_Room SHALL include conflicting objective priorities in agent prompts to ensure genuine disagreements emerge naturally.
5. WHEN agents reach agreement on a point, THE Engineering_Room SHALL record the agreement as an event with the reasoning chain that led to convergence and create or update relevant artifacts.
6. THE Engineering_Room SHALL not force agents toward agreement or penalize persistent disagreement.

### Requirement 12: Workspace Artifact System

**User Story:** As a user, I want the engineering room to produce structured, evolving artifacts (decisions, risks, assumptions, trade-offs, recommendations) that accumulate across rounds, so that the session produces tangible engineering outputs rather than just conversation transcripts.

#### Acceptance Criteria

1. THE Engineering_Room SHALL maintain a collection of Artifacts in the Shared_Workspace, where each Artifact is a mutable working document distinct from immutable events.
2. THE Engineering_Room SHALL support the following Artifact_Types: decision, risk, assumption, tradeoff, open-question, and recommendation.
3. WHEN an Artifact is created, THE Engineering_Room SHALL record the Artifact_Type, title, content, Artifact_Status of draft, the creating Agent identifier, and an initial version.
4. WHEN an Agent contributes to an existing Artifact during any stage, THE Engineering_Room SHALL update the Artifact content, increment the version, and record the contributing Agent identifier and reasoning.
5. THE Engineering_Room SHALL track a version history for each Artifact containing all prior versions, the contributing Agent, and the timestamp of each change.
6. THE Engineering_Room SHALL support Artifact_Status transitions: draft to accepted, draft to rejected, accepted to draft (reopened), with each transition persisted as an artifact-status-changed event.
7. WHEN an Agent returns a Structured_Output containing artifact suggestions, THE Engineering_Room SHALL use atomic upsert operations to create new Artifacts or update existing Artifacts, preventing duplicate artifacts when multiple parallel agents suggest the same artifact title and type.
8. THE Engineering_Room SHALL persist an artifact-created event when an Artifact is first created and an artifact-updated event when an Artifact is modified.
9. THE Engineering_Room SHALL ensure Artifacts persist across rounds and accumulate throughout the session lifecycle.
10. THE Artifacts_Panel SHALL display all Artifacts with their current status, type, title, contributing agents, and version count prominently in the workspace.

### Requirement 13: Context Compression and Workspace Memory

**User Story:** As a developer, I want the system to compress and summarize prior context so that agents receive relevant information within token limits, enabling multi-round sessions without degraded quality or context overflow.

#### Acceptance Criteria

1. THE WorkspaceSummaryService SHALL maintain a running compressed summary of the current workspace state including artifact summaries, active constraints, and session progress.
2. THE RoundSummaryService SHALL produce a condensed summary of each completed round capturing key proposals, major critiques, revision outcomes, and consensus points.
3. THE ArtifactSummaryService SHALL produce a summary of the current artifact state including all artifact titles, types, statuses, and key content excerpts.
4. WHEN making an LLM API call to an Agent, THE Engineering_Room SHALL provide the current Workspace_Summary, full events from the current round only, the current Artifact state summary, and the most recent events as context.
5. THE Engineering_Room SHALL provide prior rounds only as Round_Summaries and SHALL NOT send the full event history of prior rounds to agents.
6. WHEN a round completes, THE RoundSummaryService SHALL generate a new Round_Summary and THE WorkspaceSummaryService SHALL regenerate the Workspace_Summary incorporating the latest round outcomes.
7. THE Engineering_Room SHALL preserve the complete event history in the SQLite database for replay and audit purposes regardless of context compression.
8. THE Engineering_Room SHALL support a configurable Context_Window_Budget per agent call that limits the total tokens provided as context.

### Requirement 14: Structured Agent Output Schemas

**User Story:** As a developer, I want agents to return strongly-typed structured JSON outputs validated against defined schemas, so that the system can reliably parse agent contributions, drive artifact creation, and detect malformed responses.

#### Acceptance Criteria

1. THE Engineering_Room SHALL define explicit JSON schemas for each stage output: ProposalOutput, CritiqueOutput, RevisionOutput, ConsensusOutput, and ClarificationOutput.
2. THE ProposalOutput schema SHALL include fields for: summary, recommendations array, risks array, assumptions array, confidence score (0-1), artifact suggestions array, references to other agents or artifacts, and a needsClarification field with optional questions array.
3. THE CritiqueOutput schema SHALL include fields for: summary, specific objections array, acknowledged strengths array, confidence score (0-1), risk assessments, artifact suggestions array, references, and a needsClarification field.
4. THE RevisionOutput schema SHALL include fields for: summary, stance (agree/disagree/partial-concede/strengthen), conceded points array, maintained points array, new arguments array, updated confidence score, artifact suggestions array, and a needsClarification field.
5. THE ConsensusOutput schema SHALL include fields for: areas of agreement array, areas of disagreement array, recommended decisions array, identified risks array, open questions array, overall confidence score, and artifact operations array.
6. THE Engineering_Room SHALL validate every agent Structured_Output against the corresponding Zod schema at runtime before processing.
7. IF an Agent returns a Structured_Output that fails schema validation, THEN THE Engineering_Room SHALL re-prompt the Agent with the validation error and the original prompt, allowing a maximum of two retries before recording a validation failure event.
8. WHEN an Agent Structured_Output contains artifact suggestions, THE Engineering_Room SHALL automatically create or update Artifacts in the workspace based on the structured artifact suggestion content.
9. THE Engineering_Room SHALL include the expected output schema definition in the LLM prompt for each agent call so that agents produce conforming responses.

### Requirement 15: Cost and Token Management

**User Story:** As a user, I want visibility into and control over the token usage and cost of each session, so that I can manage API expenses and make informed decisions about session length and model selection.

#### Acceptance Criteria

1. THE TokenBudgetManager SHALL track cumulative token usage (input tokens and output tokens) per session, per round, and per individual agent call.
2. WHEN a round is about to begin, THE Engineering_Room SHALL provide a cost estimation for the upcoming round based on current context size and configured model pricing.
3. THE Engineering_Room SHALL support configurable Token_Budget limits per session, and WHEN the cumulative usage approaches the budget limit, THE Engineering_Room SHALL warn the user before proceeding.
4. IF the cumulative token usage exceeds the configured Token_Budget, THEN THE Engineering_Room SHALL pause execution and require explicit user approval to continue.
5. THE Engineering_Room SHALL display token usage in the UI showing per-round usage, per-agent usage, and cumulative session totals with estimated cost in dollars.
6. THE Engineering_Room SHALL support Model_Tier configuration allowing different LLM models to be assigned to different stages, enabling cost optimization by using smaller models for less complex stages.
7. WHEN the context provided to an agent approaches the Context_Window_Budget, THE Engineering_Room SHALL apply a context truncation strategy that prioritizes current round events and artifact state over historical summaries.
8. WHEN exporting a session, THE Engineering_Room SHALL include a cost summary section showing total tokens consumed, model tiers used, and estimated total cost.

### Requirement 16: Engineering Room Differentiation and Focus

**User Story:** As a user, I want the engineering room experience to be clearly differentiated from a multi-chatbot interface by focusing on collaborative outcomes rather than individual agent conversations, so that the tool delivers genuine engineering value.

#### Acceptance Criteria

1. THE Engineering_Room SHALL position the Shared_Workspace containing artifacts and decisions as the primary focal point of the interface, occupying the largest visual area.
2. THE Engineering_Room SHALL present the Artifacts_Panel as a living document view where artifacts evolve visibly through agent contributions across rounds.
3. THE Decision_Log SHALL track all accepted decisions with full provenance showing which agents contributed, their reasoning, and what critiques led to the final form.
4. THE Engineering_Room SHALL emphasize outcomes (decisions made, risks identified, open questions remaining) over process (which agent said what in which order).
5. THE Agent_Panels SHALL be secondary and collapsible, showing agent reasoning and stance as supporting detail for the artifacts and decisions they produce.
6. THE Debate_Timeline SHALL be collapsible and serve as a detailed audit trail rather than the primary consumption view.
7. WHEN a round completes, THE Engineering_Room SHALL highlight new or updated artifacts and decisions rather than simply appending to a conversation timeline.
8. THE Engineering_Outcomes_Panel SHALL provide a consolidated view of all decisions made, all risks identified, and all open questions remaining at any point in the session.
