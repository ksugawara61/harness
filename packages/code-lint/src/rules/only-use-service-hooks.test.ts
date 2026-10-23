import { ruleTester } from "../test-utils/rule-tester.ts";
import { onlyUseServiceHooks } from "./only-use-service-hooks.ts";

ruleTester.run("only-use-service-hooks", onlyUseServiceHooks, {
  invalid: [
    {
      code: "const A = () => { useState(); return null; };",
      errors: 1,
      name: "コンポーネント内の use* は報告する",
    },
    {
      code: "const A = () => { useEffect(() => {}, []); return null; };",
      errors: 1,
      name: "引数の数によらず報告する",
    },
    {
      code: "function A(p) { useState(1); return null; }",
      errors: 1,
      name: "function 宣言のコンポーネントも対象にする",
    },
    {
      code: "const A = (a, b) => { const x = useMemo(() => 1, [a]); return null; };",
      errors: 1,
      name: "引数が複数のコンポーネントも対象にする",
    },
  ],
  valid: [
    {
      code: "const A = () => { useService(); return null; };",
      name: "useService は許可する",
    },
    {
      code: "const A = () => { foo.useBar(1); return null; };",
      name: "メンバー呼び出しは対象外",
    },
    {
      code: "const A = () => useState(1);",
      name: "式本体のコンポーネントは対象外",
    },
    {
      code: "const a = () => { useState(1); };",
      name: "小文字始まりの関数は対象外",
    },
    {
      code: "export const A = memo(() => { useState(1); return null; });",
      name: "memo で包んだ無名関数は対象外",
    },
  ],
});
