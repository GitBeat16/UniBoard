/**
 * PostgREST stops at `max_rows` (1000 on Supabase by default) and says nothing
 * about it: a term imported from a busy timetable — 30 classes a week across
 * the 34-week import window — is already past that, and the rows that fall off
 * are the *later* ones, so "you can miss N more" quietly counts a shorter term.
 *
 * This pages with `.range()` until the server hands back an empty page. It
 * stops on empty rather than on "fewer than asked for" so it stays correct if
 * the project's `max_rows` is ever lowered below our page size.
 *
 * The query MUST have a total order (end it with `.order("id")`), or rows can
 * shift between pages and be skipped or repeated.
 *
 * Errors throw instead of degrading to `[]`: silently partial attendance data
 * is the exact failure this exists to prevent.
 */
export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  { pageSize = PAGE_SIZE, maxRows = 50_000 }: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const out: T[] = [];
  while (out.length < maxRows) {
    const { data, error } = await page(out.length, out.length + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
  }
  return out;
}
