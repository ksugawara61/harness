import { ruleTester } from "../test-utils/rule-tester.ts";
import { noFlatMapIdentity } from "./no-flat-map-identity.ts";

ruleTester.run("no-flat-map-identity", noFlatMapIdentity, {
  invalid: [
    {
      code: "xs.flatMap((x) => x);",
      errors: 1,
      name: "恒等関数のアロー関数は報告する",
    },
    {
      code: "xs.flatMap((x) => { return x; });",
      errors: 1,
      name: "return するだけのブロック本体も報告する",
    },
    {
      code: "xs.flatMap(function (x) { return x; });",
      errors: 1,
      name: "function 式も報告する",
    },
  ],
  valid: [
    { code: "xs.flatMap((x) => [x, x]);", name: "変換する関数は許可する" },
    { code: "xs.flatMap((x, i) => x);", name: "引数が 2 つなら対象外" },
  ],
});
