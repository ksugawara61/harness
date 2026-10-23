import { ruleTester } from "../test-utils/rule-tester.ts";
import { useSimpleNumberKeys } from "./use-simple-number-keys.ts";

ruleTester.run("use-simple-number-keys", useSimpleNumberKeys, {
  invalid: [
    { code: "const o = { 0x1: 1 };", errors: 1, name: "16 進のキーは報告する" },
    {
      code: "const o = { 1_000: 1 };",
      errors: 1,
      name: "区切りの _ を含むキーは報告する",
    },
    {
      code: "const o = { 0b1: 1, 0o7: 2 };",
      errors: 2,
      name: "2 進・8 進のキーも報告する",
    },
  ],
  valid: [
    {
      code: "const o = { 1: 1, 1.5: 2 };",
      name: "10 進の数値のキーは許可する",
    },
    { code: "const o = { a: 1 };", name: "識別子のキーは対象外" },
  ],
});
