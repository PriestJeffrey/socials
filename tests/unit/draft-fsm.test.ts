import { describe, expect, it } from "vitest";
import { canTransition, nextStatus } from "@/lib/content/draft-fsm";

describe("draft approval FSM", () => {
  it("allows draft → in_review → approved", () => {
    expect(canTransition("draft", "submit_review")).toBe(true);
    expect(nextStatus("draft", "submit_review")).toBe("in_review");
    expect(nextStatus("in_review", "approve")).toBe("approved");
  });

  it("rejects illegal approve from draft", () => {
    expect(canTransition("draft", "approve")).toBe(false);
    expect(() => nextStatus("draft", "approve")).toThrow(/Illegal/);
  });

  it("reject returns to draft", () => {
    expect(nextStatus("in_review", "reject")).toBe("draft");
  });
});
