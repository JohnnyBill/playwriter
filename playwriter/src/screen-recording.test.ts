/**
 * Tests viewport sizing, capture size and ffmpeg argument builders.
 */
import { describe, test, expect } from 'vitest'
import {
  buildRecordingFfmpegArgs,
  buildStreamFfmpegArgs,
  computeCaptureSize,
  escapeTeeUrl,
  fitToAspectRatio,
  parseFfmpegProgressLine,
  redactStreamUrl,
  type StreamFfmpegOptions,
} from './screen-recording.js'

describe('fitToAspectRatio', () => {
  test('common sizes → 16:9', () => {
    const ratio = { width: 16, height: 9 }

    // Already 16:9 — no change
    expect(fitToAspectRatio({ width: 1920, height: 1080 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 1080,
        "width": 1920,
      }
    `)
    expect(fitToAspectRatio({ width: 1280, height: 720 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 720,
        "width": 1280,
      }
    `)

    // 16:10 (MacBook default) — too tall, shrink height
    expect(fitToAspectRatio({ width: 1440, height: 900 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 810,
        "width": 1440,
      }
    `)
    expect(fitToAspectRatio({ width: 1680, height: 1050 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 945,
        "width": 1680,
      }
    `)

    // 4:3 — too tall, shrink height
    expect(fitToAspectRatio({ width: 1024, height: 768 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 576,
        "width": 1024,
      }
    `)

    // Ultra-wide 21:9 — too wide, shrink width
    expect(fitToAspectRatio({ width: 2560, height: 1080 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 1080,
        "width": 1920,
      }
    `)
    expect(fitToAspectRatio({ width: 3440, height: 1440 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 1440,
        "width": 2560,
      }
    `)

    // Square — too tall, shrink height
    expect(fitToAspectRatio({ width: 1000, height: 1000 }, ratio)).toMatchInlineSnapshot(`
      {
        "height": 563,
        "width": 1000,
      }
    `)
  })

  test('custom aspect ratios', () => {
    // 4:3
    expect(fitToAspectRatio({ width: 1920, height: 1080 }, { width: 4, height: 3 })).toMatchInlineSnapshot(`
      {
        "height": 1080,
        "width": 1440,
      }
    `)

    // 1:1
    expect(fitToAspectRatio({ width: 1920, height: 1080 }, { width: 1, height: 1 })).toMatchInlineSnapshot(`
      {
        "height": 1080,
        "width": 1080,
      }
    `)

    // 9:16 vertical
    expect(fitToAspectRatio({ width: 1920, height: 1080 }, { width: 9, height: 16 })).toMatchInlineSnapshot(`
      {
        "height": 1080,
        "width": 608,
      }
    `)
  })

  test('never increases dimensions', () => {
    const ratio = { width: 16, height: 9 }
    const sizes = [
      { width: 800, height: 600 },
      { width: 1440, height: 900 },
      { width: 2560, height: 1080 },
      { width: 1000, height: 1000 },
    ]
    for (const size of sizes) {
      const result = fitToAspectRatio(size, ratio)
      expect(result.width).toBeLessThanOrEqual(size.width)
      expect(result.height).toBeLessThanOrEqual(size.height)
    }
  })
})

describe('computeCaptureSize', () => {
  test('retina viewport is capped at maxSize, sizes stay even', () => {
    expect([
      computeCaptureSize({ cssWidth: 1280, cssHeight: 720, devicePixelRatio: 2, maxSize: 1920 }),
      computeCaptureSize({ cssWidth: 1280, cssHeight: 720, devicePixelRatio: 1, maxSize: 1920 }),
      computeCaptureSize({ cssWidth: 1437, cssHeight: 809, devicePixelRatio: 1, maxSize: 1920 }),
      computeCaptureSize({ cssWidth: 390, cssHeight: 844, devicePixelRatio: 3, maxSize: 1920 }),
    ]).toMatchInlineSnapshot(`
      [
        {
          "height": 1080,
          "width": 1920,
        },
        {
          "height": 720,
          "width": 1280,
        },
        {
          "height": 810,
          "width": 1438,
        },
        {
          "height": 1920,
          "width": 888,
        },
      ]
    `)
  })
})

describe('buildRecordingFfmpegArgs', () => {
  const base = { width: 1920, height: 1080, fps: 30 }
  test('mp4 with x264, hardware encoder, webm', () => {
    expect([
      buildRecordingFfmpegArgs({ ...base, audio: false, codec: 'libx264', outputPath: '/out/a.mp4' }).join(' '),
      buildRecordingFfmpegArgs({ ...base, audio: true, codec: 'h264_videotoolbox', outputPath: '/out/a.mp4' }).join(' '),
      buildRecordingFfmpegArgs({ ...base, audio: true, codec: 'libvpx', outputPath: '/out/a.webm' }).join(' '),
    ]).toMatchInlineSnapshot(`
      [
        "-hide_banner -loglevel error -nostdin -f image2pipe -c:v mjpeg -framerate 30 -thread_queue_size 512 -i pipe:0 -vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p -c:v libx264 -preset veryfast -crf 20 -movflags +faststart -y /out/a.mp4",
        "-hide_banner -loglevel error -nostdin -f image2pipe -c:v mjpeg -framerate 30 -thread_queue_size 512 -i pipe:0 -f s16le -ar 48000 -ac 2 -thread_queue_size 512 -i pipe:3 -vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p -c:v h264_videotoolbox -b:v 6221k -realtime true -c:a aac -b:a 160k -movflags +faststart -y /out/a.mp4",
        "-hide_banner -loglevel error -nostdin -f image2pipe -c:v mjpeg -framerate 30 -thread_queue_size 512 -i pipe:0 -f s16le -ar 48000 -ac 2 -thread_queue_size 512 -i pipe:3 -vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p -c:v libvpx -deadline realtime -cpu-used 8 -b:v 6221k -crf 10 -c:a libopus -b:a 128k -y /out/a.webm",
      ]
    `)
  })
})

describe('buildStreamFfmpegArgs', () => {
  const base: StreamFfmpegOptions = {
    rtmpUrls: ['rtmp://va.pscp.tv:80/x/streamkey'],
    width: 1280,
    height: 720,
    fps: 30,
    videoBitrateKbps: 4500,
    audioBitrateKbps: 128,
    audio: true,
    preset: 'veryfast',
    codec: 'libx264',
    keyframeSeconds: 3,
  }

  test('page audio, silent audio, hardware encoder', () => {
    expect([
      buildStreamFfmpegArgs(base).join(' '),
      buildStreamFfmpegArgs({ ...base, audio: false }).join(' '),
      buildStreamFfmpegArgs({ ...base, codec: 'h264_videotoolbox' }).join(' '),
    ]).toMatchInlineSnapshot(`
      [
        "-hide_banner -nostdin -f image2pipe -c:v mjpeg -framerate 30 -thread_queue_size 512 -i pipe:0 -f s16le -ar 48000 -ac 2 -thread_queue_size 512 -i pipe:3 -map 0:v:0 -map 1:a:0 -vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p -r 30 -c:v libx264 -b:v 4500k -maxrate 4500k -bufsize 9000k -g 90 -keyint_min 90 -preset veryfast -tune zerolatency -sc_threshold 0 -c:a aac -b:a 128k -ar 44100 -ac 2 -f flv rtmp://va.pscp.tv:80/x/streamkey",
        "-hide_banner -nostdin -f image2pipe -c:v mjpeg -framerate 30 -thread_queue_size 512 -i pipe:0 -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v:0 -map 1:a:0 -shortest -vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p -r 30 -c:v libx264 -b:v 4500k -maxrate 4500k -bufsize 9000k -g 90 -keyint_min 90 -preset veryfast -tune zerolatency -sc_threshold 0 -c:a aac -b:a 128k -ar 44100 -ac 2 -f flv rtmp://va.pscp.tv:80/x/streamkey",
        "-hide_banner -nostdin -f image2pipe -c:v mjpeg -framerate 30 -thread_queue_size 512 -i pipe:0 -f s16le -ar 48000 -ac 2 -thread_queue_size 512 -i pipe:3 -map 0:v:0 -map 1:a:0 -vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p -r 30 -c:v h264_videotoolbox -b:v 4500k -maxrate 4500k -bufsize 9000k -g 90 -keyint_min 90 -realtime true -c:a aac -b:a 128k -ar 44100 -ac 2 -f flv rtmp://va.pscp.tv:80/x/streamkey",
      ]
    `)
  })

  test('multi destination uses tee muxer with onfail=ignore', () => {
    const args = buildStreamFfmpegArgs({
      ...base,
      rtmpUrls: ['rtmp://live.twitch.tv/app/key1', 'rtmp://va.pscp.tv:80/x/key2'],
    })
    expect(args.slice(-7).join(' ')).toMatchInlineSnapshot(`"-f tee -use_fifo 1 -fifo_options attempt_recovery=1:recover_any_error=1 [f=flv:onfail=ignore]rtmp://live.twitch.tv/app/key1|[f=flv:onfail=ignore]rtmp://va.pscp.tv:80/x/key2"`)
  })

  test('throws without destinations', () => {
    expect(() => {
      buildStreamFfmpegArgs({ ...base, rtmpUrls: [] })
    }).toThrowErrorMatchingInlineSnapshot(`[Error: At least one RTMP destination is required]`)
  })
})

describe('stream url helpers', () => {
  test('escapeTeeUrl and redactStreamUrl', () => {
    expect([
      escapeTeeUrl('rtmp://host/app/key|with[brackets]'),
      redactStreamUrl('rtmp://live.twitch.tv/app/live_123456_SECRET'),
      redactStreamUrl('rtmps://va.pscp.tv:443/x/SECRETKEY'),
      redactStreamUrl('/tmp/out.flv'),
    ]).toMatchInlineSnapshot(`
      [
        "rtmp://host/app/key\\|with\\[brackets\\]",
        "rtmp://live.twitch.tv/…",
        "rtmps://va.pscp.tv:443/…",
        "/tmp/out.flv",
      ]
    `)
  })

  test('parseFfmpegProgressLine', () => {
    expect([
      parseFfmpegProgressLine('frame=  123 fps= 30 q=28.0 size=    1024KiB time=00:00:04.10 bitrate=2045.6kbits/s drop=2 speed=1.01x'),
      parseFfmpegProgressLine('[flv @ 0x7f8] Failed to update header'),
    ]).toMatchInlineSnapshot(`
      [
        {
          "bitrateKbps": 2045.6,
          "droppedFrames": 2,
          "fps": 30,
        },
        null,
      ]
    `)
  })
})
