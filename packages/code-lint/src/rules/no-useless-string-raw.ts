import { defineRule } from "@oxlint/plugins";
import { isIdentifier } from "../utils/ast.ts";

// Biome の complexity/noUselessStringRaw の置き換え。
// エスケープ（\\）を含まない String.raw`...` を禁止する
export const noUselessStringRaw = defineRule({
  create: (context) => ({
    TaggedTemplateExpression: (node) => {
      const { tag } = node;
      if (tag.type !== "MemberExpression" || tag.computed) return;
      if (
        !isIdentifier(tag.object, "String") ||
        !isIdentifier(tag.property, "raw")
      ) {
        return;
      }
      const hasEscape = node.quasi.quasis.some((quasi) =>
        quasi.value.raw.includes("\\"),
      );
      if (!hasEscape) {
        context.report({
          message:
            "String.raw is useless when the raw string doesn't contain any escape sequence.",
          node,
        });
      }
    },
  }),
});
