import { defineRule } from "@oxlint/plugins";
import { ancestors, isFunction } from "../utils/ast.ts";

// Biome の correctness/noVoidTypeReturn の置き換え。
// 戻り値の型を void と書いた関数で値を返すことを禁止する（`return void x` は除く）
export const noVoidTypeReturn = defineRule({
  create: (context) => ({
    ReturnStatement: (node) => {
      const { argument } = node;
      if (!argument) return;
      if (argument.type === "UnaryExpression" && argument.operator === "void")
        return;
      const fn = ancestors(node).find(isFunction);
      if (
        fn &&
        "returnType" in fn &&
        fn.returnType?.typeAnnotation.type === "TSVoidKeyword"
      ) {
        context.report({
          message:
            "The function should not return a value because its return type is void.",
          node,
        });
      }
    },
  }),
});
