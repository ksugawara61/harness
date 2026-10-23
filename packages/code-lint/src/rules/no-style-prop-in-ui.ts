import { defineRule } from "@oxlint/plugins";
import { descendants, isIdentifier } from "../utils/ast.ts";

// UI コンポーネントの Props に style を露出させることを禁止する。
// キーだけでなく型の中に `style` という識別子が現れるプロパティも対象にする
export const noStylePropInUi = defineRule({
  create: (context) => ({
    TSPropertySignature: (node) => {
      if (descendants(node).some((child) => isIdentifier(child, "style"))) {
        context.report({
          message:
            "UI コンポーネントの Props に style を露出させることは禁止されています。代わりにセマンティックな layout props を使用してください。",
          node,
        });
      }
    },
  }),
});
