import { describe, expect, it } from "vitest";
import { checkoutReturnFlag } from "./checkoutReturn";

const p = (s: string) => new URLSearchParams(s);

describe("checkoutReturnFlag", () => {
  it("reconhece aprovado por status ou collection_status", () => {
    expect(checkoutReturnFlag(p("status=approved&payment_id=1"))).toBe("approved");
    expect(checkoutReturnFlag(p("collection_status=approved"))).toBe("approved");
  });
  it("reconhece recusado", () => {
    expect(checkoutReturnFlag(p("status=rejected"))).toBe("rejected");
    expect(checkoutReturnFlag(p("collection_status=rejected"))).toBe("rejected");
    expect(checkoutReturnFlag(p("status=failure"))).toBe("rejected");
  });
  it("ignora o resto", () => {
    expect(checkoutReturnFlag(p(""))).toBeNull();
    expect(checkoutReturnFlag(p("status=pending"))).toBeNull();
    expect(checkoutReturnFlag(p("status=in_process"))).toBeNull();
  });
});
