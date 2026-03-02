---
name: typing-system-review
description: System-level workflow for strict review and evolution of typing practice systems. Use when auditing logic correctness, code quality, architectural extensibility, anti-cheat reliability, and testing readiness.
---

# Typing System Review

## When to Use

Use this skill when the user asks for any of the following:

- Deep code review and strict standards audit
- Architecture rationality and scalability judgment
- Refactor planning for maintainability and modularity
- Validation of typing metrics (WPM, accuracy, error rate)
- Input pipeline correctness (IME, composition, backspace, selection)
- Anti-cheat strategy review

## Reference Files (Load On Demand)

- For metric definitions, input event accounting, and edge-case verdict rules, read `references/metric-integrity.md`.
- For anti-cheat threshold design and false-positive control, read `references/anti-cheat-calibration.md`.
- For modular refactor shape and migration phases, read `references/refactor-blueprint.md`.

## Required Outputs

Produce all outputs below in one response:

1. Findings list ordered by severity (`Critical`, `High`, `Medium`, `Low`) with file and line references.
2. Architecture verdict (`Reasonable for prototype` or `Needs refactor for growth`) with concrete reasons.
3. Risk register with impact and likelihood.
4. Refactor plan split into phases (P0/P1/P2).
5. Minimal test plan with must-pass cases.

## Review Workflow

### Step 1: Map System Boundaries

- Identify entry points, state container, render layer, domain logic, IO layer.
- Mark coupling points where UI and business logic are mixed.
- Flag single-file or god-object patterns.

### Step 2: Verify Metric Correctness

Audit definitions and implementation consistency for:

- `WPM`
- `Result Accuracy`
- `Process Accuracy`
- `Error Rate`

Before final judgment, load `references/metric-integrity.md` and compare implementation against definitions and event-accounting rules.

Mandatory edge cases:

- IME composition (`insertCompositionText`, composition lifecycle)
- Multi-character insertion in one event
- Backspace/delete behavior
- Cursor movement and selection replacement
- Over-typing beyond target length

### Step 3: Validate State Machine Integrity

State transitions must be explicit and deterministic:

- `idle -> running -> completed|time_up -> idle`

Check for:

- Duplicate finish calls
- Timer lifecycle leaks
- Stale counters after reset
- Mode-switch side effects while session is active

### Step 4: Audit Input and Anti-Cheat Reliability

Input pipeline must separate:

- Process metrics (keystroke stream)
- Result metrics (final text alignment)

Load `references/anti-cheat-calibration.md` before assigning severity for anti-cheat findings.

Anti-cheat checks must avoid false positives:

- Timestamp granularity artifacts
- Bulk insert timestamp duplication
- IME-driven event bursts
- Thresholds without calibration evidence

### Step 5: Assess Extensibility

Score architecture on these dimensions (1-5):

- Separation of concerns
- Testability of core logic
- Mode plug-in capability
- Data persistence readiness
- UI replacement cost

For target modular boundaries and migration sequencing, load `references/refactor-blueprint.md`.

If any dimension <= 2, return `Needs refactor for growth`.

### Step 6: Enforce Engineering Standards

Non-negotiable standards:

- Core metrics logic must be pure functions (no DOM reads/writes).
- UI rendering must consume derived state, not mutate domain counters.
- Single source of truth for session state.
- Constants and thresholds centralized.
- Behavior documented in tests, not comments only.

## Architecture Target (Reference)

Refactor toward 4 layers:

1. `core/`  
   Pure calculators and validators (`metrics`, `state machine`, `anti-cheat rules`).
2. `engine/`  
   Training mode orchestration (`classic`, `timed`, `segment`, `blind`, `error-focus`).
3. `ui/`  
   DOM bindings, rendering, interaction wiring.
4. `infra/`  
   File loading, storage, telemetry, export.

## Severity Rules

- `Critical`: Data correctness broken in normal user paths or unrecoverable state corruption.
- `High`: Frequent mismeasurement, high false positives, or strong regression risk.
- `Medium`: Design debt reducing maintainability/extensibility.
- `Low`: Style, UX polish, and minor consistency issues.

## Minimal Must-Pass Test Matrix

At minimum include:

1. First keystroke starts timer exactly once.
2. Timed mode auto-finishes at countdown zero.
3. Backspace updates result counters correctly.
4. IME composition does not inflate process counters.
5. Multi-char insert does not distort CPS peak calculation.
6. Mode switch when idle does not corrupt active text.
7. Reset returns all counters and UI state to baseline.

## Response Template

Use this output structure:

1. `Findings (by severity)` with `path:line`.
2. `Architecture Verdict`.
3. `Risk Register` (impact + likelihood).
4. `Refactor Plan (P0/P1/P2)`.
5. `Test Plan`.
6. `Residual Risks`.
