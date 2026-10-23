import { describe, expect, it } from "vitest";
import { sortJsonKeys, unsortedPaths } from "./sort-keys.ts";

describe("unsortedPaths", () => {
  it.each([
    { expected: [], name: "並んでいれば空", source: '{ "a": 1, "b": 2 }' },
    {
      expected: ["/"],
      name: "ルートが並んでいない",
      source: '{ "b": 1, "a": 2 }',
    },
    {
      expected: ["/x/0"],
      name: "配列の中のオブジェクトも調べる",
      source: '{ "x": [{ "b": 1, "a": 2 }] }',
    },
    {
      expected: ["/"],
      name: "整数風のキーもソース上の並びで調べる",
      source: '{ "10": 1, "9": 2 }',
    },
  ])("$name", ({ expected, source }) => {
    expect(unsortedPaths(source)).toEqual(expected);
  });
});

describe("sortJsonKeys", () => {
  it("ネストしたオブジェクトのキーを natural order に並べ、値はそのまま残す", () => {
    expect(
      sortJsonKeys(
        '{ "b": { "y": "1.0", "x": [2, 1] }, "a": null, "10": true }',
      ),
    ).toBe(
      '{\n  "10": true,\n  "a": null,\n  "b": {\n    "x": [\n      2,\n      1\n    ],\n    "y": "1.0"\n  }\n}\n',
    );
  });
});
