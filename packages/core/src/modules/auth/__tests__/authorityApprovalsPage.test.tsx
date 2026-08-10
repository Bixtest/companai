/**
 * @jest-environment jsdom
 *
 * The approvals queue, as a person meets it.
 *
 * The API for holding and resolving acts has been covered since enforcement
 * landed. What is untested until now is the part that decides whether a queue
 * *means* anything: that the two lists never borrow each other's verbs.
 *
 * An act that has not happened and an act that already has are opposite
 * situations. Offering "Approve" on something that already ran, or "I have
 * looked at this" on something still waiting, would make every row on the page
 * ambiguous — and a reader who cannot tell the two apart will click through
 * both.
 */
import * as React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@open-mercato/shared/lib/testing/renderWithProviders'

const apiCallOrThrowMock = jest.fn()
const flashMock = jest.fn()

jest.mock('@open-mercato/ui/backend/utils/apiCall', () => ({
  apiCallOrThrow: (...args: unknown[]) => apiCallOrThrowMock(...args),
}))

jest.mock('@open-mercato/ui/backend/FlashMessages', () => ({
  flash: (...args: unknown[]) => flashMock(...args),
}))

import AuthorityApprovalsPage from '../backend/authority/approvals/page'

const HOUR = 3_600_000

function pendingAct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'act-1',
    commandId: 'directory.organizations.update',
    capabilityId: 'directory.organizations.manage',
    actorId: 'user-1',
    actorKind: 'ai_worker',
    gate: 'A2',
    bindingRule: 'effect-class-floor',
    because: 'an untrusted machine may not change an organization on its own',
    obligations: [],
    status: 'pending',
    expiresAt: new Date(Date.now() + HOUR).toISOString(),
    createdAt: new Date(Date.now() - HOUR).toISOString(),
    ...overrides,
  }
}

function actReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-1',
    commandId: 'customers.people.update',
    capabilityId: 'customers.people.manage',
    actionLogId: 'log-1',
    actorId: 'user-2',
    actorKind: 'human',
    gate: 'A4',
    because: 'personal data, so the act is reviewable after the fact',
    status: 'pending',
    createdAt: new Date(Date.now() - HOUR).toISOString(),
    ...overrides,
  }
}

function serveQueue(items: unknown[], reviews: unknown[]) {
  apiCallOrThrowMock.mockImplementation(async (_url: string, init?: { method?: string }) => {
    if (init?.method === 'POST') return { result: { ok: true } }
    return { result: { items, reviews } }
  })
}

beforeEach(() => {
  apiCallOrThrowMock.mockReset()
  flashMock.mockReset()
  window.localStorage.clear()
})

describe('the two lists stay apart', () => {
  it('offers approve and reject on an act that has not happened', async () => {
    serveQueue([pendingAct()], [])

    const { findByText, getByRole } = renderWithProviders(<AuthorityApprovalsPage />)

    await findByText('directory.organizations.manage')
    expect(getByRole('button', { name: /approve and run/i })).toBeTruthy()
    expect(getByRole('button', { name: /^reject$/i })).toBeTruthy()
  })

  it('offers no approval at all on an act that already ran', async () => {
    // A4 is *act now, review afterwards*. Approving it is not a decision that
    // exists — the act is already in the ledger, and the only open question is
    // whether anybody looked.
    serveQueue([], [actReview()])

    const { findByText, queryByRole, getByRole } = renderWithProviders(<AuthorityApprovalsPage />)

    await findByText('customers.people.manage')
    expect(queryByRole('button', { name: /approve and run/i })).toBeNull()
    expect(getByRole('button', { name: /i have looked at this/i })).toBeTruthy()
  })

  it('offers only a veto on a hold-and-commit act', async () => {
    // A3 runs on its own when the window passes, so "approve" would be a button
    // that changes nothing except the timing. Stopping it is the only act with
    // an effect.
    serveQueue([pendingAct({ gate: 'A3' })], [])

    const { findByRole, queryByRole } = renderWithProviders(<AuthorityApprovalsPage />)

    expect(await findByRole('button', { name: /stop it running/i })).toBeTruthy()
    expect(queryByRole('button', { name: /approve and run/i })).toBeNull()
  })
})

describe('what the reader is told', () => {
  it('says what the gate means, not just its identifier', async () => {
    // "A2" is precise and empty. A queue that shows only the code is a queue
    // whose rows get clicked without being read.
    serveQueue([pendingAct()], [])

    const { findByText } = renderWithProviders(<AuthorityApprovalsPage />)

    expect(await findByText(/needs your approval before it runs/i)).toBeTruthy()
  })

  it('carries the resolver reason through to the row', async () => {
    serveQueue([pendingAct()], [])

    const { findByText } = renderWithProviders(<AuthorityApprovalsPage />)

    expect(await findByText(/may not change an organization on its own/i)).toBeTruthy()
  })
})

describe('ordering', () => {
  it('puts the more constrained act first, whatever order they arrived in', async () => {
    // The resolver reached A1 precisely because it judged that act to matter
    // more, so the gate is an honest proxy for consequence.
    serveQueue([
      pendingAct({ id: 'later', gate: 'A3', capabilityId: 'aaa.hold.capability' }),
      pendingAct({ id: 'earlier', gate: 'A1', capabilityId: 'zzz.propose.capability' }),
    ], [])

    const { findAllByText, container } = renderWithProviders(<AuthorityApprovalsPage />)

    await findAllByText(/capability/)
    const rendered = Array.from(container.querySelectorAll('article'))
      .map((node) => node.textContent ?? '')
    expect(rendered[0]).toContain('zzz.propose.capability')
    expect(rendered[1]).toContain('aaa.hold.capability')
  })
})

describe('resolving', () => {
  it('sends the decision for the act the reader acted on', async () => {
    serveQueue([pendingAct({ id: 'act-7' })], [])

    const { findByRole } = renderWithProviders(<AuthorityApprovalsPage />)
    const approve = await findByRole('button', { name: /approve and run/i })

    await act(async () => { fireEvent.click(approve) })

    await waitFor(() => {
      expect(apiCallOrThrowMock).toHaveBeenCalledWith(
        '/api/auth/authority/pending-acts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ id: 'act-7', decision: 'approve' }),
        }),
      )
    })
  })

  it('says what failed rather than swallowing it', async () => {
    // An approval that silently does nothing is the worst outcome on this page:
    // the reader walks away believing the act ran.
    apiCallOrThrowMock.mockImplementation(async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') throw new Error('the hold window already closed')
      return { result: { items: [pendingAct()], reviews: [] } }
    })

    const { findByRole } = renderWithProviders(<AuthorityApprovalsPage />)
    const approve = await findByRole('button', { name: /approve and run/i })

    await act(async () => { fireEvent.click(approve) })

    await waitFor(() => {
      expect(flashMock).toHaveBeenCalledWith('the hold window already closed', 'error')
    })
  })
})
