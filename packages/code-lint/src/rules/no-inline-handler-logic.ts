import { defineRule } from "@oxlint/plugins";
import { descendants, isPlainBlockFunction } from "../utils/ast.ts";

// JSX の on[A-Z]* props にブロック本体の関数を渡すことを禁止する。
// 属性の値の中で最初に見つかったブロック本体の関数を 1 件だけ報告する
export const noInlineHandlerLogic = defineRule({
  create: (context) => ({
    JSXAttribute: (node) => {
      if (node.name.type !== "JSXIdentifier") return;
      if (!/^on[A-Z]/.test(node.name.name) || !node.value) return;
      const handler = descendants(node.value).find(isPlainBlockFunction);
      if (handler) {
        context.report({
          message:
            "'onXxx' にブロック本体の関数を渡さないでください。ロジックをハンドラー関数に切り出してください。",
          node: handler,
        });
      }
    },
  }),
});
