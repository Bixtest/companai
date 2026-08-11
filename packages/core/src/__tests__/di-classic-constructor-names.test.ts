/**
 * In CLASSIC mode, a constructor parameter name *is* a dependency name.
 *
 * `di-classic-proxy.test.ts` guards the destructuring-factory half of this trap.
 * This guards the other half: `asClass(Foo)` makes Awilix read `Foo`'s
 * constructor parameter **names** and resolve each one by name. Rename a
 * parameter and you have renamed a dependency.
 *
 * That is not a theoretical failure. Adding a `delegations` parameter to
 * `RbacService` on 2026-08-11 — where the registration is `delegationService` —
 * made every boot die with `Could not resolve 'delegations'`. Typecheck passed,
 * lint passed, 12,768 tests passed, and the server would not start: no unit test
 * constructs a real container, so nothing in the gate looks at this.
 *
 * **What this guard is.** It reads each module's `di.ts`, finds every
 * `asClass(Foo)` registration, locates `Foo`'s constructor, and checks each
 * parameter name is something the container can actually supply. It is a static
 * approximation — it cannot see registrations made in other packages — so
 * unknown names are reported rather than assumed wrong only when they look like
 * a service (see `CONTAINER_WIDE` below).
 */
import fs from 'node:fs'
import path from 'node:path'

const packagesRoot = path.resolve(__dirname, '..', '..', '..')

/**
 * Names the request container supplies everywhere, registered outside any one
 * module's `di.ts`.
 *
 * Kept short on purpose: every entry here is a check this guard stops doing.
 */
const CONTAINER_WIDE = new Set([
  'em', 'orm', 'cache', 'queue', 'eventBus', 'container', 'resolve', 'logger', 'config',
])

function moduleDiFiles(): string[] {
  const found: string[] = []
  let packageNames: string[]
  try {
    packageNames = fs.readdirSync(packagesRoot)
  } catch {
    return found
  }
  for (const packageName of packageNames) {
    const modulesDir = path.join(packagesRoot, packageName, 'src', 'modules')
    try {
      if (!fs.statSync(modulesDir).isDirectory()) continue
    } catch {
      continue
    }
    for (const moduleName of fs.readdirSync(modulesDir)) {
      const diFile = path.join(modulesDir, moduleName, 'di.ts')
      // The very race trap-1 in `knowledge/test-gate.md` describes: a path listed
      // a moment ago may already be gone.
      try {
        if (fs.statSync(diFile).isFile()) found.push(diFile)
      } catch {
        continue
      }
    }
  }
  return found
}

/** Registration names declared anywhere in a `di.ts`, however registered. */
function registeredNames(source: string): Set<string> {
  const names = new Set<string>()
  for (const match of source.matchAll(/(\w+)\s*:\s*as(?:Class|Function|Value)\s*\(/g)) {
    names.add(match[1])
  }
  return names
}

/** `asClass(Foo)` occurrences, with the local name of the class. */
function asClassTargets(source: string): string[] {
  return [...source.matchAll(/as(?:Class)\s*\(\s*(\w+)\s*[),]/g)].map((match) => match[1])
}

/** Where a class was imported from, resolved to a file path. */
function importedFrom(source: string, className: string, diFile: string): string | null {
  const pattern = new RegExp(`import\\s*\\{[^}]*\\b${className}\\b[^}]*\\}\\s*from\\s*'([^']+)'`)
  const match = source.match(pattern)
  if (!match) return null
  const specifier = match[1]
  const relative = specifier.startsWith('@open-mercato/core/')
    ? path.join(packagesRoot, 'core', 'src', specifier.slice('@open-mercato/core/'.length))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(diFile), specifier)
      : null
  if (!relative) return null
  const candidate = `${relative}.ts`
  try {
    return fs.statSync(candidate).isFile() ? candidate : null
  } catch {
    return null
  }
}

/** Constructor parameter names of a class, or `null` when it has no constructor. */
/**
 * Comments are removed before anything else is parsed.
 *
 * A doc comment inside a parameter list is ordinary in this codebase, and its
 * prose contains brackets — `asClass(Foo)`, `(see below)`. Counting those as
 * code makes the bracket matcher close the parameter list early and silently
 * drop every parameter after it, which is precisely how the first version of
 * this guard passed while the bug it was written for was present.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // `.` stops at a line break, so this clears a line comment without needing
    // an escape for the newline itself. The `[^:]` guard keeps `https://` and
    // other URLs in strings from being mistaken for one.
    .replace(/(^|[^:])\/\/.*/g, '$1')
}

function constructorParameterNames(rawClassSource: string, className: string): string[] | null {
  const classSource = stripComments(rawClassSource)
  const classIndex = classSource.indexOf(`class ${className}`)
  if (classIndex === -1) return null
  const ctorIndex = classSource.indexOf('constructor(', classIndex)
  if (ctorIndex === -1) return null

  let depth = 0
  let end = -1
  const open = ctorIndex + 'constructor'.length
  for (let index = open; index < classSource.length; index += 1) {
    const char = classSource[index]
    if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) { end = index; break }
    }
  }
  if (end === -1) return null

  const params = classSource.slice(open + 1, end)
  const names: string[] = []
  let depthInParams = 0
  let current = ''
  for (const char of params) {
    // Angle brackets are deliberately not tracked. `>` closes a generic and also
    // ends an arrow type, so counting it turns `(x: A) => B` into a depth of -1
    // and every parameter after it is parsed against the wrong nesting. Brackets
    // that are never ambiguous are enough to find the top-level commas.
    if ('([{'.includes(char)) depthInParams += 1
    if (')]}'.includes(char)) depthInParams -= 1
    if (char === ',' && depthInParams === 0) { names.push(current); current = '' } else current += char
  }
  names.push(current)

  return names
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    // Strip modifiers, then take the identifier before `?`, `:` or `=`.
    .map((raw) => raw.replace(/^(?:public|private|protected|readonly)\s+/g, '').trim())
    .map((raw) => raw.split(/[?:=]/)[0].trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name))
}

describe('asClass constructor parameters name real registrations', () => {
  const diFiles = moduleDiFiles()

  it('finds module di.ts files to check', () => {
    // A guard that checked nothing would pass forever without saying so.
    expect(diFiles.length).toBeGreaterThan(3)
  })

  it('never asks the container for a name nothing registers', () => {
    const problems: string[] = []

    for (const diFile of diFiles) {
      let source: string
      try {
        source = fs.readFileSync(diFile, 'utf8')
      } catch {
        continue
      }
      const registered = registeredNames(source)

      for (const className of new Set(asClassTargets(source))) {
        const classFile = importedFrom(source, className, diFile)
        if (!classFile) continue
        let classSource: string
        try {
          classSource = fs.readFileSync(classFile, 'utf8')
        } catch {
          continue
        }
        const parameters = constructorParameterNames(classSource, className)
        if (!parameters) continue

        for (const parameter of parameters) {
          if (registered.has(parameter) || CONTAINER_WIDE.has(parameter)) continue
          problems.push(
            `${path.relative(packagesRoot, diFile)}: asClass(${className}) needs '${parameter}', ` +
            `which nothing in that di.ts registers`,
          )
        }
      }
    }

    expect(problems).toEqual([])
  })
})
