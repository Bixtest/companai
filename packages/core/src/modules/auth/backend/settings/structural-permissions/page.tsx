import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { StructuralPermissionsSettings } from '../../../components/StructuralPermissionsSettings'

export default function StructuralPermissionsPage() {
  return (
    <Page>
      <PageBody className="space-y-8">
        <StructuralPermissionsSettings />
      </PageBody>
    </Page>
  )
}
