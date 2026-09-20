import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listAll } from './listAll'

describe('listAll', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('concatenates every page, not just the first', async () => {
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: ['a'], nextToken: 't1' })
      .mockResolvedValueOnce({ data: ['b'], nextToken: 't2' })
      .mockResolvedValueOnce({ data: ['c'], nextToken: null })

    expect(await listAll<string>(page)).toEqual(['a', 'b', 'c'])
    expect(page).toHaveBeenCalledTimes(3)
    expect(page).toHaveBeenNthCalledWith(1, undefined)
    expect(page).toHaveBeenNthCalledWith(2, 't1')
  })

  it('returns an empty array when there is nothing to list', async () => {
    expect(await listAll(vi.fn().mockResolvedValue({ data: [], nextToken: null }))).toEqual([])
  })

  it('keeps rows when AppSync returns data alongside errors', async () => {
    // Partial success must not discard good rows — doing so would hide data,
    // the exact failure this helper exists to prevent.
    const page = vi.fn().mockResolvedValue({
      data: ['kept'],
      nextToken: null,
      errors: [{ message: 'Unauthorized on one item' }],
    })
    expect(await listAll<string>(page)).toEqual(['kept'])
  })

  it('throws when a page returns errors and no data', async () => {
    const page = vi.fn().mockResolvedValue({
      data: [],
      nextToken: null,
      errors: [{ message: 'Unauthorized' }, { message: 'Also this' }],
    })
    await expect(listAll(page)).rejects.toThrow('Unauthorized; Also this')
  })

  it('stops instead of looping forever when the cursor never advances', async () => {
    const page = vi.fn().mockResolvedValue({ data: ['x'], nextToken: 'stuck' })
    // Without the guard this never resolves.
    await expect(listAll<string>(page)).resolves.toEqual(['x', 'x'])
  })
})
