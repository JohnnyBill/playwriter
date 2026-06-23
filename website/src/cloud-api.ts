// Cloud browser API routes mounted at /api/cloud/*.
// Proxies Browser Use API v3 — the bu_ API key never reaches the client.
// VM status is queried from Browser Use on demand (source of truth),
// our D1 only stores the org → BU session ID mapping for multi-tenancy.

import { env } from 'cloudflare:workers'
import { Spiceflow, json } from 'spiceflow'
import { z } from 'zod'
import * as orm from 'drizzle-orm'
import * as schema from 'db/schema'
import { getDb, requireOrgSession } from './db.ts'
import { BrowserUseClient } from './lib/browser-use.ts'
import type { BrowserSession } from './lib/browser-use.ts'

function getBrowserUse() {
  return new BrowserUseClient({ apiKey: env.BROWSER_USE_API_KEY as string })
}

// ── Types ───────────────────────────────────────────────────────────

interface CloudSessionStatus {
  cloudSessionId: string
  browserUseSessionId: string
  /** Display index derived from creation order (1-based) */
  index: number
  createdAt: number
  status: 'active' | 'stopped'
  cdpUrl: string | null
  liveUrl: string | null
  timeoutAt: string
}

// ── Helpers ─────────────────────────────────────────────────────────

const PENDING_PREFIX = 'pending-'
// Placeholder rows older than 2 minutes are considered stale (VM creation
// should complete in under 60s). Fresh ones are counted as occupied slots.
const PENDING_STALE_MS = 2 * 60_000

function isPendingRow(row: typeof schema.cloudSession.$inferSelect): boolean {
  return row.browserUseSessionId.startsWith(PENDING_PREFIX)
}

/** Check if a cloud session row represents an occupied slot.
 *  - Pending placeholder <2min old → occupied (VM is being created)
 *  - Pending placeholder ≥2min old → stale, delete and return false
 *  - Real BU session → check BU API, delete row if VM is dead */
async function isSlotOccupied(
  row: typeof schema.cloudSession.$inferSelect,
  bu: BrowserUseClient,
): Promise<boolean> {
  if (isPendingRow(row)) {
    if (Date.now() - row.createdAt < PENDING_STALE_MS) {
      return true // fresh placeholder, VM is being created
    }
    // Stale placeholder — VM creation probably failed, clean up
    const db = getDb()
    await db.delete(schema.cloudSession).where(orm.eq(schema.cloudSession.id, row.id)).limit(1)
    return false
  }
  const vm = await resolveActiveSession(row, bu)
  return vm !== null
}

/** Check if a cloud session's BU VM is still alive. If dead, clean up the
 *  D1 row and return null. Only call on non-pending rows. */
async function resolveActiveSession(
  row: typeof schema.cloudSession.$inferSelect,
  bu: BrowserUseClient,
): Promise<BrowserSession | null> {
  try {
    const vm = await bu.getBrowser(row.browserUseSessionId)
    if (vm.status === 'active') {
      return vm
    }
  } catch {
    // BU returned 404 or error, VM is gone
  }
  // VM is stopped or gone, clean up our mapping
  const db = getDb()
  await db
    .delete(schema.cloudSession)
    .where(orm.eq(schema.cloudSession.id, row.id))
    .limit(1)
  return null
}

// ── Sub-app ─────────────────────────────────────────────────────────

