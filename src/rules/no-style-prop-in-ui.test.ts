import { ruleTester } from "../test-utils/rule-tester.ts";
import { noStylePropInUi } from "./no-style-prop-in-ui.ts";

ruleTester.run("no-style-prop-in-ui", noStylePropInUi, {
  invalid: [
    {
      code: "type Props = { style: S };",
      errors: 1,
      name: "Props の style は報告する",
    },
    {
      code: "interface P { style?: S }",
      errors: 1,
      name: "interface の style も報告する",
    },
    {
      code: "type Props = { a: { style: S } };",
      errors: 2,
      name: "ネストした型の style は内側と外側のプロパティをそれぞれ報告する",
    },
    {
      code: "type Props = { a: typeof style };",
      errors: 1,
      name: "型の中で style を参照するプロパティも報告する",
    },
  ],
  valid: [
    {
      code: "type Props = { containerStyle: S };",
      name: "style を含むだけの別名は対象外",
    },
    {
      code: "type Props = { a: StyleProp<ViewStyle> };",
      name: "style という識別子が無ければ対象外",
    },
  ],
});
