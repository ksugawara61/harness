import { defineRule } from "@oxlint/plugins";
import { descendants, isIdentifier } from "../utils/ast.ts";
import { enclosingUseService } from "../utils/function-scope.ts";

// useService の return で useState の setter を直接返さない。
// `return { ... }` の中に set で始まる識別子（キー・値・ネストした式を含む）があれば、最初の 1 件を報告する
export const noRawSetterReturn = defineRule({
  create: (context) => ({
    ReturnStatement: (node) => {
      if (node.argument?.type !== "ObjectExpression") return;
      if (!enclosingUseService(node)) return;
      const setter = descendants(node.argument).find((child) =>
        isIdentifier(child, /^set/),
      );
      if (setter) {
        context.report({
          message:
            "setter を直接 return しないで handle プレフィックスのラッパを経由してください。",
          node: setter,
        });
      }
    },
  }),
});
