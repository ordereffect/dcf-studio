import { describe, expect, it } from "vitest";
import { normalizeTickers } from "./watchlist";

describe("normalizeTickers", () => {
  it("upper-cases, trims, de-duplicates and drops junk", () => {
    expect(normalizeTickers([" aapl", "MSFT", "AAPL", "", "brk.b", "<script>", "^GSPC"])).toEqual(["AAPL", "MSFT", "BRK.B", "^GSPC"]);
  });
});
