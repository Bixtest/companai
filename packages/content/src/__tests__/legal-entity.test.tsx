/**
 * @jest-environment jsdom
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as React from 'react'
import { render } from '@testing-library/react'
import PrivacyPage from '../modules/content/frontend/privacy/page'
import TermsPage from '../modules/content/frontend/terms/page'

jest.mock('next/link', () => {
  const React = require('react')
  return React.forwardRef(({ children, href, ...rest }: any, ref: React.ForwardedRef<HTMLAnchorElement>) => (
    <a href={typeof href === 'string' ? href : href?.toString?.()} ref={ref} {...rest}>
      {children}
    </a>
  ))
})

jest.mock('next/image', () => (props: any) => <img alt={props.alt} {...props} />)

const operatorName = 'Open Mercato sp. z o.o.'
const registrationIdentifiers = ['0001253104', '545230330', 'PL8982336029']
const shareCapital = 'PLN 80,000.00'
const supersededIdentity = ['CT Tornado', 'CTT', '873910', 'PL8982262377', 'catchthetornado.com']

const repoRoot = join(__dirname, '..', '..', '..', '..')

// Candidates, not a fixed list: this fork removes documents that upstream ships
// — `packages/enterprise/LICENSE.md` went with the commercially licensed package
// — and a hardcoded path to a deleted file fails on the read, not on the thing
// being tested. Missing files are filtered out below, and the count is asserted
// so the check cannot quietly degrade to scanning nothing.
const legalDocumentCandidates = [
  'SECURITY.md',
  'apps/docs/cla.md',
  'packages/enterprise/LICENSE.md',
  '.ai/specs/LICENSE.md',
]
const legalDocuments = legalDocumentCandidates.filter((relativePath) =>
  existsSync(join(repoRoot, relativePath)),
)

function renderedText(page: React.ReactElement): string {
  render(page)
  const article = document.querySelector('article')
  return (article ?? document.body).textContent ?? ''
}

describe.each([
  ['Terms of Service', <TermsPage key="terms" />],
  ['Privacy Policy', <PrivacyPage key="privacy" />],
])('%s operator identity', (_name, page) => {
  let text = ''

  beforeEach(() => {
    text = renderedText(page)
  })

  it('names Open Mercato sp. z o.o. as the operating entity', () => {
    expect(text).toContain(operatorName)
  })

  it('discloses the current registration identifiers', () => {
    for (const identifier of registrationIdentifiers) {
      expect(text).toContain(identifier)
    }
  })

  it('states the registered address and registry court', () => {
    expect(text).toContain('ul. Wyspa Słodowa 7')
    expect(text).toContain('50-266 Wroc')
    expect(text).toContain('District Court for Wrocław-Fabryczna')
  })

  it('states the current share capital', () => {
    expect(text).toContain(shareCapital)
  })

  it('routes contact to the Open Mercato address', () => {
    expect(text).toContain('info@openmercato.com')
  })

  it('no longer references the superseded entity', () => {
    for (const marker of supersededIdentity) {
      expect(text).not.toContain(marker)
    }
  })
})

describe('legal documents', () => {
  it('still has legal documents to check', () => {
    // Without this, deleting every candidate would turn the check below into
    // zero test cases and the suite would pass by scanning nothing.
    expect(legalDocuments.length).toBeGreaterThan(0)
  })

  it.each(legalDocuments)('%s no longer references the superseded entity', (relativePath) => {
    const contents = readFileSync(join(repoRoot, relativePath), 'utf8')
    for (const marker of supersededIdentity) {
      expect(contents).not.toContain(marker)
    }
  })

  it('records the current registration identifiers in the contributor licence agreement', () => {
    const contents = readFileSync(join(repoRoot, 'apps/docs/cla.md'), 'utf8')
    expect(contents).toContain('Open Mercato spółka z o.o.')
    for (const identifier of registrationIdentifiers) {
      expect(contents).toContain(identifier)
    }
    expect(contents).toContain(shareCapital)
  })
})
