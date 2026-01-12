# Implementation Plan - Master Overhaul: React Ink CLI, Rolling Memory & Docker Root Upgrade

## Phase 1: Infrastructure & Backend Core [checkpoint: 74e7328]
This phase focuses on fixing the "Muscle" (Docker) and preparing the "Brain" (Backend) for infinite context.

- [x] Task: Docker Privilege & Networking Upgrade [commit: f0744a1]
    - [ ] Sub-task: Write Tests: Verify `createContainer` config includes `Privileged: true` and `CapAdd`.
    - [ ] Sub-task: Implement: Update `mikky-os-backend/src/lib/docker.ts` to use correct security options and listen on `0.0.0.0`.
- [x] Task: Implement Rolling Summary Memory (The Librarian) [commit: e4f3305]
    - [ ] Sub-task: Write Tests: Create unit tests for a `summarizeContext` function in `mikky-os-backend/src/lib/llm.ts` that mocks OpenAI responses.
    - [ ] Sub-task: Implement: Add `summarizeContext` function to call OpenRouter with a summarization prompt.
- [x] Task: Integrate Infinite Context into Agent Workflow [commit: 20550b4]
    - [ ] Sub-task: Write Tests: Mock `inngest/agent.ts` to verify it calls `summarizeContext` when history > 3 messages.
    - [ ] Sub-task: Implement: Update `mikky-os-backend/src/inngest/agent.ts` to fetch full history from Convex and apply the summarization logic.
- [ ] Task: Conductor - User Manual Verification 'Infrastructure & Backend Core' (Protocol in workflow.md)

## Phase 2: CLI Foundation & Ink Setup [checkpoint: 5180832]
This phase establishes the React Ink environment and basic UI shell.

- [x] Task: Initialize React Ink Project [commit: 532f8ed]
    - [ ] Sub-task: Write Tests: Verify `mikky-cli` build script runs and outputs a valid JS file.
    - [ ] Sub-task: Implement: Refactor `mikky-cli` to use `ink`, `react`, `meow`. Create `src/ui.tsx` as entry point.
- [x] Task: Implement Persistent Input & Auto-Focus [commit: 6268f7d]
    - [ ] Sub-task: Write Tests: Test `<Input>` component renders and maintains focus.
    - [ ] Sub-task: Implement: Create `<ChatInput>` component with auto-focus and 5-line expansion logic.
- [x] Task: Implement Scrollable Chat History [commit: b469fa5]
    - [ ] Sub-task: Write Tests: Test `<MessageList>` renders an array of messages.
    - [ ] Sub-task: Implement: Create `<MessageList>` component using `ink-scroll-area` or custom logic to handle overflow.
- [ ] Task: Conductor - User Manual Verification 'CLI Foundation & Ink Setup' (Protocol in workflow.md)

## Phase 3: Interactive Components & Streaming
This phase adds the "Gemini-style" interactivity and live log streaming.

- [x] Task: Implement Inline Authorization Component [commit: 1a69769]
    - [ ] Sub-task: Write Tests: Test `<AuthPrompt>` renders Yes/No options and captures selection.
    - [ ] Sub-task: Implement: Create `<AuthPrompt>` using `ink-select-input`. Add locking state after selection.
- [x] Task: Connect CLI to Convex & Streaming Logs [commit: 86620cf]
    - [ ] Sub-task: Write Tests: Mock Convex client to verify subscription to `scanLogs`.
    - [ ] Sub-task: Implement: Integrate Convex client in `mikky-cli`. Create `<LogStream>` component that collapses/expands based on status.
- [ ] Task: Conductor - User Manual Verification 'Interactive Components & Streaming' (Protocol in workflow.md)
