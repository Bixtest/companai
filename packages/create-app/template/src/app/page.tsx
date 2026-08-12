import { redirect } from 'next/navigation'
import { getAuthFromCookies } from '@open-mercato/shared/lib/auth/server'

// The home route is a pure router: it never renders. Signed in, you land in the
// app; otherwise at the login.
//
// Two demo affordances used to live here and are gone. It sent every visitor to
// `/start` — a role picker and an onboarding pitch — until a dismissal cookie
// was set. And with `OM_AUTOLOGIN_*` configured it signed unauthenticated
// visitors in automatically, from a password held in an environment variable.
// A platform whose purpose is knowing who did what has no business logging
// somebody in without asking who they are.
export default async function Home() {
  const auth = await getAuthFromCookies()

  redirect(auth ? '/backend' : '/login')
}
