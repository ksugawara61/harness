import { defineRule } from "@oxlint/plugins";
import { descendants, isCallTo, isIdentifier } from "../utils/ast.ts";
import {
  enclosingUseService,
  singleConstDeclarator,
} from "../utils/function-scope.ts";

// useRouter() の値を useService の return に含めることを禁止する。
// useService の中のどこかの return 文（ネストした関数の return を含む）が
// useRouter() を受けた変数（分割代入した名前を含む）を参照していれば報告する
export const noExpoRouterInUseServiceReturn = defineRule({
  create: (context) => ({
    VariableDeclaration: (node) => {
      const declarator = singleConstDeclarator(node);
      const init = declarator?.init;
      if (!declarator || init?.type !== "CallExpression") return;
      if (!isCallTo(init, "useRouter") || init.arguments.length > 0) return;
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
          message: `'${routerVar}' は useRouter() の値です。useService の return に含めず、useService 内でナビゲーションを完結させてください。`,
          node,
        });
      }
    },
  }),
});
