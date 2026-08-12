/**
 * @jest-environment jsdom
 */
/**
 * The legal pages are ours, and say only what we can stand behind (U16).
 *
 * **What these replaced.** This file used to assert the pages contained
 * upstream's full policy, and a sibling — `legal-entity.test.tsx` — asserted
 * they named **Open Mercato sp. z o.o.**, its registration identifiers, its
 * registered address and its share capital. Those were upstream's guards on
 * upstream's legal disclosures. Inherited into a fork they asserted that we
 * impersonate another company, so that file is gone.
 *
 * The pages were **rewritten short and generic**, not renamed. Rebranding
 * somebody else's terms would have bound our users under a licence grant,
 * liability caps and governing law drafted for a different business in a
 * different jurisdiction — a document that reads as ours and is wrong.
 *
 * These tests guard the two properties that matter and would be easy to lose:
 * **no other company is named**, and **the operator is identified as the
 * responsible party** rather than the software vendor.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PrivacyPage from '../modules/content/frontend/privacy/page'
import TermsPage from '../modules/content/frontend/terms/page'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

describe.each([
  ['Privacy Policy', PrivacyPage],
  ['Terms of Service', TermsPage],
])('%s', (_title, Page) => {
  it('names no other company', () => {
    // The original defect: these pages named a real Polish company, its
    // address and its registration details. Any reappearance is a regression
    // worth failing loudly for.
    render(<Page />)

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/sp\. z o\.o\./i)
    expect(text).not.toMatch(/open ?mercato/i)
    expect(text).not.toMatch(/openmercato\.com/i)
  })

  it('points contact at our own domain', () => {
    render(<Page />)

    expect(document.body.innerHTML).toContain('corprorate.com')
  })

  it('identifies the operator as the responsible party', () => {
    // Not the software vendor. Whoever runs an installation decides what goes
    // into it and how long it is kept, and saying otherwise would be a claim
    // we cannot support for somebody else's deployment.
    render(<Page />)

    expect(document.body.textContent ?? '').toMatch(/operator/i)
  })

  it('links to its counterpart', () => {
    render(<Page />)

    const hrefs = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs.some((href) => href === '/privacy' || href === '/terms')).toBe(true)
  })
})

describe('Privacy Policy', () => {
  it('explains why the activity record outlives an account', () => {
    // The one clause specific to this product. Companai exists to make actions
    // attributable, so "delete everything about me" cannot mean erasing the
    // record other people relied on — and a policy implying otherwise would
    // promise something the platform must not do.
    render(<PrivacyPage />)

    expect(screen.getByText(/what other people relied on/i)).toBeInTheDocument()
  })
})

describe('Terms of Service', () => {
  it('states that automation does not move responsibility', () => {
    // The governance claim, in the one place a user might look for it.
    render(<TermsPage />)

    expect(screen.getByText(/does not transfer responsibility/i)).toBeInTheDocument()
  })
})
