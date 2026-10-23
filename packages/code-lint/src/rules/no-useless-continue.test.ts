import { ruleTester } from "../test-utils/rule-tester.ts";
import { noUselessContinue } from "./no-useless-continue.ts";

ruleTester.run("no-useless-continue", noUselessContinue, {
  invalid: [
    {
      code: "for (const x of xs) { f(x); continue; }",
      errors: 1,
      name: "ループ本体の最後の continue は報告する",
    },
    {
      code: "for (const x of xs) { if (x) { f(); continue; } }",
      errors: 1,
      name: "最後の if の中の continue も報告する",
    },
    {
      code: "a: for (const x of xs) { continue a; }",
      errors: 1,
      name: "同じループを指すラベル付きの continue も報告する",
    },
  ],
  valid: [
    {
      code: "for (const x of xs) { if (x) continue; f(x); }",
      name: "後に文が続く continue は許可する",
    },
    {
      code: "a: for (const x of xs) { for (const y of ys) { continue a; } }",
      name: "外側のループを指す continue は許可する",
    },
  ],
});
