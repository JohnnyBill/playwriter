---
"playwriter": patch
---

Stop a timed-out `execute` from overlapping the next one. A timeout does not cancel the running script, so later calls in that session now fail fast with "This code did not run" until the old script settles, instead of running concurrently with it. The next execute after it settles reports whether it finished or failed, and how late. `reset` still works while it runs, and a stale script can no longer call `resetPlaywright()` after its execute returned.

Screenshots and `screenshotWithAccessibilityLabels` now always restore the hidden toolbar, scrollbars, caret and labels when capture fails.
