/**
 * Row 16 (Option A) coverage gate — every declared row-scope is well-formed.
 *
 * Row scope is **opt-in** and declared on the CRUD route's `orm` config
 * (`OrmEntityConfig.ownerField` / `ownerFeature`, see `lib/crud/factory.ts`), NOT
 * on the search registry — because row scope must be declarable for EVERY CRUD
 * entity, including non-searchable ones (e.g. `api_keys`, which has no
 * `search.ts`). That makes the right invariant here *well-formedness of whatever
 * is declared*, not 100% coverage:
 *
 *  - `ownerField` and `ownerFeature` are a PAIR: declaring one without the other
 *    is inert or ambiguous. `ownerField` alone would scope on a column but never
 *    have a feature to switch it on (the `.own` modifier attaches to the feature);
 *    `ownerFeature` alone names a switch with no column to filter. So both must be
 *    present together, and both must be non-empty strings.
 *
 * This is the same static-AST-walker shape as `search-acl-coverage.test.ts`
 * (CC-46), the sibling coverage guard — a new route declares its row scope in one
 * place, under the same discipline.
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript-js'

const REPO_ROOT = path.resolve(__dirname, '../../../../../..')

type OrmScopeFinding = {
  file: string
  ownerField: string | null
  ownerFeature: string | null
  hasOwnerFieldKey: boolean
  hasOwnerFeatureKey: boolean
  /** `orm` was passed by shorthand or by reference — cannot be analysed statically. */
  unanalysable?: boolean
}

function parse(filePath: string): ts.SourceFile {
  const text = fs.readFileSync(filePath, 'utf8')
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
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

function readStringLiteral(expr: ts.Expression | null): string | null {
  if (expr && ts.isStringLiteral(expr)) return expr.text
  return null
}

/**
 * Walk a file and find every `orm` property passed anywhere. We match:
 *  - `orm: { ... }`  (a literal object) — analysed for ownerField/ownerFeature;
 *  - `orm`            (shorthand, e.g. `{ orm }`) — flagged as un-analysable;
 *  - `orm: <expr>`    (a variable/function reference) — flagged as un-analysable.
 *
 * The un-analysable cases matter: a route that hoists its orm config into a
 * variable and passes it by reference would otherwise be INVISIBLE to this gate,
 * silently escaping the ownerField/ownerFeature pairing rule. We surface them so
 * the reviewer sees the escape hatch rather than a vacuous pass.
 */
function collectOrmScopes(filePath: string): OrmScopeFinding[] {
  const sf = parse(filePath)
  const findings: OrmScopeFinding[] = []
  const visit = (node: ts.Node): void => {
    // Shorthand property: `{ orm }`
    if (ts.isShorthandPropertyAssignment(node) && node.name.text === 'orm') {
      findings.push({
        file: filePath,
        ownerField: null,
        ownerFeature: null,
        hasOwnerFieldKey: false,
        hasOwnerFeatureKey: false,
        unanalysable: true,
      })
    }
    if (ts.isPropertyAssignment(node)) {
      const name = node.name
      const isOrm =
        (ts.isIdentifier(name) && name.text === 'orm') ||
        (ts.isStringLiteral(name) && name.text === 'orm')
      if (isOrm) {
        if (ts.isObjectLiteralExpression(node.initializer)) {
          const obj = node.initializer
          const ownerFieldExpr = getProperty(obj, 'ownerField')
          const ownerFeatureExpr = getProperty(obj, 'ownerFeature')
          findings.push({
            file: filePath,
            ownerField: readStringLiteral(ownerFieldExpr),
            ownerFeature: readStringLiteral(ownerFeatureExpr),
            hasOwnerFieldKey: ownerFieldExpr !== null,
            hasOwnerFeatureKey: ownerFeatureExpr !== null,
          })
        } else {
          // `orm: someVar` or `orm: buildCfg()` — cannot analyse statically.
          findings.push({
            file: filePath,
            ownerField: null,
            ownerFeature: null,
            hasOwnerFieldKey: false,
            hasOwnerFeatureKey: false,
            unanalysable: true,
          })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return findings
}

function collectRouteFiles(): string[] {
  const out: string[] = []
  const pkgsDir = path.join(REPO_ROOT, 'packages')
  if (!fs.existsSync(pkgsDir)) return out
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue
        walk(full)
      } else if (entry.isFile() && entry.name === 'route.ts' && dir.includes(`${path.sep}api${path.sep}`)) {
        out.push(full)
      }
    }
  }
  walk(pkgsDir)
  return out
}

describe('Row 16 (Option A): declared row-scope (orm.ownerField/ownerFeature) is well-formed', () => {
  const routeFiles = collectRouteFiles()
  const allFindings = routeFiles.flatMap((f) => collectOrmScopes(f))
  const declared = allFindings.filter((f) => f.hasOwnerFieldKey || f.hasOwnerFeatureKey)

  it('discovers route files and orm configs (sanity — guards against a vacuous pass)', () => {
    expect(routeFiles.length).toBeGreaterThan(20)
    expect(allFindings.length).toBeGreaterThan(10)
  })

  it('at least one route opts in (guards against the gate passing on an empty set)', () => {
    expect(declared.length).toBeGreaterThan(0)
  })

  it('no route passes `orm` in an un-analysable shape (shorthand or by reference)', () => {
    // If a route hoists its orm config into a variable and passes it by reference,
    // this walker would not see its ownerField/ownerFeature and the pairing rule
    // could be silently escaped. Flag it so the escape hatch is closed, not hidden.
    const unanalysable = routeFiles.flatMap((f) => collectOrmScopes(f)).filter((f) => f.unanalysable)
    const detail = unanalysable.map((f) => `  ${path.relative(REPO_ROOT, f.file)}`).join('\n')
    expect(
      unanalysable.length === 0 ? '' : `Un-analysable orm configs (${unanalysable.length}) — inline them:\n${detail}`,
    ).toBe('')
  })

  it('ownerField and ownerFeature are declared together, both non-empty strings', () => {
    const bad: string[] = []
    for (const f of declared) {
      const rel = path.relative(REPO_ROOT, f.file)
      if (f.hasOwnerFieldKey !== f.hasOwnerFeatureKey) {
        bad.push(`  ${rel} — ownerField and ownerFeature must be declared together (found only one)`)
        continue
      }
      if (!f.ownerField || f.ownerField.trim().length === 0) {
        bad.push(`  ${rel} — ownerField must be a non-empty string literal`)
      }
      if (!f.ownerFeature || f.ownerFeature.trim().length === 0) {
        bad.push(`  ${rel} — ownerFeature must be a non-empty string literal`)
      }
    }
    expect(bad.length === 0 ? '' : `Malformed row-scope declarations (${bad.length}):\n${bad.join('\n')}`).toBe('')
  })
})