export const cloudApp = new Spiceflow({ basePath: '/api/cloud' })

  // ── GET /api/cloud/status ───────────────────────────────────────
  // Returns org's active cloud sessions with their VM status.
  .get('/status', async ({ request }) => {
    const { org } = await requireOrgSession(request)
    const db = getDb()
    const bu = getBrowserUse()

    const sessions = await db.query.cloudSession.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'asc' },
    })

    const result: CloudSessionStatus[] = []
    for (let i = 0; i < sessions.length; i++) {
      const row = sessions[i]
      // Skip pending placeholders — VM is still being created
      if (isPendingRow(row)) continue
      const vm = await resolveActiveSession(row, bu)
      if (vm) {
        result.push({
          cloudSessionId: row.id,
          browserUseSessionId: row.browserUseSessionId,
          index: result.length + 1,
          createdAt: row.createdAt,
          status: vm.status,
          cdpUrl: vm.cdpUrl,
          liveUrl: vm.liveUrl,
          timeoutAt: vm.timeoutAt,
        })
      }
    }

    return { sessions: result }
  })

  // ── POST /api/cloud/connect ─────────────────────────────────────
  // Create a new Browser Use VM for the org.
  // Returns the cdpUrl for direct CDP connection.
  .route({
    method: 'POST',
    path: '/connect',
    request: z.object({
      proxyRegion: z.string().optional(),
      /** Cloud browser timeout in minutes (1-240, default 60) */
      timeout: z.number().min(1).max(240).optional(),
      customProxy: z
        .object({
          host: z.string(),
          port: z.number(),
          username: z.string().optional(),
          password: z.string().optional(),
        })
        .optional(),
    }),
    async handler({ request }) {
      const { org } = await requireOrgSession(request)
      const body = await request.json()
      const db = getDb()
      const bu = getBrowserUse()

      // Check subscription: quantity determines max concurrent cloud sessions
      const activeSub = await db.query.subscription.findFirst({
        where: {
          orgId: org.id,
          status: { in: ['active', 'trialing'] },
        },
      })
      if (!activeSub) {
        throw json(
          { error: 'No active subscription. Run `playwriter cloud subscribe` to get started.' },
          { status: 403 },
        )
      }
      const maxSessions = activeSub.quantity

      // Resolve live sessions: check each D1 row against Browser Use API
      // to clean up stale rows where the BU VM died outside our control.
      // Also counts fresh pending placeholders (VMs being created) as occupied.
      const dbSessions = await db.query.cloudSession.findMany({
        where: { orgId: org.id },
      })
      const slotChecks = await Promise.all(
        dbSessions.map((row) => {
          return isSlotOccupied(row, bu)
        }),
      )
      const activeCount = slotChecks.filter(Boolean).length

      if (activeCount >= maxSessions) {
        throw json(
          {
            error: `Cloud session limit reached (${activeCount}/${maxSessions}). Stop an existing session or upgrade your subscription quantity.`,
          },
          { status: 403 },
        )
      }

      // Claim a slot: insert a placeholder D1 row BEFORE creating the BU VM.
      // Concurrent requests see this row via isSlotOccupied() which counts
      // fresh pending rows as occupied. After inserting, re-check the total
      // row count — if another request raced us and we exceeded quota, back
      // out before creating the expensive VM.
      const placeholderId = `${PENDING_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      let cloudSession: typeof schema.cloudSession.$inferSelect
      try {
        const [row] = await db
          .insert(schema.cloudSession)
          .values({
            orgId: org.id,
            browserUseSessionId: placeholderId,
          })
          .returning()
        cloudSession = row!
      } catch (cause) {
        throw new Error('Failed to claim cloud session slot', { cause })
      }

      // Re-check total slots after claiming to catch races: if two requests
      // both passed the initial count check, the one whose insert pushes us
      // over the limit backs out.
      const rowsAfterClaim = await db.query.cloudSession.findMany({
        where: { orgId: org.id },
      })
      if (rowsAfterClaim.length > maxSessions) {
        await db
          .delete(schema.cloudSession)
          .where(orm.eq(schema.cloudSession.id, cloudSession.id))
          .limit(1)
          .catch(() => {})
        throw json(
          { error: `Cloud session limit reached. Stop an existing session or upgrade your subscription quantity.` },
          { status: 403 },
        )
      }

      // Now create the BU VM. If this fails, clean up the placeholder row.
      let vm: BrowserSession
      try {
        vm = await bu.createBrowser({
          // Proxy disabled by default to save cost. Pass --proxy <region> to enable.
          proxyCountryCode: body.proxyRegion ?? null,
          timeout: body.timeout ?? 60,
          customProxy: body.customProxy,
        })
      } catch (cause) {
        await db
          .delete(schema.cloudSession)
          .where(orm.eq(schema.cloudSession.id, cloudSession.id))
          .limit(1)
          .catch(() => {})
        throw new Error('Failed to create cloud browser', { cause })
      }

      if (!vm.cdpUrl) {
        // No CDP URL means the VM failed to start. Clean up both.
        await bu.stopBrowser(vm.id).catch(() => {})
        await db
          .delete(schema.cloudSession)
          .where(orm.eq(schema.cloudSession.id, cloudSession.id))
          .limit(1)
          .catch(() => {})
        throw json(
          { error: 'Browser Use returned no CDP URL. The VM may have failed to start.' },
          { status: 502 },
        )
      }

      // Update the placeholder with the real BU session ID.
      // Verify the row still exists (wasn't deleted by a concurrent stale cleanup).
      const updateResult = await db
        .update(schema.cloudSession)
        .set({ browserUseSessionId: vm.id })
        .where(orm.eq(schema.cloudSession.id, cloudSession.id))
        .limit(1)
        .returning()

      if (!updateResult.length) {
        // Our placeholder was deleted (e.g. by a concurrent stale cleanup).
        // Stop the VM since our slot is gone.
        await bu.stopBrowser(vm.id).catch(() => {})
        throw new Error('Cloud session slot was reclaimed during VM creation')
      }

      return {
        cloudSessionId: cloudSession.id,
        cdpUrl: vm.cdpUrl,
        liveUrl: vm.liveUrl,
        timeoutAt: vm.timeoutAt,
      }
    },
  })

  // ── POST /api/cloud/disconnect ──────────────────────────────────
  // Stop a cloud browser VM.
  .route({
    method: 'POST',
    path: '/disconnect',
    request: z.object({
      cloudSessionId: z.string(),
    }),
    async handler({ request }) {
      const { org } = await requireOrgSession(request)
      const body = await request.json()
      const db = getDb()
      const bu = getBrowserUse()

      // Find the session and verify org ownership directly
      const cloudSession = await db.query.cloudSession.findFirst({
        where: { id: body.cloudSessionId, orgId: org.id },
      })
      if (!cloudSession) {
        throw json({ error: 'cloud session not found' }, { status: 404 })
      }

      // Stop the BU VM
      try {
        await bu.stopBrowser(cloudSession.browserUseSessionId)
      } catch {
        // VM might already be stopped
      }

      // Remove the mapping row
      await db
        .delete(schema.cloudSession)
        .where(orm.eq(schema.cloudSession.id, cloudSession.id))
        .limit(1)

      return { ok: true }
    },
  })
