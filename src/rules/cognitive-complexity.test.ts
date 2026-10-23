import { ruleTester } from "../test-utils/rule-tester.ts";
import { cognitiveComplexity } from "./cognitive-complexity.ts";

/** 上限 0 で数え、メッセージに出る点数で Cognitive Complexity を確かめる */
const scored = (code: string, score: number, name: string) => ({
  code,
  errors: [{ message: `Excessive complexity of ${score} detected (max: 0).` }],
  name,
  options: [{ maxAllowedComplexity: 0 }],
});

ruleTester.run("cognitive-complexity", cognitiveComplexity, {
  invalid: [
    scored("function f() { if (a) {} }", 1, "if は 1 加点する"),
    scored(
      "function f() { if (a) { if (b) {} } }",
      3,
      "ネストした if はネストの深さを加点する",
    ),
    scored(
      "function f() { if (a) {} else if (b) {} else {} }",
      3,
      "else if と else はそれぞれ 1 加点する",
    ),
    scored(
      "function f() { const v = a && b && c; }",
      1,
      "同じ論理演算子の連なりは 1 とする",
    ),
    scored(
      "function f() { const v = a && b || c; }",
      2,
      "演算子が変わると 1 加点する",
    ),
    scored(
      "function f() { const v = a && (b && c); }",
      2,
      "括弧で区切ると連なりを数え直す",
    ),
    scored(
      "function f() { try {} catch (e) { if (x) {} } }",
      3,
      "catch は 1 加点し、配下のネストを深くする",
    ),
    scored("function f() { try {} finally {} }", 1, "finally は 1 加点する"),
    scored(
      "function f() { outer: for (;;) { break outer; } }",
      2,
      "ラベル付きの break は 1 加点する",
    ),
    scored(
      "function f() { if (a) {} else {} if (b) {} if (c) {} }",
      4,
      "Biome と同じく else を抜けた後はネストが浅くなる",
    ),
    {
      code: "function f() { g(() => { if (a) {} }); }",
      errors: [{ message: "Excessive complexity of 2 detected (max: 0)." }],
      name: "ネストした関数は外側に加点せず、1 段深いネストから数える",
      options: [{ maxAllowedComplexity: 0 }],
    },
  ],
  valid: [
    {
      code: "function f() { if (a) {} if (b) {} }",
      name: "上限以下なら許可する",
      options: [{ maxAllowedComplexity: 2 }],
    },
    {
      code: "function f() { a ||= b; const v = a?.b ?? 1; }",
      name: "論理代入と optional chaining は加点しない（?? は 1）",
      options: [{ maxAllowedComplexity: 1 }],
    },
  ],
});
