import fs from 'node:fs'
import type { Page } from '@xmorse/playwright-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('screenshot transport fallbacks', () => {
  afterEach(() => {
    vi.doUnmock('sharp')
    vi.resetModules()
  })

  it('saves screenshot files without inline image content when sharp is unavailable', async () => {
    vi.doMock('sharp', () => {
      throw new Error('sharp unavailable')
    })

    const { screenshot } = await import('./aria-snapshot.js')
    const page = {
      screenshot: async (_options?: unknown) => {
        return Buffer.from('not-a-real-image')
      },
    } as Pick<Page, 'screenshot'> as Page

    const result = await screenshot({ page })

    expect(result.mimeType).toBe('image/png')
    expect(result.base64).toBeUndefined()
    expect(result.inlineWarning).toContain('sharp is not available')
    expect(fs.existsSync(result.path)).toBe(true)

    fs.unlinkSync(result.path)
  })

  it('can inline clipped screenshots when resize support is unavailable', async () => {
    vi.doMock('sharp', () => {
      throw new Error('sharp unavailable')
    })

    const { screenshot } = await import('./aria-snapshot.js')
    const page = {
      screenshot: async (_options?: unknown) => {
        return Buffer.from('small-clipped-image')
      },
    } as Pick<Page, 'screenshot'> as Page

    const result = await screenshot({ page, inlineWhenResizeUnavailable: true })

    expect(result.mimeType).toBe('image/png')
    expect(result.base64).toBe(Buffer.from('small-clipped-image').toString('base64'))
    expect(result.inlineWarning).toBeUndefined()
    expect(fs.existsSync(result.path)).toBe(true)

    fs.unlinkSync(result.path)
  })
})
