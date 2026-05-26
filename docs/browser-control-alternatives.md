# Browser control alternatives

Research captured on 2026-08-12 for future product positioning and README updates.

## The distinction that matters

"Persistent browser profile" and "the user's active browser session" are not the same thing.

Browser automation products fall into three broad categories:

1. **Active browser attachment** controls the Chrome process the user is already running, including selected or existing tabs, current cookies, extensions, local storage, and the browser's real fingerprint.
2. **Separate persistent profiles** launch another browser process with an automation-owned profile whose state survives across runs. It may remain logged in, but it is not the user's current browser or current tabs.
3. **Fresh or cloud browsers** create isolated local or remote browsers. Some can import cookies or retain a remote profile, but they still do not control the session currently open on the user's desktop.

Playwriter belongs in the first category when used through its extension. Its important differentiator is more specific than active-session reuse:

> Playwriter turns explicitly enabled tabs in the user's already-running Chrome into a full Playwright-compatible programming surface.

The extension attaches to selected tabs through `chrome.debugger`, relays CDP through the local WebSocket server, and implements the target/session behavior required for a Playwright client to see those tabs as normal `Page` objects. Playwriter is therefore not merely a collection of browser actions and not merely a call to `connectOverCDP()`.

Playwriter also supports direct CDP, headless, launched-browser, and cloud modes. Those modes should not be used as evidence for the active-session claim; that claim specifically describes extension mode or a direct connection to a browser the user already made debuggable.

## Comparison summary

| Tool or mode | Running user browser | Existing open tabs | Primary control surface | Difference from Playwriter extension mode |
| --- | --- | --- | --- | --- |
| **Playwriter extension** | Yes | Yes, explicitly enabled tabs | Arbitrary Playwright code, locators, events, helpers, and raw CDP | Per-tab extension authorization plus a Playwright-compatible programming surface |
| **Playwright MCP default** | No | No | Purpose-built MCP tools backed by Playwright | Launches a separate persistent MCP profile by default |
| **Playwright MCP `--extension`** | Yes | Yes | Purpose-built Playwright MCP tools | Shares the active-session advantage, but exposes a fixed MCP tool surface rather than Playwriter's CLI and arbitrary-code environment |
| **Chrome DevTools MCP default** | No | No | DevTools-oriented MCP tools | Launches a dedicated persistent profile by default |
| **Chrome DevTools MCP `--autoConnect`** | Yes | Yes, across the selected profile | DevTools, DOM, network, performance, and debugging tools | Requires recent Chrome, remote debugging opt-in, and user approval; access is profile-wide rather than Playwriter's enabled-tab model |
| **BrowserMCP extension** | Yes | Yes, connected tab | Fixed navigate, click, fill, screenshot, and related MCP tools | Similar active-browser architecture, but agents learn its dedicated tool vocabulary instead of executing Playwright code |
| **Agent360 Browser MCP** | Yes | Yes, agent-owned tab groups | 34 fixed MCP tools | Similar extension and local WebSocket architecture; separates sessions with tab groups rather than presenting a Playwright client API |
| **Claude in Chrome** | Yes | Yes, selected or grouped tabs | Claude-specific browser agent | Strong integrated permissions and safety UX, but tied to Claude and does not expose a generic Playwright API |
| **Chrome DevTools attachment via CDP** | Sometimes | Yes, if the active browser exposes debugging | Raw CDP, Puppeteer, Selenium, or Playwright `connectOverCDP()` | A low-level connection mechanism, not a complete relay, authorization, agent-session, and helper product |
| **Browser Use `--connect` or `--cdp-url`** | Yes, when debugging is exposed | Yes | Browser Use CLI and agent actions | Active attachment is possible, but its normal real-profile and cloud modes have different semantics |
| **Browser Use real-profile launch** | Usually no | No | Browser Use CLI and agent actions | Reuses or copies a profile into a browser it launches; profile locks may require closing the user's Chrome first |
| **Browser Use Cloud** | No | No | Hosted Browser Use agents and API | A remote profile can import cookies, but it is not the active local browser |
| **Browserbase / Stagehand** | No | No | Cloud browser sessions, Stagehand, and agent integrations | Persistent contexts are agent-owned remote profiles, not the user's current tabs |
| **BrowserTools MCP** | Yes, through an open DevTools panel | Yes, for inspected tabs | Console, network, storage, screenshots, and audits | Primarily an observability and audit tool, not a general browser automation runtime; some audits launch another browser |
| **Webpage MCP** | Yes | Yes | Chrome-native workflow, automation, and editing tools | Broader browser-native workflow layer with many purpose-built tools; not a Playwright compatibility layer |

