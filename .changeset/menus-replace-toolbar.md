---
'playwriter': minor
---

Add Playwriter actions to Chrome menus. The in-page toolbar stays on attached tabs; the menus offer the same actions on any tab.

```
page right-click > Playwriter         extension icon right-click
├─ Copy Playwriter Locator for this element
├─ ───────────
├─ Record skill: record your clicks and typing for an agent  ──> same items
├─ Share browser with a remote agent…
└─ Copy remote agent prompt, Copy remote id, Stop sharing
   (only while sharing)
```

Every icon menu item also shows on page right-click, so they are easy to find. Menu titles say what each click does. A short sound plays when recording starts and after every copy.

- **Copy Playwriter Locator** works on any tab, even before you enable Playwriter on it. It pins the right-clicked element (including inside open shadow roots), copies the `playwriter -e 'inspectPinnedElement(...)'` command, and attaches the tab.
- **Record skill** attaches the current tab first, then starts the recorder. Click again to stop and copy the agent prompt.
- **Share browser…** opens a small confirm window from the extension. Click **Share** to start Remote control and copy the agent prompt.
- Short toasts confirm each action, like `Copied locator`.
- The toolbar and the menus share one recorder and Remote control state, so you can start from one and stop from the other.

Fixes #126
