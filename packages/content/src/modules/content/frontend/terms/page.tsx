import { ContentLayout } from '../components/ContentLayout'

/**
 * Short, generic terms — written from scratch, not inherited (U16).
 *
 * **Why not the 463 lines that were here.** They were the terms of service of
 * **Open Mercato sp. z o.o.**: that company's incorporation details, licence
 * grant, liability caps and governing law. Renaming them would have produced a
 * document reading as ours while binding our users under terms drafted for
 * somebody else's business and nobody here had reviewed.
 *
 * **What this is instead.** The few things that are actually true and useful to
 * state, in plain language, with the governing law left to the operator because
 * it depends on where they are — which a developer cannot decide for them.
 *
 * **Review before commercial use.** These are a reasonable starting point for
 * an internal deployment, not a substitute for advice.
 */
export default function TermsPage() {
  return (
    <ContentLayout
      title="Terms of Service"
      intro="The basis on which Companai is provided"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Terms of Service' },
      ]}
    >
      <h2>Who these terms are between</h2>
      <p>
        These terms are between you and the organisation that operates this
        installation of Companai (the &ldquo;operator&rdquo;). Your right to use
        it comes from the operator, who decides who gets an account and what
        each account may do.
      </p>

      <h2>Using the platform</h2>
      <p>You agree to:</p>
      <ul>
        <li>use your own account, and not share its credentials;</li>
        <li>
          use the platform for your organisation&rsquo;s legitimate work, and
          not to break the law or anybody else&rsquo;s rights;
        </li>
        <li>
          not attempt to bypass the permission and approval controls, or to
          alter the activity record.
        </li>
      </ul>
      <p>
        The last one matters more here than it would elsewhere. Companai&rsquo;s
        purpose is to make actions attributable and decisions explainable; an
        account used by two people, or a record that has been edited, defeats
        that for everybody relying on it.
      </p>

      <h2>Your content</h2>
      <p>
        What you put into the platform belongs to your organisation, not to us.
        The operator controls it, keeps it, and decides when it is removed.
      </p>

      <h2>Availability</h2>
      <p>
        The platform is provided as it is. The operator does not promise it will
        be available without interruption, and may need to take it down for
        maintenance, upgrades or repairs.
      </p>

      <h2>Automated and assisted actions</h2>
      <p>
        Companai can carry out work automatically or on the suggestion of
        software. Where it does, the record shows what acted, under whose
        authority, and who approved it if approval was required. Automation does
        not transfer responsibility away from the organisation that configured
        it.
      </p>

      <h2>Ending access</h2>
      <p>
        The operator may suspend or close an account, for example when somebody
        leaves the organisation or breaks these terms. Closing an account does
        not delete the record of what it did.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, the operator is not liable for indirect or
        consequential loss arising from use of the platform. Nothing here
        excludes liability that cannot lawfully be excluded.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the law of the place where the operator is
        established, unless the operator states otherwise in writing.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to{' '}
        <a href="mailto:legal@corprorate.com">legal@corprorate.com</a>.
      </p>

      <p>
        See also our <a href="/privacy">Privacy Policy</a>.
      </p>
    </ContentLayout>
  )
}
