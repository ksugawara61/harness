import { ruleTester } from "../test-utils/rule-tester.ts";
import { noVoidTypeReturn } from "./no-void-type-return.ts";

ruleTester.run("no-void-type-return", noVoidTypeReturn, {
  invalid: [
    {
      code: "function f(): void { return 1; }",
      errors: 1,
      name: "void の関数で値を返すと報告する",
    },
    {
      code: "const f = (): void => { return g(); };",
      errors: 1,
      name: "アロー関数も報告する",
    },
  ],
  valid: [
    {
      code: "function f(): void { return; }",
      name: "値の無い return は許可する",
    },
    {
      code: "function f(): void { return void g(); }",
      name: "return void は許可する",
    },
    {
      code: "function f(): number { return 1; }",
      name: "void 以外の関数は対象外",
    },
  ],
});
