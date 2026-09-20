/** Safety valve: stop draining rather than spin forever on a bad cursor. */
const MAX_PAGES = 200

/**
 * Drain every page of a paginated Amplify Data list query.
 *
 * `list()` returns one page — the supplied `limit` (default 100) or DynamoDB's
 * 1MB page, whichever comes first. When a `filter` is supplied AppSync applies
 * it *after* that page is read, so a filtered list() can return few or no rows
 * while matching records sit on a later page. The caller sees a short array and
 * no error, and records quietly go missing as the table grows. Always drain the
 * cursor rather than trusting the first page.
 *
 * Prefer a secondary-index query (listXByShipmentId) over a filtered scan where
 * the schema defines one: it queries the GSI instead of scanning the table.
 *
 * Partial success is preserved. AppSync routinely returns rows *and* errors
 * together — one row with a null required field, or an item the caller may not
 * read, fails that item without failing the query. Dropping the whole page in
 * that case would hide good data, which is the very failure this helper exists
 * to prevent, so errors are logged and only thrown when nothing came back.
 */
export async function listAll<T>(
  fetchPage: (token?: string) => Promise<{
    data?: T[] | null
    nextToken?: string | null
    errors?: readonly { message: string }[] | null
  }>
): Promise<T[]> {
  const out: T[] = []
  let cursor: string | undefined
  let pages = 0

  do {
    const { data, nextToken, errors } = await fetchPage(cursor)

    if (errors?.length) {
      const detail = errors.map((e) => e.message).join('; ')
      // Nothing usable came back — surface it instead of returning a silently
      // empty list that reads as "no records".
      if (!data?.length) throw new Error(detail)
      console.error('Partial result from list query:', detail)
    }

    out.push(...(data ?? []))

    const next = nextToken ?? undefined
    // A resolver echoing the same cursor would loop forever and hang the tab.
    if (next && next === cursor) {
      console.error('Pagination cursor did not advance; stopping early.')
      break
    }
    cursor = next
  } while (cursor && ++pages < MAX_PAGES)

  if (cursor) console.error(`Stopped after ${MAX_PAGES} pages; results may be incomplete.`)
  return out
}
