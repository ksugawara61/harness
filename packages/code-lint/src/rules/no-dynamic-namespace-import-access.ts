import { defineRule } from "@oxlint/plugins";

// Biome の performance/noDynamicNamespaceImportAccess の置き換え。
// `import * as ns` した名前空間に `ns[key]` で動的にアクセスすることを禁止する（型だけの import は除く）
export const noDynamicNamespaceImportAccess = defineRule({
  create: (context) => ({
    ImportNamespaceSpecifier: (node) => {
      if (
        node.parent.type === "ImportDeclaration" &&
        node.parent.importKind === "type"
      ) {
        return;
      }
      const [variable] = context.sourceCode.getDeclaredVariables(node);
      for (const reference of variable?.references ?? []) {
        const { identifier } = reference;
        const { parent } = identifier as typeof identifier & {
          parent: { type: string; computed?: boolean; object?: unknown };
        };
        if (
          parent.type === "MemberExpression" &&
          parent.computed &&
          parent.object === identifier
        ) {
          context.report({
            message:
              "Avoid accessing namespace imports dynamically, it can prevent efficient tree shaking.",
            node: parent as never,
          });
        }
      }
    },
  }),
});
