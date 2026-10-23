import { ruleTester } from "../test-utils/rule-tester.ts";
import { noImplicitAnyLet } from "./no-implicit-any-let.ts";

ruleTester.run("no-implicit-any-let", noImplicitAnyLet, {
  invalid: [
    { code: "let x;", errors: 1, name: "初期値も型注釈も無い let は報告する" },
    {
      code: "var a = 1, b;",
      errors: 1,
      name: "宣言子のどれかが暗黙の any なら報告する",
    },
  ],
  valid: [
    { code: "let x: number;", name: "型注釈があれば許可する" },
    { code: "let x = 1;", name: "初期値があれば許可する" },
    { code: "for (let x of xs) {}", name: "for の初期化は対象外" },
  ],
});
