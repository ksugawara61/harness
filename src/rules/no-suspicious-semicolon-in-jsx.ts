import { defineRule } from "@oxlint/plugins";

// Biome の suspicious/noSuspiciousSemicolonInJsx の置き換え。
// JSX の子の先頭に紛れ込んだセミコロン（`{value};` の後で改行している）を禁止する
export const noSuspiciousSemicolonInJsx = defineRule({
  create: (context) => ({
    JSXText: (node) => {
      if (/^;\r?\n|^;\r/.test(node.value)) {
        context.report({
          message: "There is a suspicious semicolon in the JSX element.",
          node,
        });
      }
    },
  }),
});
