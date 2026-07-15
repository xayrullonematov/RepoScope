# Human-in-the-Room Directives - Implementation Tasks

## Group 1: Domain Layer (Types and Events)

- [ ] 1.1 Add `"human-directive"` to the `EventType` union in `src/types/domain.ts`
- [ ] 1.2 Add `HumanDirective` interface to `src/types/domain.ts` with fields: `id`, `text`, `createdAt`, `source: "human"`, `active: boolean`
- [ ] 1.3 Add `directives: HumanDirective[]` field to `SessionState` interface in `src/types/domain.ts`
- [ ] 1.4 Add `directives: HumanDirective[]` field to `WorkspaceContext` interface in `src/types/domain.ts`

## Group 2: State Projector

- [ ] 2.1 Add `handleHumanDirective` handler function in `src/lib/state-projector.ts`
- [ ] 2.2 Add `case "human-directive"` to the switch in `projectSessionState`
- [ ] 2.3 Add `case "human-directive"` to the switch in `applyEvents`
- [ ] 2.4 Initialize `directives: []` in `createEmptySessionState()`
- [ ] 2.5 Import `HumanDirective` type in state-projector imports
- [ ] 2.6 Add tests for directive projection: creation, deactivation, idempotency, and replay in `src/lib/state-projector.test.ts`

## Group 3: Context Assembler

- [ ] 3.1 Include `state.directives` in the assembled `WorkspaceContext` in `src/lib/context-assembler.ts`
- [ ] 3.2 Add directives to the token budget truncation logic (between workspace summary and constraints)
- [ ] 3.3 Import `HumanDirective` type if needed
- [ ] 3.4 Add tests for context assembly with directives in `src/lib/context-assembler.test.ts`

## Group 4: Prompt Builder

- [ ] 4.1 Add `formatDirectives` helper function in `src/lib/prompt-builder.ts`
- [ ] 4.2 Include `## Human Directives (active for this session)` section in `buildStableSystemBlock`
- [ ] 4.3 Format each directive as `- [directive] <text>`
- [ ] 4.4 Return "None" when directives array is empty
- [ ] 4.5 Add tests for directive formatting in prompt builder tests

## Group 5: API Route

- [ ] 5.1 Create `src/app/api/sessions/[sessionId]/directives/route.ts`
- [ ] 5.2 Implement POST handler: validate body, generate cuid, append `human-directive` event with `active: true`
- [ ] 5.3 Implement DELETE handler: validate body, append `human-directive` event with `active: false`
- [ ] 5.4 Add session existence validation
- [ ] 5.5 Follow error handling patterns from existing `intervene/route.ts`

## Group 6: UI Components

- [ ] 6.1 Create `src/components/workspace/TeamRoomPanel.tsx` - top-level container composing sub-panels
- [ ] 6.2 Create `src/components/workspace/DirectivePanel.tsx` - input form for new directives
- [ ] 6.3 Create `src/components/workspace/TeamActivityFeed.tsx` - chronological event feed
- [ ] 6.4 Create `src/components/workspace/DirectivesList.tsx` - active directives display with deactivation
- [ ] 6.5 Wire up `useEventStream` hook for real-time updates
- [ ] 6.6 Add Framer Motion animations following existing component patterns

## Group 7: Integration and Testing

- [ ] 7.1 Verify state projector handles `human-directive` events at any replay index via `projectStateAtIndex`
- [ ] 7.2 Verify snapshot restoration correctly initializes empty `directives` for old snapshots
- [ ] 7.3 End-to-end test: create directive via API, verify it appears in assembled context, verify prompt includes it
- [ ] 7.4 Verify deactivated directives do not appear in context or prompts
- [ ] 7.5 Verify existing `user-intervention` flow is unaffected

## Dependencies

- Group 1 must be completed first (types are imported by all other groups)
- Groups 2, 3, 4, and 5 depend on Group 1 but are independent of each other
- Group 6 depends on Group 5 (API route) for form submission
- Group 7 depends on all prior groups

## Estimated Effort

| Group | Complexity | Files Modified | Files Created |
|-------|-----------|---------------|--------------|
| 1 | Low | 1 | 0 |
| 2 | Medium | 2 | 0 |
| 3 | Medium | 2 | 0 |
| 4 | Low | 1-2 | 0 |
| 5 | Medium | 0 | 1 |
| 6 | High | 0 | 4 |
| 7 | Medium | 1-2 | 0 |
