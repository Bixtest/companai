import { asFunction } from 'awilix'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import { AuthorityGraphService } from '@open-mercato/core/modules/directory/services/authorityGraphService'

export function register(container: AppContainer) {
  // Scoped, so it holds the request's EntityManager and reads the graph inside
  // whatever transaction the caller has open — a ceiling computed from a
  // half-applied structural change would be worse than one computed from none.
  //
  // The cache is looked up rather than declared as a constructor dependency:
  // lean bootstraps (CLI scripts, test containers) register no cache, and this
  // service must degrade to reading the graph every time rather than failing to
  // construct. Losing a cache costs two queries; failing to construct loses the
  // authority answer entirely.
  container.register({
    authorityGraphService: asFunction((cradle: Record<string, unknown>) => {
      let cache: CacheStrategy | undefined
      try {
        cache = (cradle.cache as CacheStrategy) ?? undefined
      } catch {
        cache = undefined
      }
      return new AuthorityGraphService(cradle.em as EntityManager, cache)
    // `.proxy()` hands the resolver the cradle object. Without it this
    // container's CLASSIC injection mode reads the parameter list and goes
    // looking for a registration literally named `cradle`.
    }).scoped().proxy(),
  })
}
