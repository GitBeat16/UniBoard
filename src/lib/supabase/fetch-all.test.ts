import { describe, expect, it } from "vitest";
import { fetchAll } from "./fetch-all";

/** A fake table that, like PostgREST, never returns more than `cap` rows. */
function table(total: number, cap: number) {
  const rows = Array.from({ length: total }, (_, i) => i);
  const calls: Array<[number, number]> = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null };
  };
  return { page, calls };
}

describe("fetchAll", () => {
  it("returns every row past the 1000-row cap", async () => {
    const { page } = table(2345, 1000);
    const rows = await fetchAll(page);
    expect(rows).toHaveLength(2345);
    expect(rows.at(-1)).toBe(2344);
  });

  it("stays correct when the server cap is below our page size", async () => {
    const { page } = table(1200, 500);
    expect(await fetchAll(page)).toHaveLength(1200);
  });

  it("handles an empty table with one request", async () => {
    const { page, calls } = table(0, 1000);
    expect(await fetchAll(page)).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("throws instead of returning partial data", async () => {
    let n = 0;
    const page = async () =>
      n++ === 0
        ? { data: [1, 2, 3], error: null }
        : { data: null, error: { message: "boom" } };
    await expect(fetchAll(page, { pageSize: 3 })).rejects.toThrow("boom");
  });
});
