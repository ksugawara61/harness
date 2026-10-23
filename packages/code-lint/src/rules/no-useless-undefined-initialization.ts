import { defineRule } from "@oxlint/plugins";
import { isIdentifier } from "../utils/ast.ts";

// Biome の complexity/noUselessUndefinedInitialization の置き換え。
// let / var を undefined で初期化することを禁止する（export する宣言は除く）
export const noUselessUndefinedInitialization = defineRule({
  create: (context) => ({
    VariableDeclaration: (node) => {
      const isTarget =
        (node.kind === "let" || node.kind === "var") &&
        node.parent.type !== "ExportNamedDeclaration";
      const declarators = isTarget ? node.declarations : [];
      for (const declarator of declarators.filter((item) =>
        isIdentifier(item.init, "undefined"),
      )) {
        context.report({
          message: `It's not necessary to initialize ${context.sourceCode.getText(declarator.id)} to undefined.`,
          node: declarator,
        });
      }
    },
  }),
});
