import { ruleTester } from "../test-utils/rule-tester.ts";
import { useServiceSingleComponent } from "./use-service-single-component.ts";

ruleTester.run("use-service-single-component", useServiceSingleComponent, {
  invalid: [
    {
      code: "const A = () => { const s = useService(); }; const B = () => { const t = useService(); };",
      errors: 1,
      name: "2 つのコンポーネントから呼ぶと 2 つ目を報告する",
    },
    {
      code: "const A = () => { useService(); useService(); useService(); };",
      errors: 2,
      name: "2 つ目以降の呼び出しをすべて報告する",
    },
  ],
  valid: [
    {
      code: "const A = () => { const s = useService(); };",
      name: "1 回だけなら許可する",
    },
    {
      code: "const A = () => { const s = useService(1); }; const B = () => { const t = useService(); };",
      name: "引数付きの呼び出しは数えない",
    },
  ],
});
