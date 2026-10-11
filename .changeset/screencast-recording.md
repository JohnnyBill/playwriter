---
'playwriter': minor
---

Screen recording and RTMP streaming now use CDP screencast + ffmpeg instead of `chrome.tabCapture`. **No extension click** and no special Chrome flags are needed, and recording now works in direct CDP mode, headless, cloud browsers and remote control.

```js
await recording.start({ page: state.page, outputPath: './demo.mp4', audio: true })
await state.page.click('a') // survives navigation, also cross-site
const { path, duration, size } = await recording.stop({ page: state.page })
```

- **ffmpeg** on PATH is required. `.mp4`, `.mov`, `.mkv` use H.264 (hardware encoder when available) + AAC, `.webm` uses VP8 + Opus.
- **Page audio** with `audio: true`: a Web Audio tap records `<audio>`, `<video>` and AudioContext output. Default off for recordings, on for streams. Audio of cross-origin iframes is not captured.
- New options `maxSize` (longest edge, default 1920) and `quality` (JPEG, default 90). `videoBitsPerSecond` and `audioBitsPerSecond` are removed.
- Static pages keep correct duration, and high refresh displays (120/144 Hz) skip frames to save CPU.
- Library API: `startRecording({ page, outputPath })` returns a recording with `stop()` and `cancel()`. `stopRecording`, `isRecording` and `cancelRecording` exports are removed, also the relay `/recording/*` and `/stream/*` endpoints.
- `stream.stop()` returns `{ duration, frames }`. Streams end when the page closes or the session is reset.
- The relay merges `Page.startScreencast` of all clients on a tab, so the skill recorder and a video recording no longer stop each other.
- The extension drops the `tabCapture` permission.
