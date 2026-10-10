---
'playwriter': patch
---

Recordings now auto-stop when frames and events grow past 500 MB. Busy pages could write over 500 MB of screencast frames in 3 minutes. The `recording-stopped` event has `reason: "max-size"` and the total `bytes`.
