import { ruleTester } from "../test-utils/rule-tester.ts";
import { useServiceHandleOnly } from "./use-service-handle-only.ts";

const inUseService = (body: string) =>
  `export const useService = (p) => { ${body} return {}; };`;

ruleTester.run("use-service-handle-only", useServiceHandleOnly, {
  invalid: [
    {
      code: inUseService("const f = () => { a(); };"),
      errors: 1,
      name: "handle で始まらない関数変数は報告する",
    },
    {
      code: inUseService("const f = async (a, b) => { a(); };"),
      errors: 1,
      name: "async・引数付きの関数も報告する",
    },
    {
      code: inUseService("const f = function () { a(); };"),
      errors: 1,
      name: "function 式も報告する",
    },
    {
      code: inUseService(
        "const handleA = () => { const g = () => { x(); }; };",
      ),
      errors: 1,
      name: "ネストした関数の中の宣言も報告する",
    },
    {
      code: "function useService() { const f = () => { a(); }; }",
      errors: 1,
      name: "function 宣言の useService も対象にする",
    },
  ],
  valid: [
    {
      code: inUseService("const handleF = () => { a(); };"),
      name: "handle で始まる名前は許可する",
    },
    {
      code: inUseService("const f = () => a();"),
      name: "式本体の関数は対象外",
    },
    {
      code: inUseService("const f = useCallback(() => { a(); }, []);"),
      name: "useCallback で包んだ関数は対象外",
    },
    {
      code: inUseService("let f = () => { a(); };"),
      name: "let は対象外",
    },
    {
      code: inUseService("const f: Fn = () => { a(); };"),
      name: "型注釈付きの宣言は対象外",
    },
    {
      code: inUseService("const f = (): void => { a(); };"),
      name: "戻り値の型注釈がある関数は対象外（移植元の GritQL と同じ）",
    },
    {
      code: "const useService = (): R => { const f = () => { a(); }; return {}; };",
      name: "戻り値の型注釈がある useService は対象外（移植元の GritQL と同じ）",
    },
    {
      code: "const useOther = () => { const f = () => { a(); }; };",
      name: "useService の外は対象外",
    },
  ],
});
