---
'playwriter': minor
---

Add an execute-sandbox `screenshot()` helper that saves page, clip, and locator screenshots under `./tmp` and returns inline image content when resizing support is available. `screenshotWithAccessibilityLabels()` now also supports scoped and locator-only calls, including scrolling scoped targets into view before labels are rendered.
