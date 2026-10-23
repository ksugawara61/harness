import { ruleTester } from "../test-utils/rule-tester.ts";
import { noUselessUndefinedInitialization } from "./no-useless-undefined-initialization.ts";

ruleTester.run(
  "no-useless-undefined-initialization",
  noUselessUndefinedInitialization,
  {
    invalid: [
      {
        code: "let x = undefined;",
        errors: 1,
        name: "let を undefined で初期化すると報告する",
      },
      {
        code: "var a = 1, b = undefined;",
        errors: 1,
        name: "宣言子ごとに報告する",
      },
    ],
    valid: [
      { code: "const x = undefined;", name: "const は対象外" },
      { code: "export let x = undefined;", name: "export する宣言は対象外" },
      { code: "let x;", name: "初期化しなければ許可する" },
    ],
  },
);
