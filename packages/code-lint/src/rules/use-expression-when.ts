import { defineRule } from "@oxlint/plugins";
import { isPlainBlockFunction } from "../utils/ast.ts";
import { phaseRuns } from "../utils/spec-it.ts";

// specIt の when フェーズの run はブロック本体を書けない（操作 1 つの式本体のみ）
export const useExpressionWhen = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      for (const run of phaseRuns(node, "when").filter(isPlainBlockFunction)) {
        context.report({
          message:
            "when にブロック本体を書くことは禁止されています。when は操作 1 つの式本体にし、await が必要な場合は run: async () => user.click(...) のように書いてください。",
          node: run,
        });
      }
    },
  }),
});
