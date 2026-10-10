---
'playwriter': patch
---

Keep the page connected when another extension injects an iframe after Playwriter attaches.

Password managers like 1Password inject a `chrome-extension://` iframe when a form field gets focus. Chrome then detaches the debugger from the whole tab, so the agent's `page` closed with "Target page, context or browser has been closed" and the tab left its group.

The extension now removes those iframes (also inside closed shadow roots), reattaches the debugger with the same session and restores the page state Playwright had set up: enabled domains, init scripts, exposed functions, viewport and other emulation. The same `page` keeps working. The other extension's injected menu is removed while Playwriter controls the tab.

Chromium treats this detach as intended behavior: https://issues.chromium.org/issues/498987209

Fixes #127
