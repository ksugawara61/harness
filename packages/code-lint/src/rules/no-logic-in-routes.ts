import { defineRule } from "@oxlint/plugins";
import { isIdentifier } from "../utils/ast.ts";

type Options = {
  /** ルーティングのファイルで呼んでよいフックの名前（`useLocalSearchParams`・`useParams` など） */
  allowHooks?: string[];
};

const HOOK_NAME = /^use[A-Z]/;

// ルーティングのファイル（expo-router の app/・TanStack Router の routes/ など）にロジックを持たせない。
// allowHooks に挙げたもの（パスのパラメーターの読み取りなど）以外のフック
// （useXxx(...)・Route.useXxx(...)）の呼び出しを報告する。
// ロジックは features のページの service.ts に置き、ルーティングのファイルはページに Props を渡して描画するだけにする。
// 利用側の overrides でルーティングのディレクトリ（`src/app/**` など）に当てる
export const noLogicInRoutes = defineRule({
  create: (context) => {
    const [options] = context.options as [Options?];
    const allowHooks = new Set(options?.allowHooks ?? []);
    return {
      CallExpression: (node) => {
        const { callee } = node;
        const name =
          callee.type === "MemberExpression" && !callee.computed
            ? callee.property
            : callee;
        if (!isIdentifier(name, HOOK_NAME) || allowHooks.has(name.name)) {
          return;
        }
        context.report({
          message: `ルーティングのファイルでは ${name.name} を呼ばず、features のページの service.ts に移してください。ルーティングのファイルは、パスのパラメーターなどをページに Props で渡して描画するだけにします`,
          node,
        });
      },
    };
  },
  meta: {
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowHooks: { items: { type: "string" }, type: "array" },
        },
        type: "object",
      },
    ],
  },
});
