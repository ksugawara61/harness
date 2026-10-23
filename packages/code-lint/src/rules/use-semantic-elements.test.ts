import { ruleTester } from "../test-utils/rule-tester.ts";
import { useSemanticElements } from "./use-semantic-elements.ts";

ruleTester.run("use-semantic-elements", useSemanticElements, {
  invalid: [
    {
      code: 'const x = <div role="button" />;',
      errors: 1,
      name: "button ロールの div は報告する",
    },
    {
      code: 'const x = <div role="navigation" />;',
      errors: 1,
      name: "navigation ロールの div も報告する",
    },
  ],
  valid: [
    {
      code: 'const x = <View role="dialog" />;',
      name: "大文字始まりのコンポーネントは対象外",
    },
    {
      code: 'const x = <my-el role="button" />;',
      name: "カスタム要素は対象外",
    },
    { code: 'const x = <div role="img" />;', name: "img ロールは対象外" },
    {
      code: 'const x = <button role="button" />;',
      name: "ロールに合う要素なら許可する",
    },
  ],
});
