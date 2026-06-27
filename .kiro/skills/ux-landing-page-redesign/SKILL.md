---
name: ux-landing-page-redesign
description: Redesign landing pages for developer tools with strong first-time-user clarity, conversion-focused UX, mobile-first layout, clear copy, sample output previews, and reduced internal product terminology. Use when improving landing pages, onboarding flows, repo analysis tools, AI developer tools, or confusing product entry flows.
---

## Goal

Redesign the landing page so a first-time user understands the product in 5 seconds.

The product is a GitHub repository review tool. The user-facing promise is:

"Paste a GitHub repo. Choose what you want checked. Get a prioritized engineering report with file-level findings, evidence, and suggested fixes."

Do not center the UX around internal system mechanics such as agents, rounds, sessions, artifacts, consensus, token budgets, or debate stages.

## Core UX principles

1. Sell the outcome, not the internal process.
2. Make the first action obvious.
3. Show proof of value before asking for effort.
4. Use simple developer-friendly language.
5. Hide advanced concepts by default.
6. Make the page mobile-first and accessible.
7. Every section should answer one user question:
   - What is this?
   - What do I paste?
   - What will I get?
   - Why should I trust it?
   - What do I do next?

## Required landing page structure

### 1. Hero

Use this messaging direction:

Headline:
"Review any GitHub repo in minutes"

Subheadline:
"Paste a public repository and get a prioritized engineering report with bugs, security risks, architecture issues, and production-readiness gaps."

Primary input:
GitHub repo URL field.

Primary CTA:
"Analyze repo"

Secondary CTA:
"See sample report"

Helper text:
"Public GitHub repos work instantly. Private repo support is coming later."

Do not mention:
- sessions
- rounds
- debate
- consensus
- artifacts
- token budget
- model providers

### 2. Review type selector

Show clear options:
- Security review
- Bug hunt
- Production readiness
- Architecture review
- Explain this repo
- Refactor priorities

Default selected option:
Production readiness.

Each option should have a one-line explanation.

### 3. Sample report preview

Add a realistic static sample report section.

It must show:
- Overall readiness: Medium risk
- Findings: 7
- Critical: 1
- High: 2
- Medium: 4

Show 3 finding cards:
1. Long-running review blocks request lifecycle
2. Demo password gate uses weak access control
3. Missing CI build/test pipeline

Each finding card should include:
- Severity
- Location
- Why it matters
- Suggested fix

### 4. How it works

Use 3 simple steps:
1. Paste repo
2. AI reviewers inspect important files
3. Get a prioritized fix plan

Keep technical process hidden under an optional disclosure.

### 5. Trust / differentiation

Explain why this is better than asking a single chatbot:
- Specialized reviewers check from different angles
- Findings are structured into a report
- Output includes file-level evidence
- Fixes can be copied into coding tools

### 6. Final CTA

Repeat:
"Analyze your repo"

## Terminology rules

Replace:
- Session → Review
- Agent → AI reviewer
- Debate → Review process
- Artifact → Finding
- Consensus → Final report
- Intervention → Add instruction
- Token budget → Usage limit
- Replay → Activity log
- Start round → Analyze repo

## Visual style

Use a modern dark developer-tool aesthetic:
- near-black background
- violet accent
- clean cards
- strong spacing
- readable font sizes
- minimal animation
- no mascots
- no generic AI sparkles
- no excessive glassmorphism

## Acceptance criteria

The landing page is successful if:
- A new user knows what the product does without asking questions.
- The user knows exactly where to paste a repo.
- The user understands what report they will receive.
- Internal workflow complexity is hidden.
- The main path is paste repo → choose review type → analyze repo.
- The page feels like a serious engineering tool.
