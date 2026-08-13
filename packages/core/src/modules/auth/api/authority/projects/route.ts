import { NextResponse } from 'next/server'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import type { ProjectService } from '@open-mercato/core/modules/auth/services/projectService'

/**
 * The matters work is organised into, and how much each one governs.
 *
 * **Read-only, on purpose.** Creating a project, adding a member with an
 * overlay and assigning records to it are three different acts with three
 * different blast radii, and the service already exposes them to callers that
 * know what they are doing. Wrapping all three in one POST because a screen
 * wanted them would produce an endpoint whose effect class depends on its body
 * — exactly the shape this platform refuses everywhere else.
 *
 * So this route answers the question an administrator opens the page with, and
 * the writes stay where their consequences are visible one at a time.
 */

const FEATURE_MANAGE = 'auth.projects.manage'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [FEATURE_MANAGE] },
}

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const container = await createRequestContainer()
  const projects = container.resolve('projectService') as ProjectService

  // Closed projects are included. Closing a matter does not un-govern the
  // records inside it — the rules still apply, and a list that hid them would
  // suggest otherwise.
  const items = await projects.summaries({ tenantId: auth.tenantId })
  return NextResponse.json({ items })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authority',
  summary: 'Projects and how much each one governs',
  methods: {
    GET: {
      summary: 'List projects in this tenant',
      description:
        'Each project with its grade, how many people work in it and how many records it governs. ' +
        'Closed projects are included: closing a matter does not un-govern the records inside it. ' +
        'A project with no grade says nothing about the acts inside it rather than declaring them ' +
        'negligible.',
      responses: [{ status: 200, description: 'The projects' }],
    },
  },
}
