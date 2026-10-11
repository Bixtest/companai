import { createSingleNotificationActionRoute, createSingleNotificationActionOpenApi } from '../../../lib/routeHelpers'

export const metadata = {
  PUT: { requireAuth: true, byDesign: 'own-record notification action; guard-backed, no role feature needed' },
}

export const PUT = createSingleNotificationActionRoute('dismiss')

export const openApi = createSingleNotificationActionOpenApi(
  'Dismiss notification',
  'Notification dismissed'
)
