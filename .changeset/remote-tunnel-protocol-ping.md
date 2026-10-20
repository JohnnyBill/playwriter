---
'playwriter': patch
---

Remote control relays now send WebSocket protocol pings instead of a JSON ping every 5 seconds. Cloudflare answers them at the edge, so a shared browser's tunnel no longer stays awake (and billed) while it is idle. The extension sends its tunnel keepalive every 20 seconds instead of 30.
