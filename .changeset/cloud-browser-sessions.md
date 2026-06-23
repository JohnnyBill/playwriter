---
'playwriter': minor
---

Add cloud browser sessions via Browser Use hosted Chromium.

New CLI commands:
- `playwriter cloud login` — authenticate with the Playwriter website via device flow
- `playwriter cloud status` — list active cloud browser VMs
- `playwriter cloud subscribe` — open subscription page in browser

`playwriter session new` now discovers cloud browsers alongside local extension and direct CDP instances. Selecting a running cloud session (`cloud-1`, `cloud-2`) reattaches to the existing VM instead of creating a new one. Use `--browser cloud` to spin up a fresh VM.

Cloud sessions support `--proxy <region>` and `--custom-proxy <url>` for geo-targeted browsing. Idle sessions auto-disconnect after 10 minutes of inactivity.

Subscription quantity on the Stripe plan determines max concurrent cloud sessions per org.
