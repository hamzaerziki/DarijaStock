import { describe, it, expect } from "vitest";
import { splitMessages } from "./validators";

describe("splitMessages", () => {
  it("splits on blank lines", () => {
    expect(splitMessages("a\nb\n\nc\nd")).toEqual(["a\nb", "c\nd"]);
  });
  it("ignores trailing/leading whitespace", () => {
    expect(splitMessages("  \n\n  hello  \n\n")).toEqual(["hello"]);
  });
  it("returns empty array for blank input", () => {
    expect(splitMessages("   ")).toEqual([]);
    expect(splitMessages("")).toEqual([]);
  });
  it("matches the count shown in the UI counter", () => {
    const text = "msg1\nmsg1b\n\nmsg2\n\n\nmsg3";
    expect(splitMessages(text)).toHaveLength(3);
  });
});
