---
'playwriter': minor
---

`connectViaExtension()` no longer closes tabs on `close()` by default. Each SDK script closes the tabs it opens:

```ts
await using connection = await connectViaExtension({ tabGroup: 'docs' })
await using page = await connection.browser.contexts()[0].newPage() // closes its tab at scope end
await page.goto('https://example.com')
```

Tabs left open stay in Chrome, so a later process or another SDK script sharing the tab can keep using it. Pass `closeTabsOnEnd: true` to get the old behavior: `close()` also closes every tab the connection opened, plus popups they opened.
