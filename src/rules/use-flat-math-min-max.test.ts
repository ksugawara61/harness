import { ruleTester } from "../test-utils/rule-tester.ts";
import { useFlatMathMinMax } from "./use-flat-math-min-max.ts";

ruleTester.run("use-flat-math-min-max", useFlatMathMinMax, {
  invalid: [
    {
      code: "Math.min(a, Math.min(b, c));",
      errors: 1,
      name: "入れ子の Math.min は外側を 1 件報告する",
    },
    {
      code: "Math.max(Math.max(a, b), Math.max(c, Math.max(d, e)));",
      errors: 1,
      name: "深い入れ子でも外側の 1 件だけ報告する",
    },
  ],
  valid: [
    {
      code: "Math.min(a, Math.max(b, c));",
      name: "別のメソッドの入れ子は許可する",
    },
    { code: "Math.min(a, b, c);", name: "入れ子でなければ許可する" },
  ],
});
