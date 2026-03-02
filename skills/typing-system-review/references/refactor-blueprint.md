# Refactor Blueprint Reference

## Target Architecture

Use a 4-layer structure:

1. `core/`
2. `engine/`
3. `ui/`
4. `infra/`

## Layer Responsibilities

### `core/`

Pure domain logic only:

1. Metric calculators
2. Counter transitions
3. State machine transitions
4. Anti-cheat signal evaluators

Rules:

1. No DOM access
2. No timers
3. No file/network IO

### `engine/`

Session orchestration:

1. Mode selection and mode-specific behavior
2. Timer scheduling policy
3. Event normalization into core-friendly actions

Rules:

1. Calls core APIs
2. Emits derived state snapshots for UI

### `ui/`

Presentation and interaction wiring:

1. Render text and stats
2. Bind DOM events
3. Display results and warnings

Rules:

1. No direct mutation of domain counters
2. Render from state snapshots

### `infra/`

Persistence and integration:

1. File loading
2. Local storage
3. Export/report adapters

Rules:

1. Isolated adapters with clear interfaces

## Migration Plan

### P0 (Safety)

1. Extract pure metric functions and add unit tests.
2. Extract anti-cheat evaluator into pure module.
3. Freeze current behavior with baseline tests.

### P1 (Decoupling)

1. Introduce session reducer/state machine.
2. Route input events through normalized action dispatcher.
3. Keep existing UI while replacing internals gradually.

### P2 (Extensibility)

1. Convert modes into strategy objects.
2. Add storage adapter interfaces.
3. Add telemetry hooks and calibration pipeline.

## Minimal Interface Contracts

Example contracts:

1. `core.updateSession(state, action) -> nextState`
2. `core.computeMetrics(state) -> metrics`
3. `core.evaluateAntiCheat(state) -> signals`
4. `engine.handleInputEvent(event, state) -> actions[]`
5. `ui.render(viewModel)`

## Refactor Acceptance Criteria

1. Same user-visible behavior on existing modes.
2. Counter logic test coverage for normal + edge paths.
3. New mode can be added without editing UI render internals.
4. Anti-cheat thresholds configured in one place.
