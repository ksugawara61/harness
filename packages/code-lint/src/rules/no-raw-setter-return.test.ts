import { ruleTester } from "../test-utils/rule-tester.ts";
import { noRawSetterReturn } from "./no-raw-setter-return.ts";

const inUseService = (body: string) => `const useService = () => { ${body} };`;

ruleTester.run("no-raw-setter-return", noRawSetterReturn, {
  invalid: [
    {
      code: inUseService("return { setX };"),
      errors: 1,
      name: "setter をそのまま返すと報告する",
    },
    {
      code: inUseService("return { handleX: () => setX(1) };"),
      errors: 1,
      name: "返り値の中で setter を呼ぶ関数も報告する",
    },
    {
      code: inUseService("return { setX: handle, setY };"),
      errors: 1,
      name: "return ごとに最初の 1 件だけ報告する",
    },
    {
      code: inUseService("return { settings };"),
      errors: 1,
      name: "set で始まる識別子はすべて対象にする",
    },
    {
      code: inUseService("const f = () => { return { setX }; }; return {};"),
      errors: 1,
      name: "useService 内のネストした関数の return も対象にする",
    },
    {
      code: "function useService(p) { return { setX }; }",
      errors: 1,
      name: "function 宣言の useService も対象にする",
    },
  ],
  valid: [
    {
      code: inUseService("return { handleSetX };"),
      name: "handle で包んだ関数は許可する",
    },
    {
      code: "const useService = () => ({ setX });",
      name: "式本体で返すオブジェクトは対象外",
    },
    {
      code: "const useOther = () => { return { setX }; };",
      name: "useService の外は対象外",
    },
  ],
});
