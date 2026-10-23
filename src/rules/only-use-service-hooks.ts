import { defineRule } from "@oxlint/plugins";
import { isCallTo } from "../utils/ast.ts";
import { isWithinComponent } from "../utils/function-scope.ts";

// JSX コンポーネント内での use* フック呼び出し（useService 以外）を禁止する
export const onlyUseServiceHooks = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      if (!isCallTo(node, /^use[A-Z]/) || isCallTo(node, "useService")) return;
      if (node.callee.type !== "Identifier" || !isWithinComponent(node)) return;
      context.report({
        message: `In JSX components, '${node.callee.name}' cannot be called directly. Extract all hook logic into a co-located useService() and call it once.`,
        node,
      });
    },
  }),
});
