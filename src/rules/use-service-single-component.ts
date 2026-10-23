import { defineRule } from "@oxlint/plugins";
import { isCallTo } from "../utils/ast.ts";

// 同一ファイル内で複数のコンポーネントから useService() を呼び出すことを禁止する。
// ファイル内の 2 つ目以降の useService() 呼び出しをすべて報告する
export const useServiceSingleComponent = defineRule({
  create: (context) => {
    let seen = false;
    return {
      CallExpression: (node) => {
        if (!isCallTo(node, "useService") || node.arguments.length > 0) return;
        if (seen) {
          context.report({
            message:
              "'useService' は同一ファイル内の複数のコンポーネントから呼び出せません。useService は一つのコンポーネントのみから参照してください。",
            node,
          });
        }
        seen = true;
      },
    };
  },
});