## Closest alternatives

### Playwright MCP extension

The current README statement that Playwright MCP always spawns a new Chrome is outdated. Playwright MCP now has three relevant profile modes:

- Its default is a separate persistent profile. Cookies and local storage survive, but this is not the user's active Chrome profile or open tabs.
- Isolated mode creates disposable state.
- `--extension` connects to existing Chrome or Edge tabs and reuses the user's logged-in sessions, cookies, installed extensions, and browser state.

This makes Playwright MCP extension mode the closest direct alternative. The truthful differentiation is the interface and supporting runtime:

- Playwright MCP exposes many purpose-built tools for navigation, snapshots, clicks, form input, evaluation, tabs, and related operations.
- Playwriter exposes one arbitrary-code execution environment through MCP or CLI. Agents can use the Playwright API they already know, keep values and objects in session-isolated `state`, register listeners, use raw CDP, and compose operations without adding a new MCP tool for each capability.
- Playwriter includes its own accessibility snapshots and references, page-log buffering, debugger and live-editor helpers, recording and streaming features, and a Playwright fork for frame-level CDP information.
- Playwriter explicitly distinguishes session state from browser pages: each agent session receives isolated JavaScript state while enabled browser tabs are shared.

Do not position Playwriter as the only Playwright-based product that can use an active browser. Position it as the active-browser bridge that provides a broad Playwright programming surface instead of only a predefined browser-agent tool vocabulary.

Sources:

