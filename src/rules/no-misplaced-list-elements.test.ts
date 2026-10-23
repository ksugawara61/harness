import { ruleTester } from "../test-utils/rule-tester.ts";
import { noMisplacedListElements } from "./no-misplaced-list-elements.ts";

ruleTester.run("no-misplaced-list-elements", noMisplacedListElements, {
  invalid: [
    {
      code: "const x = <div><li /></div>;",
      errors: 1,
      name: "div の中の li は報告する",
    },
    {
      code: "const x = <section>{items.map((item) => <li>{item}</li>)}</section>;",
      errors: 1,
      name: "コールバックで返す li も描画先の親で判定する",
    },
  ],
  valid: [
    { code: "const x = <ul><li /></ul>;", name: "ul の中の li は許可する" },
    {
      code: "const x = <ol>{cond && <li />}</ol>;",
      name: "論理演算を挟んでも ol の中なら許可する",
    },
    { code: "const x = <li />;", name: "親の無い li は対象外" },
  ],
});
