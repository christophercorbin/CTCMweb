import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const REPO = resolve(__dirname, '../../../..')
const SCRIPT = join(REPO, 'scripts/check-pagination.mjs')
const FIXTURES = join(__dirname, '__fixtures__/pagination')

/** Run the guard over a throwaway dir seeded with one fixture. */
function runOn(fixture: string) {
  const dir = mkdtempSync(join(tmpdir(), 'pagination-'))
  try {
    writeFileSync(join(dir, 'sample.ts'), readFileSync(join(FIXTURES, fixture), 'utf8'))
    try {
      const stdout = execFileSync('node', [SCRIPT, dir], { cwd: REPO, encoding: 'utf8' })
      return { code: 0, output: stdout }
    } catch (e) {
      const err = e as { status: number; stdout: string; stderr: string }
      return { code: err.status, output: err.stdout + err.stderr }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('check-pagination guard', () => {
  it('rejects an undrained list()', () => {
    // If this ever passes, the guard has rotted into an always-pass and every
    // other call site is unprotected.
    const { code, output } = runOn('bad.ts.txt')
    expect(code).toBe(1)
    expect(output).toMatch(/undrained list quer/i)
  })

  it('accepts a drained list()', () => {
    expect(runOn('good.ts.txt').code).toBe(0)
  })

  it('honours the pagination-ok opt-out', () => {
    expect(runOn('allowed.ts.txt').code).toBe(0)
  })
})
