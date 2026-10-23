import { describe, expect, it } from "vitest";
import { naturalCompare } from "./natural-compare.ts";

describe("naturalCompare", () => {
  it.each([
    {
      expected: ["A", "a", "B", "b"],
      name: "大文字を先にし、英字は A < a < B < b",
    },
    {
      expected: ["a2", "a9", "a10", "a100"],
      name: "数字の連なりは数値として比べる",
    },
    { expected: ["1", "01", "001"], name: "先頭の 0 も桁として数える" },
    {
      expected: ["_", "-", ".", "$", "0", "a"],
      name: "記号 < 数字 < 英字の順（CLDR）",
    },
    { expected: ["ab", "abc", "abd"], name: "前方一致なら短い方が先" },
    {
      expected: ["x1y", "x1z", "x10a"],
      name: "数が同じなら直後の文字で比べる",
    },
  ])("$name", ({ expected }) => {
    expect([...expected].reverse().sort(naturalCompare)).toEqual(expected);
  });
});
