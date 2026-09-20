#!/usr/bin/env node
/**
 * Guard against undrained Amplify Data list queries.
 *
 * A `list()` (or a generated index query) returns ONE page — the supplied
 * `limit`, default 100, or DynamoDB's 1MB page. When a `filter` is supplied
 * AppSync applies it *after* that page is read, so a filtered list() can come
 * back short, or empty, while matching rows sit on a later page. No error is
 * raised. Records simply go missing as a table grows, which is how 54% of
 * customer-uploaded invoices became invisible to admins.
 *
 * Every call must therefore pass `nextToken` and drain the cursor — in practice
 * by going through `listAll` (apps/web/src/lib/listAll.ts).
 *
 * Escape hatch: put `// pagination-ok: <reason>` on the line above the call
 * when a single page is genuinely correct, and say why.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
// Optional argument lets the test suite point the scan at fixtures, so the
// guard itself is verified to still catch violations rather than silently
// rotting into an always-pass.
const SCAN_DIR = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'apps/web/src')
const LOOKAHEAD = 8 // lines of a call expression to inspect
const ALLOW = /pagination-ok:/

// client.models.Foo.list(  |  client.models.Foo.listFooByBar(
const CALL = /\.models\.([A-Za-z0-9_]+)\.(list[A-Za-z0-9_]*)\s*\(/

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) yield p
  }
}

const violations = []

for (const file of walk(SCAN_DIR)) {
  const rel = relative(ROOT, file) || file
  if (rel.endsWith('lib/listAll.ts')) continue // the drainer itself
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, i) => {
    const m = CALL.exec(line)
    if (!m) return
    if (ALLOW.test(lines[i - 1] ?? '') || ALLOW.test(line)) return

    // Accept the call if nextToken is threaded through it.
    const window = lines.slice(i, i + LOOKAHEAD).join('\n')
    if (window.includes('nextToken')) return

    violations.push({
      file: rel,
      line: i + 1,
      model: m[1],
      method: m[2],
      text: line.trim(),
    })
  })
}

if (violations.length === 0) {
  console.log('✓ pagination check: every list query drains its cursor')
  process.exit(0)
}

console.error(`\n✗ pagination check: ${violations.length} undrained list quer${violations.length === 1 ? 'y' : 'ies'}\n`)
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`)
  console.error(`    ${v.text}`)
  console.error(`    ${v.model}.${v.method}() reads a single page — rows past it are dropped silently.\n`)
}
console.error('Fix: wrap the call in listAll() from apps/web/src/lib/listAll.ts and pass { limit, nextToken }.')
console.error('If one page is genuinely correct, add  // pagination-ok: <reason>  above the call.\n')
process.exit(1)
