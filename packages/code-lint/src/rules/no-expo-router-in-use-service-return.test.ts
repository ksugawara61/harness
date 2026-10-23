import { ruleTester } from "../test-utils/rule-tester.ts";
import { noExpoRouterInUseServiceReturn } from "./no-expo-router-in-use-service-return.ts";

const inUseService = (body: string) => `const useService = () => { ${body} };`;

ruleTester.run(
  "no-expo-router-in-use-service-return",
  noExpoRouterInUseServiceReturn,
  {
    invalid: [
      {
        code: inUseService("const router = useRouter(); return { router };"),
        errors: 1,
        name: "router をそのまま返すと報告する",
      },
      {
        code: inUseService(
          "const router = useRouter(); return { handle: () => router.back() };",
        ),
        errors: 1,
        name: "返り値の関数の中で router を使っても報告する",
      },
      {
        code: inUseService(
          "const router = useRouter(); const h = () => { return router; }; return {};",
        ),
        errors: 1,
        name: "ネストした関数の return で router を返しても報告する",
      },
      {
        code: inUseService("const { back } = useRouter(); return { back };"),
        errors: 1,
        name: "分割代入した値を返しても報告する",
      },
      {
        code: inUseService("const r = useRouter(); return r;"),
        errors: 1,
        name: "オブジェクト以外の return も対象にする",
      },
    ],
    valid: [
      {
        code: inUseService("const router = useRouter(); return { a: 1 };"),
        name: "router を返さなければ許可する",
      },
      {
        code: "const useOther = () => { const router = useRouter(); return { router }; };",
        name: "useService の外は対象外",
      },
    ],
  },
);
