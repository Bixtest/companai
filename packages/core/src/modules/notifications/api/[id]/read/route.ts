import { createSingleNotificationActionRoute, createSingleNotificationActionOpenApi } from '../../../lib/routeHelpers'

export const metadata = {
  PUT: { requireAuth: true, byDesign: 'own-record notification action; guard-backed, no role feature needed' },
}

export const PUT = createSingleNotificationActionRoute('markAsRead')

export const openApi = createSingleNotificationActionOpenApi(
  'Mark notification as read',
  'Notification marked as read'
)
