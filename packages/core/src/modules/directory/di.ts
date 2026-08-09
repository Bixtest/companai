import { asClass } from 'awilix'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import { AuthorityGraphService } from '@open-mercato/core/modules/directory/services/authorityGraphService'

export function register(container: AppContainer) {
  // Scoped, so it holds the request's EntityManager and reads the graph inside
  // whatever transaction the caller has open — a ceiling computed from a
  // half-applied structural change would be worse than one computed from none.
  container.register({
    authorityGraphService: asClass(AuthorityGraphService).scoped(),
  })
}
