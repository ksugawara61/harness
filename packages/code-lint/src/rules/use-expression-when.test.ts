import { ruleTester } from "../test-utils/rule-tester.ts";
import { useExpressionWhen } from "./use-expression-when.ts";

const specIt = (phases: string) => `specIt(spec, "key", { ${phases} });`;

ruleTester.run("use-expression-when", useExpressionWhen, {
  invalid: [
    {
      code: specIt("when: { run: () => { a(); } }"),
      errors: 1,
      name: "ブロック本体のアロー関数は報告する",
    },
    {
      code: specIt("when: { run: async (x) => { await a(x); } }"),
      errors: 1,
      name: "async でもブロック本体なら報告する",
    },
    {
      code: specIt("when: { run: async function () { a(); } }"),
      errors: 1,
      name: "function 式も報告する",
    },
  ],
  valid: [
    {
      code: specIt("when: { run: () => a() }"),
      name: "式本体のアロー関数は許可する",
    },
    {
      code: specIt("when: { run: async () => a() }"),
      name: "async の式本体も許可する",
    },
    {
      code: specIt("given: { run: () => { a(); } }"),
      name: "given のブロック本体は対象外",
    },
  ],
});
