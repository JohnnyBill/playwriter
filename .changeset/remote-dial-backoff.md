---
'playwriter': patch
---

Stop redialing offline Remote control tunnels every 5 seconds. A relay with a session for a browser that stopped sharing kept the tunnel awake (and billed) almost all the time.

```
before: dial ──▶ tunnel waits 5s ──▶ 4008 offline ──▶ retry in 500ms ──▶ forever
after:  dial ──▶ 4008 at once ──▶ retry in 1s, 2s, 4s … 60s ──▶ stop after 10 min offline
```

- Failed dials back off exponentially up to 60s. The backoff resets as soon as the remote browser answers.
- After 10 minutes offline the relay stops dialing. The next `execute` on that session dials again at once, so the session works again when the user turns sharing back on.
- A failed `playwriter session new --remote <id>` no longer leaves a dial running in the background.
- The tunnel closes a dial to an offline id at once instead of waiting 5s for the browser.
