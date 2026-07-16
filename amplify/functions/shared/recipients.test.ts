import { describe, it, expect } from "vitest";
import { parseRecipients } from "./recipients";

describe("parseRecipients", () => {
  it("parses a single address", () => {
    expect(parseRecipients("info@cargolinkbarbados.com")).toEqual([
      "info@cargolinkbarbados.com",
    ]);
  });

  it("splits a comma-separated list into multiple recipients", () => {
    expect(
      parseRecipients("info@cargolinkbarbados.com,christophercorbin24@gmail.com")
    ).toEqual(["info@cargolinkbarbados.com", "christophercorbin24@gmail.com"]);
  });

  it("trims surrounding whitespace on each address", () => {
    expect(
      parseRecipients(" info@cargolinkbarbados.com , christophercorbin24@gmail.com ")
    ).toEqual(["info@cargolinkbarbados.com", "christophercorbin24@gmail.com"]);
  });

  it("drops empty entries from trailing or doubled commas", () => {
    expect(parseRecipients("info@cargolinkbarbados.com,,")).toEqual([
      "info@cargolinkbarbados.com",
    ]);
  });

  it("falls back to the default when undefined", () => {
    expect(parseRecipients(undefined)).toEqual(["info@cargolinkbarbados.com"]);
  });

  it("falls back to the default when blank/whitespace-only", () => {
    expect(parseRecipients("   ")).toEqual(["info@cargolinkbarbados.com"]);
  });

  it("honours a custom fallback", () => {
    expect(parseRecipients(undefined, "ops@example.com")).toEqual([
      "ops@example.com",
    ]);
  });
});
