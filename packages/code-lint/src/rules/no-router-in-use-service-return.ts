import { defineRule } from "@oxlint/plugins";
import { descendants, isCallTo, isIdentifier } from "../utils/ast.ts";
import {
  enclosingUseService,
  singleConstDeclarator,
} from "../utils/function-scope.ts";

type Options = {
  /** ナビゲーションの値を返すフックの名前。既定は `useRouter`（expo-router・Next.js・TanStack Router など） */
  hooks?: string[];
};

const DEFAULT_HOOKS = ["useRouter"];

// ルーティングのライブラリのナビゲーションの値を useService の return に含めることを禁止する。
// useService の中のどこかの return 文（ネストした関数の return を含む）が
// hooks に挙げたフックの戻り値を受けた変数（分割代入した名前を含む）を参照していれば報告する
export const noRouterInUseServiceReturn = defineRule({
  create: (context) => {
    const [options] = context.options as [Options?];
    const hooks = options?.hooks ?? DEFAULT_HOOKS;
    return {
      VariableDeclaration: (node) => {
        const declarator = singleConstDeclarator(node);
        const init = declarator?.init;
        if (!declarator || init?.type !== "CallExpression") return;
        const hook = hooks.find((name) => isCallTo(init, name));
        if (hook === undefined) return;
        const useService = enclosingUseService(node);
        if (!useService) return;
        const names = new Set(
          descendants(declarator.id)
            .filter((child) => isIdentifier(child))
            .map((identifier) => identifier.name),
        );
        const returnsRouter = descendants(useService).some(
          (child) =>
            child.type === "ReturnStatement" &&
            child.argument !== null &&
            descendants(child.argument).some(
              (inner) => isIdentifier(inner) && names.has(inner.name),
            ),
        );
        if (returnsRouter) {
          const routerVar = context.sourceCode.getText(declarator.id);
          context.report({
            message: `'${routerVar}' は ${hook}() の値です。useService の return に含めず、useService 内でナビゲーションを完結させてください。`,
            node,
          });
        }
      },
    };
  },
  meta: {
    schema: [
      {
        additionalProperties: false,
        properties: { hooks: { items: { type: "string" }, type: "array" } },
        type: "object",
      },
    ],
  },
});
