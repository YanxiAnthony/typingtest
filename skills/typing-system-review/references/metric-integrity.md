# Metric Integrity Reference

## Purpose

Use this reference to judge whether typing metrics are both mathematically correct and behaviorally fair.

## Canonical Definitions

1. `WPM = (result_correct_chars / 5) / elapsed_minutes`
2. `Result Accuracy = result_correct_chars / result_total_chars`
3. `Process Accuracy = process_correct_keystrokes / process_total_keystrokes`
4. `Error Rate = result_incorrect_chars / result_total_chars`

If implementation uses different definitions, it must be explicitly documented and reflected in UI labels.

## Event Accounting Contract

Process metrics and result metrics must be computed from different data sources:

1. `Result metrics` come from current input buffer vs target text alignment.
2. `Process metrics` come from committed keystroke events.

Recommended process event handling:

1. Count committed character insertions as process keystrokes.
2. Count delete/backspace as process keystrokes if your product definition says "all keystrokes".
3. Do not count transient IME composition updates as final committed keystrokes.
4. For replacement edits (selection + insert), include both delete and insert according to chosen definition.

## IME Rules

Minimum acceptable behavior:

1. Ignore `insertCompositionText` for correctness counters, or treat it as provisional.
2. Final committed text should be accounted on composition commit events only.
3. Avoid double counting when composition events are followed by final `insertText`.

If IME path is unsupported, mark as `High` severity unless product is explicitly non-IME.

## Cursor and Selection Rules

When cursor is moved:

1. Counters must remain consistent after edits in the middle of text.
2. Recalculation fallback is acceptable, but must be deterministic.
3. Prefix-only incremental logic must have a robust fallback path.

## Over-Typing and Bounds

1. Input beyond target length must not inflate result totals.
2. Extra typed chars should be either blocked or counted under documented policy.
3. UI progress must be bounded to `0-100%`.

## Severity Guide for Metric Bugs

1. `Critical`: Main metrics wrong on normal typing path.
2. `High`: Metrics wrong in common paths (IME, backspace, selection edits).
3. `Medium`: Rare path mismatches or labeling inconsistencies.
4. `Low`: Display rounding or minor wording ambiguity.

## Reviewer Checklist

1. Definition in docs equals formula in code.
2. UI label equals actual metric mode.
3. Deletion policy is explicit and implemented.
4. IME path tested and non-duplicative.
5. Cursor edits preserve counter integrity.
