import { ruleTester } from "../test-utils/rule-tester.ts";
import { noHandlerInComponent } from "./no-handler-in-component.ts";

ruleTester.run("no-handler-in-component", noHandlerInComponent, {
  invalid: [
    {
      code: "const A = () => { const x = 1; return null; };",
      errors: 1,
      name: "コンポーネント内の const 宣言は報告する",
    },
    {
      code: "const A: FC<P> = ({ a }) => { const x = 1 as const; return null; };",
      errors: 1,
      name: "型注釈付き・引数付きのコンポーネントも対象にする",
    },
    {
      code: "export function A() { const x = 1; return null; }",
      errors: 1,
      name: "function 宣言のコンポーネントも対象にする",
    },
    {
      code: "const A = async () => { const x = 1; return null; };",
      errors: 1,
      name: "async のコンポーネントも対象にする",
    },
    {
      code: "const A = () => { const f = () => { const y = 1; }; return null; };",
      errors: 2,
      name: "ネストした関数の中の宣言も報告する",
    },
  ],
  valid: [
    {
      code: "const A = () => { const { a } = useService(); return null; };",
      name: "useService() の分割代入は許可する",
    },
    {
      code: "const A = () => { const s = useService(1, 2); return null; };",
      name: "引数付きの useService() も許可する",
    },
    {
      code: "const A = () => { let x = 1; return null; };",
      name: "let は対象外",
    },
    {
      code: "const A = () => { const x = 1, y = 2; return null; };",
      name: "宣言子が複数の const は対象外",
    },
    {
      code: "const A = () => { const B = 1; return null; };",
      name: "大文字始まりの名前は対象外",
    },
    {
      code: "const A = () => { for (const x of y) {} return null; };",
      name: "for 文の初期化は対象外",
    },
    {
      code: "const a = () => { const x = 1; };",
      name: "小文字始まりの関数はコンポーネントではない",
    },
    {
      code: "const A = function () { const x = 1; return null; };",
      name: "function 式のコンポーネントは対象外",
    },
    {
      code: "const A = (): ReactNode => { const x = 1; return null; };",
      name: "戻り値の型注釈があるコンポーネントは対象外（移植元の GritQL と同じ）",
    },
    {
      code: "export default function A() { const x = 1; return null; }",
      name: "default export の function は対象外",
    },
  ],
});
