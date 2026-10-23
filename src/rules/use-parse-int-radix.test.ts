import { ruleTester } from "../test-utils/rule-tester.ts";
import { useParseIntRadix } from "./use-parse-int-radix.ts";

ruleTester.run("use-parse-int-radix", useParseIntRadix, {
  invalid: [
    { code: "parseInt(s);", errors: 1, name: "基数の無い parseInt は報告する" },
    {
      code: "Number.parseInt(s);",
      errors: 1,
      name: "Number.parseInt も対象にする",
    },
    { code: "parseInt();", errors: 1, name: "引数の無い parseInt は報告する" },
    {
      code: "parseInt(s, 1);",
      errors: 1,
      name: "2〜36 の範囲外の基数は報告する",
    },
    { code: "parseInt(s, 2.5);", errors: 1, name: "整数でない基数は報告する" },
    { code: "parseInt(s, '10');", errors: 1, name: "文字列の基数は報告する" },
    {
      code: "parseInt(s, undefined);",
      errors: 1,
      name: "undefined の基数は報告する",
    },
  ],
  valid: [
    { code: "parseInt(s, 10);", name: "基数のある parseInt は許可する" },
    {
      code: "Number.parseInt(s, isHex ? 16 : 10);",
      name: "式の基数は検査しない",
    },
    { code: "parseInt(...args);", name: "spread の引数は検査しない" },
    {
      code: "const parseInt = (s) => s; parseInt(s);",
      name: "グローバルでない parseInt は対象外",
    },
  ],
});
