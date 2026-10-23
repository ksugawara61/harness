import { ruleTester } from "../test-utils/rule-tester.ts";
import { noRawVitestTest } from "./no-raw-vitest-test.ts";

ruleTester.run("no-raw-vitest-test", noRawVitestTest, {
  invalid: [
    { code: "it('a', () => {});", errors: 1, name: "it の呼び出しは報告する" },
    {
      code: "test('a', () => {});",
      errors: 1,
      name: "test の呼び出しは報告する",
    },
    {
      code: "import { it } from 'vitest';",
      errors: 1,
      name: "it の import も報告する",
    },
    {
      code: "/x/.test(s);",
      errors: 1,
      name: "メソッド名の test も識別子なので報告する",
    },
    {
      code: "const f = (it) => it;",
      errors: 2,
      name: "it という名前の引数と参照をそれぞれ報告する",
    },
  ],
  valid: [
    { code: "specIt(spec, 'a', {});", name: "specIt は許可する" },
    {
      code: "describe.each([])('x', () => {});",
      name: "describe は許可する",
    },
  ],
});
