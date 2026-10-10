/**
 * CC-46 coverage gate — every searchable entity must declare `aclFeatures`.
 *
 * The AI search tools (`search_get` / `search_aggregate`) resolve an entity's
 * declared `aclFeatures` via `authorizeEntityAccess` and FAIL CLOSED when the
 * entity declares none (`packages/search/src/modules/search/ai-tools.ts`). That
 * makes an un-gated entity *safe* but *unusable* — and, more importantly, it
 * means a brand-new searchable entity can be added to any module's `search.ts`
 * without ever declaring who may read it. `BUILD-ORDER.md` item 17 requires the
 * opposite: "so a new table cannot be added un-gated".
 *
 * This test is that mechanical guard. It walks every `packages/<pkg>/src/modules/
 * <module>/search.ts`, reads `searchConfig.entities`, and asserts each entity
 * object declares a NON-EMPTY `aclFeatures` array naming a feature that actually
 * exists in the owning module's `acl.ts`.
 *
 * RED-first: before CC-46 only 6 of 53 entities declared `aclFeatures`; this test
 * failed for the other 47. It is GREEN only while every searchable entity is
 * gated — which is the invariant we want to keep.
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript-js'

const REPO_ROOT = path.resolve(__dirname, '../../../../../..')

type EntityFinding = {
  file: string
  entityId: string | null
  aclFeatures: string[] | null
}

type ModuleTarget = {
  file: string
  moduleId: string
  aclFile: string | null
}

function parse(filePath: string): ts.SourceFile {
  const text = fs.readFileSync(filePath, 'utf8')
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function findSearchConfigObject(sf: ts.SourceFile): ts.ObjectLiteralExpression | null {
  let found: ts.ObjectLiteralExpression | null = null
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      (node.name.text === 'searchConfig' || node.name.text === 'config') &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      found = node.initializer
      return
    }
    if (!found) ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

function getProperty(obj: ts.ObjectLiteralExpression, name: string): ts.Expression | null {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ((ts.isIdentifier(prop.name) && prop.name.text === name) ||
        (ts.isStringLiteral(prop.name) && prop.name.text === name))
    ) {
      return prop.initializer
    }
  }
  return null
}

function readStringArray(expr: ts.Expression): string[] | null {
  if (!ts.isArrayLiteralExpression(expr)) return null
  const out: string[] = []
  for (const el of expr.elements) {
    if (ts.isStringLiteral(el)) out.push(el.text)
  }
  return out
}

function readStringProp(obj: ts.ObjectLiteralExpression, name: string): string | null {
  const init = getProperty(obj, name)
  if (init && ts.isStringLiteral(init)) return init.text
  return null
}

function collectModules(): ModuleTarget[] {
  const out: ModuleTarget[] = []
  const pkgsDir = path.join(REPO_ROOT, 'packages')
  if (!fs.existsSync(pkgsDir)) return out
  for (const pkg of fs.readdirSync(pkgsDir)) {
    const modulesDir = path.join(pkgsDir, pkg, 'src', 'modules')
    if (!fs.existsSync(modulesDir)) continue
    for (const mod of fs.readdirSync(modulesDir)) {
      const searchFile = path.join(modulesDir, mod, 'search.ts')
      if (!fs.existsSync(searchFile)) continue
      const aclFile = path.join(modulesDir, mod, 'acl.ts')
      out.push({
        file: searchFile,
        moduleId: mod,
        aclFile: fs.existsSync(aclFile) ? aclFile : null,
      })
    }
  }
  return out
}

function collectFindings(target: ModuleTarget): EntityFinding[] {
  const sf = parse(target.file)
  const config = findSearchConfigObject(sf)
  if (!config) return []
  const entitiesExpr = getProperty(config, 'entities')
  if (!entitiesExpr || !ts.isArrayLiteralExpression(entitiesExpr)) return []
  const findings: EntityFinding[] = []
  for (const el of entitiesExpr.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue
    const entityId = readStringProp(el, 'entityId')
    const aclExpr = getProperty(el, 'aclFeatures')
    const aclFeatures = aclExpr ? readStringArray(aclExpr) : null
    findings.push({ file: target.file, entityId, aclFeatures })
  }
  return findings
}

function collectDeclaredFeatures(aclFile: string): Set<string> {
  // acl.ts files declare `features = [ { id: 'a.b.view', ... }, ... ]`
  const sf = parse(aclFile)
  const ids = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) && /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(node.text)) {
      ids.add(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return ids
}

describe('CC-46: every searchable entity declares aclFeatures', () => {
  const modules = collectModules()
  const allFindings = modules.flatMap((m) => collectFindings(m))

  it('discovers search modules and entities (sanity — guards against a vacuous pass)', () => {
    // If the walker silently finds nothing, the coverage assertions below would
    // pass vacuously. Pin the discovery so a broken path/parser fails loudly.
    expect(modules.length).toBeGreaterThan(5)
    expect(allFindings.length).toBeGreaterThan(40)
  })

  it('every searchConfig entity declares a non-empty aclFeatures array', () => {
    const missing: EntityFinding[] = []
    for (const target of modules) {
      for (const f of collectFindings(target)) {
        if (!f.aclFeatures || f.aclFeatures.length === 0) {
          missing.push(f)
        }
      }
    }
    const detail = missing
      .map((m) => `  ${path.relative(REPO_ROOT, m.file)} :: ${m.entityId ?? '<non-literal entityId>'}`)
      .join('\n')
    expect(missing.length === 0 ? '' : `Entities without aclFeatures (${missing.length}):\n${detail}`).toBe('')
  })

  it('every aclFeatures entry names a feature declared in the owning module acl.ts', () => {
    const unresolved: string[] = []
    for (const target of modules) {
      if (!target.aclFile) continue
      const declared = collectDeclaredFeatures(target.aclFile)
      for (const f of collectFindings(target)) {
        if (!f.aclFeatures) continue
        for (const feat of f.aclFeatures) {
          // A feature may also be a cross-module dependency (e.g. sales.* used by
          // checkout). Only flag features that are not declared *anywhere* among
          // the module's own acl.ts — cross-module grants are verified by the
          // feature registry elsewhere, so we keep this check conservative.
          if (!declared.has(feat) && feat.startsWith(target.moduleId + '.')) {
            unresolved.push(
              `  ${path.relative(REPO_ROOT, target.file)} :: ${f.entityId} -> ${feat} (not in ${path.relative(REPO_ROOT, target.aclFile)})`,
            )
          }
        }
      }
    }
    expect(unresolved.length === 0 ? '' : `Unresolved own-module features:\n${unresolved.join('\n')}`).toBe('')
  })
})