- [Playwright MCP: connecting to browsers](https://playwright.dev/mcp/configuration/browser-extension)
- [Playwright MCP: profile and state](https://playwright.dev/mcp/configuration/user-profile)
- [Playwright extension source documentation](https://github.com/microsoft/playwright/blob/main/packages/extension/README.md)
- [Playwright MCP repository and tool reference](https://github.com/microsoft/playwright-mcp)

### Chrome DevTools MCP and Chrome auto-connect

Chrome DevTools MCP starts a separate dedicated persistent Chrome profile by default. It can also control an active browser in two ways:

- `--autoConnect` connects to a running Chrome 144 or later after the user enables remote debugging at `chrome://inspect/#remote-debugging` and approves the connection dialog.
- `--browser-url` or `--ws-endpoint` connects to a Chrome instance that already exposes a CDP endpoint.

Auto-connect genuinely inherits the user's active session and open windows. Chrome warns that the connected agent can access open tabs, cookies, local storage, session storage, and other profile data. Chrome's server remains local and its documentation says it does not send browser data, session tokens, or telemetry to Google.

The authorization scope differs from Playwriter. Chrome DevTools MCP connects to all open windows for the selected/default profile, whereas Playwriter's extension icon enables individual tabs. Its tool surface is also DevTools-oriented rather than a normal Playwright object model.

The old comparison against `--remote-debugging-port` also needs nuance. Since Chrome 136, the remote-debugging switches are ignored for the platform's default data directory unless a nonstandard `--user-data-dir` is provided. Traditional port-based automation therefore commonly requires a separate profile. Modern Chrome's explicit `chrome://inspect` remote-debugging opt-in provides a supported route to the running profile, but requires a recent Chrome version and an approval dialog.

Sources:

- [Chrome DevTools MCP repository](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Connect an agent to a personal browser with auto-connect](https://developer.chrome.com/docs/devtools/agents/use-cases/auto-connect)
- [Chrome remote-debugging switch security changes](https://developer.chrome.com/blog/remote-debugging-port)

### BrowserMCP projects

There are multiple similarly named projects. Future comparisons must identify the exact package or repository.

`BrowserMCP/mcp` is an MCP server plus Chrome extension. The user connects the current tab through the extension. Its project describes automation as local, using the existing profile and real browser fingerprint. It was adapted from Playwright MCP but exposes dedicated browser actions rather than Playwriter's arbitrary Playwright code environment.

Agent360's `@agent360/browser-mcp` is a different product. It exposes 34 tools, uses Chrome extension APIs including `chrome.debugger`, and connects the extension to a local MCP server over WebSockets. It places each conversation's tabs in a separate color-coded group and restricts that session to tabs it opened.

Sources:

- [`BrowserMCP/mcp`](https://github.com/BrowserMCP/mcp)
- [BrowserMCP extension setup](https://docs.browsermcp.io/setup-extension)
- [Agent360 Browser MCP architecture](https://browsermcp.dev/docs/what-is-browser-mcp/)

### Claude in Chrome

Claude in Chrome is a real active-browser alternative. Its extension uses `debugger`, `tabs`, and `scripting` permissions to read and control the running Chrome. It can act in the current page and manage multiple tabs in a Claude-designated tab group. Current documentation also describes console, network, and DOM debugging support.

It provides a product-level permissions system that Playwriter should consider separately from automation capability:

- Manual, automatic, and skip-approval modes
- Per-site access decisions and permission history
- Protected actions that still require explicit approval
- Organization allowlists and blocklists
- Prohibited categories of actions

Its important limitation for this comparison is not that it only sees screenshots or cannot use debugging. Those statements are no longer accurate. It is tied to Claude and does not expose its browser implementation as a generic Playwright or raw-CDP programming contract for arbitrary MCP clients.

Sources:

- [Get started with Claude in Chrome](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome)
- [Claude in Chrome permissions](https://support.claude.com/en/articles/12902446-claude-in-chrome-permissions-guide)

### Browser Use

Browser Use supports several browser modes with materially different session semantics:

- Its CLI can auto-discover and connect to a running Chrome with `--connect` or use an explicit CDP endpoint with `--cdp-url`.
- Its "real Chrome profile" configuration selects an installed Chrome and profile. This can launch against or copy profile state rather than attach to the already-running process. Current source reports locked-profile errors and tells the user to close Chrome or use a CDP URL to connect to the already-running browser.
- Its cloud profile sync transfers authentication into a cloud-hosted profile. This solves login reuse for remote agents, but does not preserve the user's currently open pages or local browser process.

Therefore, avoid writing either "Browser Use always launches a new browser" or "Browser Use uses your active Chrome." Both can be true depending on the chosen mode.

Sources:

- [Browser Use CLI browser modes](https://github.com/browser-use/browser-use/blob/main/browser_use/skill_cli/README.md)
- [Browser Use real browser example](https://github.com/browser-use/browser-use/blob/main/examples/browser/real_browser.py)
- [Browser Use browser profile implementation](https://github.com/browser-use/browser-use/blob/main/browser_use/browser/profile.py)
- [Browser Use cloud profiles](https://github.com/browser-use/browser-use/blob/main/CLOUD.md)

### Browserbase, Stagehand, and other cloud browsers

Browserbase, Stagehand, Browser Use Cloud, Steel, Hyperbrowser, and similar services are primarily separate hosted-browser infrastructure. Persistent contexts can keep a remote agent logged in and are valuable for isolation, scale, proxies, stealth, observability, and long-running automation. They are not the user's currently running local browser, even when cookies were imported from it.

This is a product-category difference rather than a universal advantage. An active user browser is strongest for collaborative work, current manual state, installed extensions, trusted-device authentication, and seamless human takeover. Cloud browsers are stronger for unattended workloads, parallelism, isolation, stable infrastructure, proxies, and keeping automation away from personal data.

Sources:

- [Browserbase browser sessions](https://docs.browserbase.com/platform/browser/getting-started/using-browser-session)
- [Browserbase agent use cases](https://docs.browserbase.com/use-cases/agents)

## Raw attachment mechanisms are not products

Several automation libraries can attach to a browser that already exposes CDP:

- Playwright: `chromium.connectOverCDP()`
- Puppeteer: `puppeteer.connect({ browserURL, browserWSEndpoint })`
- Selenium: Chrome `debuggerAddress`

These can preserve active pages and authentication when the endpoint belongs to the active browser. They do not themselves solve how the user's default Chrome safely exposes debugging, which tabs an agent may control, how several agents avoid interfering, how long-lived state is managed, or how Chrome target events are translated into higher-level Playwright behavior.

Playwright documents CDP attachment as Chromium-only and lower fidelity than its native Playwright protocol connection. This is another reason not to reduce Playwriter to a generic `connectOverCDP()` wrapper.

Sources:

- [Playwright `connectOverCDP()`](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
- [Puppeteer connect options](https://pptr.dev/api/puppeteer.connectoptions)
- [Selenium Chromium options](https://www.selenium.dev/selenium/docs/api/javascript/module-selenium-webdriver_chromium-Options.html)

## Product positioning to preserve

Suggested short description:

> Most browser agents launch or maintain a separate automation profile. Playwriter controls explicitly enabled tabs in the Chrome you are already using, preserving the exact open pages, logins, cookies, extensions, and browser fingerprint while giving agents the full Playwright API through CLI or MCP.

Supporting differentiators:

- The user's current browser and current tabs, not merely a persistent automation profile
- Explicit per-tab opt-in through the extension
- Full Playwright API rather than a fixed list of browser actions
- One compact `execute` tool or a CLI usable by any agent
- Session-isolated JavaScript `state` with shared real-browser pages
- Accessibility snapshots and low-context locators
- Raw CDP, frame-level sessions, debugger, breakpoints, and live code editing
- Native tab recording and streaming capabilities
- Direct CDP, headless, and cloud modes when the active personal browser is not appropriate

## README claims to revisit

The README comparison should be updated before these claims are reused in marketing:

- "Other browser MCPs spawn a fresh Chrome" is too broad. Several competitors now have extension or auto-connect modes.
- "Playwright MCP spawns new Chrome" is only true of its default mode, not `--extension`.
- "Playwright MCP has no extensions or login state" is false in extension mode and incomplete in its default persistent-profile mode.
- "Built-in CDP must relaunch Chrome" is incomplete after Chrome 144 auto-connect.
- "Claude Extension uses screenshots" and "no debugger" are outdated. Its documented permissions and developer workflow include debugger, console, network, and DOM access.
- "Always detected," "CAPTCHAs always blocked," exact snapshot sizes, and "100x more efficient" require a dated, reproducible benchmark or softer wording.
- "BrowserMCP" is ambiguous because multiple active products use that name.

The comparisons should always state the competitor's mode. For example, use "Playwright MCP default profile" versus "Playwright MCP extension," or "Browser Use cloud" versus "Browser Use CDP attachment." This prevents a true statement about one mode from becoming a false statement about the whole product.

## Questions for the next pass

- Should the public README compare only active-session alternatives, with cloud browsers moved to a separate "when to use each" section?
- Should Playwriter document its per-tab authorization and data flow as explicitly as Chrome and Claude document theirs?
- Which capabilities have reproducible benchmark data: token usage, snapshot size, recording overhead, latency, and memory?
- Should Playwriter distinguish the generic open-source `BrowserMCP/mcp` project from Agent360 Browser MCP by package name in the README?
- Should the comparison emphasize CLI/code execution over MCP tool count, or lead with per-tab access and Playwright fidelity?
- Which competitor capabilities should be verified again immediately before publishing, given how quickly active-browser support is changing?
