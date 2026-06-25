---
'playwriter': minor
---

Add headless browser mode and Chrome install command.

**`playwriter browser install`** downloads Chrome for Testing from Google into `~/.playwriter/browsers/`. Detects platform automatically, skips if already installed.

**`playwriter session new --browser headless`** launches a headless Chrome and creates a session without needing the extension or user's browser. Multiple sessions share the same Chrome process. Each session gets its own isolated context.

```bash
playwriter browser install
playwriter session new --browser headless
playwriter -s 1 -e "await page.goto('https://example.com')"
```

Recording is not available in headless mode. If no Chrome binary is found, the CLI suggests running `playwriter browser install`.

`playwriter browser list` now shows `headless` as an option when a Chrome binary is available.
