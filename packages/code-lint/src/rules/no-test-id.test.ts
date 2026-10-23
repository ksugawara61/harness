import { ruleTester } from "../test-utils/rule-tester.ts";
import { noTestId } from "./no-test-id.ts";

ruleTester.run("no-test-id", noTestId, {
  invalid: [
    {
      code: 'export const X = () => <View testID="a" />;',
      errors: 1,
      name: "JSX の testID 属性は報告する",
    },
    {
      code: "const x = <View testID={id}><Text /></View>;",
      errors: 1,
      name: "式を渡した testID 属性も報告する",
    },
  ],
  valid: [
    {
      code: 'const x = <View aria-label="a" />;',
      name: "アクセシビリティ属性は許可する",
    },
    {
      code: "const o = { testID: 1 };",
      name: "JSX 以外の testID は対象外",
    },
  ],
});
