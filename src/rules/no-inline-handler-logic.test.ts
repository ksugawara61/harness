import { ruleTester } from "../test-utils/rule-tester.ts";
import { noInlineHandlerLogic } from "./no-inline-handler-logic.ts";

ruleTester.run("no-inline-handler-logic", noInlineHandlerLogic, {
  invalid: [
    {
      code: "<A onPress={() => { a(); }} />",
      errors: 1,
      name: "on* にブロック本体のアロー関数を渡すと報告する",
    },
    {
      code: "<A onPress={async () => { a(); }} />",
      errors: 1,
      name: "async のアロー関数も報告する",
    },
    {
      code: "<A onPress={function () { a(); }} />",
      errors: 1,
      name: "function 式も報告する",
    },
    {
      code: "<A onPress={c ? () => { a(); } : b} />",
      errors: 1,
      name: "式の中のブロック本体の関数も報告する",
    },
    {
      code: "<A onPress={() => { const f = () => { b(); }; }} />",
      errors: 1,
      name: "属性ごとに最初の 1 件だけ報告する",
    },
  ],
  valid: [
    {
      code: "<A onPress={() => a()} />",
      name: "式本体のアロー関数は許可する",
    },
    {
      code: "<A renderItem={() => { a(); }} />",
      name: "on で始まらない属性は対象外",
    },
    {
      code: "<A onpress={() => { a(); }} />",
      name: "on の直後が大文字でなければ対象外",
    },
  ],
});
