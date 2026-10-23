import { ruleTester } from "../test-utils/rule-tester.ts";
import { sortKeys } from "./sort-keys.ts";

ruleTester.run("sort-keys", sortKeys, {
  invalid: [
    {
      code: "const o = { b: 1, a: 2 };",
      errors: 1,
      name: "並んでいないキーを並べ替える",
      output: "const o = { a: 2, b: 1 };",
    },
    {
      code: "const o = { a10: 1, a9: 2, A: 3 };",
      errors: 1,
      name: "大文字を先にし、数字は数値として比べる",
      output: "const o = { A: 3, a9: 2, a10: 1 };",
    },
    {
      code: "const o = { b: 1, a: 2, ...rest, d: 3, c: 4 };",
      errors: 1,
      name: "spread の前後で別々に並べ替える",
      output: "const o = { a: 2, b: 1, ...rest, c: 4, d: 3 };",
    },
    {
      code: "const o = { 'b-c': 1, b_c: 2 };",
      errors: 1,
      name: "記号は CLDR の照合順で比べる（_ < -）",
      output: "const o = { b_c: 2, 'b-c': 1 };",
    },
  ],
  valid: [
    {
      code: "const o = { a: 1, b() {}, get c() { return 1; } };",
      name: "メソッドとアクセサも名前で並べる",
    },
    {
      code: "const o = { b: 1, [k]: 2, a: 3 };",
      name: "計算キーの前後は別々に扱う",
    },
    {
      code: "const o = { a: 1, B: 2, b: 3 };",
      name: "大文字小文字は A < a < B < b の順",
    },
  ],
});
