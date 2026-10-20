---
'playwriter': minor
---

Add Playwriter actions to Chrome menus. **Record Skill** and **Remote control** start only from the in-page toolbar; the menus add element actions and sharing shortcuts.

```
page right-click > Playwriter         extension icon right-click
├─ Copy Playwriter Locator for this element
├─ ───────────                ┐
├─ Copy remote agent prompt   │ only while sharing ──> same items
├─ Copy remote id             │
└─ Stop sharing               ┘
```

- **Copy Playwriter Locator** works on any tab, even before you enable Playwriter on it. It pins the right-clicked element (including inside open shadow roots), copies the `playwriter -e 'inspectPinnedElement(...)'` command, and attaches the tab.
- Short toasts confirm each action, like `Copied locator`. A short sound plays after every copy.
- The toolbar and the menus share one Remote control state, so you can start sharing from the toolbar and stop it from the menu.

Fixes #126
