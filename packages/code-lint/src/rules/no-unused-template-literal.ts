import { defineRule } from "@oxlint/plugins";

// Biome の style/noUnusedTemplateLiteral の置き換え。
// 埋め込み式がなく、改行・' ・" も含まないテンプレートリテラルを禁止し、文字列リテラルに直す。
// タグ付きテンプレート（graphql`...` など）は対象外
export const noUnusedTemplateLiteral = defineRule({
  create: (context) => ({
    TemplateLiteral: (node) => {
      if (node.parent.type === "TaggedTemplateExpression") return;
      if (node.expressions.length > 0) return;
      const raw = node.quasis.map((quasi) => quasi.value.raw).join("");
      if (/[\n'"]/.test(raw)) return;
      context.report({
        fix: (fixer) => fixer.replaceText(node, `"${raw}"`),
        message:
          "Do not use template literals if interpolation and special-character handling are not needed.",
        node,
      });
    },
  }),
  meta: { fixable: "code" },
});
