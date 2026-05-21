---
'playwriter': patch
---

Send auth token on `/extensions/status` and `/extension/status` requests when connecting to a remote relay. Previously these status checks didn't include the bearer token, causing 403 rejections from the host validation middleware when using `--token` with a remote `--host`.

Fixes #85
