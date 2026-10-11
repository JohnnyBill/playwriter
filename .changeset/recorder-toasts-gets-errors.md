---
'playwriter': minor
---

Skill recordings now explain why a step failed:

- **Toasts and alerts**: new `toast` events hold the text of `role=alert`, `role=status` and `aria-live` regions. A click that sent no request because the site refused it on the client (limits, validation) now shows the reason.
- **Same-origin GETs**: xhr/fetch GETs to the page origin are recorded (quota checks, job polling). Cross-origin GETs are still skipped.
- **Compressed response bodies**: gzip and brotli JSON responses are now stored instead of `responseBodyOmitted: "encoded"`.
- **`afterAction`**: `network` and `toast` events carry the id of the action that happened up to 3s before them.
- **`recorder events --errors`** prints only failed requests, console errors, page errors and toasts. **`--exclude <regex>`** drops noisy network URLs. The thin timeline merges runs of identical requests into one event with `repeat` and `lastId`.
- **`recorder frame <eventId> [--offset ms]`** prints the path of the screencast frame at an event.
