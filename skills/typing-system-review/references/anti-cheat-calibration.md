# Anti-Cheat Calibration Reference

## Goal

Detect suspicious sessions while keeping false positives low.

Primary principle:

1. Anti-cheat is risk scoring, not proof of cheating.
2. Signals should be explainable and reproducible.

## Signal Quality Rules

Each signal must pass:

1. `Stability`: robust across keyboard layout, browser, and input method.
2. `Specificity`: not heavily triggered by normal fast typists.
3. `Explainability`: easy to show user why it was triggered.

## Recommended Signal Set

1. Blocked paste/drop attempts.
2. Unrealistic sustained WPM after warm-up window.
3. Extreme short-window CPS spikes with monotonic timestamps.
4. High output volume in implausibly short elapsed time.
5. Perfect or near-perfect accuracy at extreme speed bands.

## Timestamp Integrity

Do not assign the same timestamp to every character in a multi-char insertion event if CPS uses character-level events.

Acceptable approaches:

1. Record one event per input event (event-level CPS).
2. Or distribute character timestamps with deterministic spacing.
3. Or cap per-event contribution in peak-window calculations.

## Threshold Calibration

Thresholds must be data-driven:

1. Start with conservative defaults.
2. Calibrate from clean baseline sessions.
3. Track percentile bands (`P95`, `P99`) per signal.
4. Trigger hard warnings only above calibrated high percentile.

If thresholds have no calibration evidence, severity is at least `Medium`.

## Risk Scoring Model

Prefer weighted scoring over single-rule hard fail.

Example:

1. Paste attempt: +3
2. Extreme sustained speed: +2
3. CPS outlier: +2
4. Short-time high-volume mismatch: +2
5. Perfect-high-speed combo: +1

Then map to tiers:

1. `0-2`: normal
2. `3-4`: review
3. `5+`: suspicious

## Output Requirements

When flagging suspicious runs, provide:

1. Triggered signals list
2. Raw values (e.g., peak CPS, WPM, elapsed seconds)
3. Confidence tier (`low`, `medium`, `high`)

Never present anti-cheat result as certainty without server-side corroboration.
