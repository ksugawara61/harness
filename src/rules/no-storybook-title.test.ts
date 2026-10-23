import { ruleTester } from "../test-utils/rule-tester.ts";
import { noStorybookTitle } from "./no-storybook-title.ts";

ruleTester.run("no-storybook-title", noStorybookTitle, {
  invalid: [
    {
      code: "const meta = { title: 'a', component: A };",
      errors: 1,
      name: "meta の title は報告する",
    },
    {
      code: "const meta = { title: 'a' } satisfies Meta<typeof A>;",
      errors: 1,
      name: "satisfies を付けた meta の title も報告する",
    },
    {
      code: "const meta: Meta = { title: 'a' };",
      errors: 1,
      name: "型注釈を付けた meta の title も報告する",
    },
  ],
  valid: [
    {
      code: "const meta = { component: A, parameters: { title: 'x' } };",
      name: "ネストしたオブジェクトの title は対象外",
    },
    {
      code: "export default { title: 'a' };",
      name: "meta 以外の変数は対象外",
    },
    {
      code: "const meta = { 'title': 'a' };",
      name: "文字列キーの title は対象外",
    },
    {
      code: "const meta = { title };",
      name: "省略記法の title は対象外",
    },
  ],
});
