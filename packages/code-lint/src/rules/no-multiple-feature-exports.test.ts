import { ruleTester } from "../test-utils/rule-tester.ts";
import { noMultipleFeatureExports } from "./no-multiple-feature-exports.ts";

ruleTester.run("no-multiple-feature-exports", noMultipleFeatureExports, {
  invalid: [
    {
      code: "export const A = 1; export const B = 2;",
      errors: 1,
      name: "2 つ目の export は報告する",
    },
    {
      code: "export const A = 1; const x = 2; export const B = 2;",
      errors: 1,
      name: "間に別の文があっても 2 つ目の export は報告する",
    },
    {
      code: "export const A = 1; export type B = string;",
      errors: 1,
      name: "型の export も数える",
    },
    {
      code: "export const A = 1; export { x }; export * from './y';",
      errors: 2,
      name: "2 つ目以降の export をすべて報告する",
    },
  ],
  valid: [
    {
      code: "export const A = () => null;",
      name: "export が 1 つなら許可する",
    },
  ],
});
