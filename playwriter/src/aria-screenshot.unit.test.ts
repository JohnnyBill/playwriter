import fs from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Page } from '@xmorse/playwright-core'

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
    const collector: Array<{
      path: string
      base64?: string
      mimeType: 'image/jpeg' | 'image/png'
      inlineWarning?: string
    }> = []

    const page = {
      screenshot: async (_options?: unknown) => {
        return Buffer.from('not-a-real-image')
      },
    } as Pick<Page, 'screenshot'> as Page

    await screenshot({ page, collector })

    expect(collector).toHaveLength(1)
    expect(collector[0]?.mimeType).toBe('image/png')
    expect(collector[0]?.base64).toBeUndefined()
    expect(collector[0]?.inlineWarning).toContain('sharp is not available')
    expect(fs.existsSync(collector[0]!.path)).toBe(true)

    fs.unlinkSync(collector[0]!.path)
  })
})
