---
'playwriter': patch
---

Fix new tabs missing from `context.pages()` when Chrome creates them inside a
Playwriter group without sending a later group-change event. The extension also
checks group membership when an untracked tab starts loading, keeping child tabs
controllable without another extension click.

Fixes #133
