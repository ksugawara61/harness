import { defineRule } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";

/** `Math.min(...)` / `Math.max(...)` なら min / max を返す */
const mathMethod = (node: Node): string | undefined => {
  if (node.type !== "CallExpression") return undefined;
  const { callee } = node;
  if (callee.type !== "MemberExpression" || callee.computed) return undefined;
  if (!isIdentifier(callee.object, "Math")) return undefined;
  const { property } = callee;
  return isIdentifier(property, /^(min|max)$/) && property.type === "Identifier"
    ? property.name
    : undefined;
};

// Biome の nursery/useFlatMathMinMax の置き換え。
// `Math.min(a, Math.min(b, c))` のように同じメソッドを入れ子にした呼び出しを禁止する。
// 入れ子の一番外側の呼び出しだけを報告する
export const useFlatMathMinMax = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      const method = mathMethod(node);
      if (!method) return;
      const { parent } = node;
      const isNested = mathMethod(parent) === method;
      const hasNested = node.arguments.some(
        (arg) => mathMethod(arg) === method,
      );
      if (!isNested && hasNested) {
        context.report({
          message: `Nested Math.${method}() calls can be flattened into a single call.`,
          node,
        });
      }
    },
  }),
});
