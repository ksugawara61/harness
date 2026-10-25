import { ruleTester } from "../test-utils/rule-tester.ts";
import { noRouterInUseServiceReturn } from "./no-router-in-use-service-return.ts";

const inUseService = (body: string) => `const useService = () => { ${body} };`;

ruleTester.run("no-router-in-use-service-return", noRouterInUseServiceReturn, {
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
    {
      code: inUseService(
        'const navigate = useNavigate({ from: "/" }); return { navigate };',
      ),
      errors: [
        {
          message:
            "'navigate' は useNavigate() の値です。useService の return に含めず、useService 内でナビゲーションを完結させてください。",
        },
      ],
      name: "hooks に挙げたフックの値を返すと、フックの名前を添えて報告する",
      options: [{ hooks: ["useRouter", "useNavigate"] }],
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
    {
      code: inUseService(
        "const navigate = useNavigate(); return { navigate };",
      ),
      name: "既定では useRouter だけを対象にする",
    },
  ],
});
