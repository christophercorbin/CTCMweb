/**
 * Drain every page of a paginated Amplify Data list query.
 *
 * A single list() call returns at most 100 records. Worse, when a `filter` is
 * supplied AppSync applies it *after* DynamoDB reads a page, so a filtered
 * list() can return zero rows while matching records sit on a later page. The
 * caller sees an empty array and no error — records silently disappear as the
 * table grows. Always drain the cursor rather than trusting the first page.
 *
 * Prefer a secondary-index query (listXByShipmentId) over a filtered scan where
 * the schema defines one: it queries the GSI instead of scanning the table.
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
  do {
    const { data, nextToken, errors } = await fetchPage(cursor)
    if (errors?.length) throw new Error(errors[0].message)
    out.push(...(data ?? []))
    cursor = nextToken ?? undefined
  } while (cursor)
  return out
}
