import { ruleTester } from "../test-utils/rule-tester.ts";
import { noSuspiciousSemicolonInJsx } from "./no-suspicious-semicolon-in-jsx.ts";

ruleTester.run("no-suspicious-semicolon-in-jsx", noSuspiciousSemicolonInJsx, {
  invalid: [
    {
      code: "const x = <div>{value};\n</div>;",
      errors: 1,
      name: "子の先頭のセミコロンは報告する",
    },
  ],
  valid: [
    {
      code: "const x = <div>{value}</div>;",
      name: "セミコロンが無ければ許可する",
    },
    {
      code: "const x = <div>a; b</div>;",
      name: "改行の続かないセミコロンは許可する",
    },
  ],
});
