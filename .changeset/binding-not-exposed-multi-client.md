---
'@xmorse/playwright-core': patch
'playwriter': patch
---

Fix `Function "__pw_recorderRecordAction" is not exposed` page errors when several sessions or CDP clients share a tab. Every client got the binding call, and clients that did not expose the function rejected it before the owner answered. Now only the owning client answers, so `exposeFunction` calls and the recorder work with many sessions open.
