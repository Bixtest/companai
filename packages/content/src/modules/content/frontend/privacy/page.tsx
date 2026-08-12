import { ContentLayout } from '../components/ContentLayout'

/**
 * A short, generic policy — written from scratch, not inherited (U16).
 *
 * **Why not the one that was here.** This page previously carried a complete
 * privacy policy belonging to **Open Mercato sp. z o.o.**, with that company's
 * registered address, controller details and processing practices. Rebranding
 * it would have produced an authoritative-looking document drafted for another
 * company's jurisdiction and activities, asserting things about our users' data
 * that nobody here had checked.
 *
 * **What this is instead.** It states only what is true of the software itself
 * and what follows from how it is deployed, and it names the operator as the
 * responsible party rather than pretending to describe practices it cannot
 * know. It is deliberately short: every additional clause is another claim.
 *
 * **It is not a substitute for review.** Before this platform is offered to
 * anybody outside the operator's own organisation, somebody qualified should
 * read it against what the deployment actually does.
 */
export default function PrivacyPage() {
  return (
    <ContentLayout
      title="Privacy Policy"
      intro="How Companai handles your information"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Privacy Policy' },
      ]}
    >
      <h2>Who is responsible for your data</h2>
      <p>
        Companai is operated by the organisation that runs this installation
        (the &ldquo;operator&rdquo;). The operator decides what information is
        entered into the platform and how long it is kept, and is the party
        responsible for it. If you are unsure who operates this instance, ask
        whoever gave you access.
      </p>

      <h2>What the platform stores</h2>
      <p>
        Companai holds the information its users put into it — accounts, the
        record of work, and the log of who did what:
      </p>
      <ul>
        <li>
          <strong>Account details</strong> — the name, email address and role
          needed to sign you in and decide what you may do.
        </li>
        <li>
          <strong>Work you create</strong> — whatever your organisation uses the
          platform to record.
        </li>
        <li>
          <strong>An activity record</strong> — who performed an action, when,
          and what changed. This is a core function rather than an optional
          extra: the platform exists to make actions attributable, and that
          record is what makes an approval or a refusal explainable afterwards.
        </li>
      </ul>

      <h2>Why it is stored</h2>
      <p>
        To provide the service, to enforce the permissions your organisation has
        configured, and to keep the activity record accurate. Companai does not
        sell your information and does not use it for advertising.
      </p>

      <h2>Who can see it</h2>
      <p>
        People within your organisation, according to the permissions it has
        set. The operator may also rely on third-party services for hosting,
        email delivery or similar infrastructure; which ones depends on how this
        instance is deployed, and the operator can tell you.
      </p>

      <h2>How long it is kept</h2>
      <p>
        For as long as the operator keeps the account and its records. The
        activity record is kept for as long as the records it describes, because
        an audit trail with pieces missing is not an audit trail.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to ask for a copy of
        your information, to have it corrected, or to have it deleted. Those
        requests go to the operator, who can act on them. Note that closing an
        account does not erase the record that its actions took place — that
        record is what other people relied on at the time.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to{' '}
        <a href="mailto:privacy@corprorate.com">privacy@corprorate.com</a>.
      </p>

      <p>
        See also our <a href="/terms">Terms of Service</a>.
      </p>
    </ContentLayout>
  )
}
