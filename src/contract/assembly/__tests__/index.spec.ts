import { startWork } from "..";

describe("BetterBountyNear", () => {
  it("Should revert if bounty doesn't exist", () => {
    
    expect(startWork).toThrow("Bounty Not Found");

  });
});
