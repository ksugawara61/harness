import { defineRule } from "@oxlint/plugins";
import { isCallTo } from "../utils/ast.ts";
import {
  isWithinComponent,
  singleConstDeclarator,
} from "../utils/function-scope.ts";

// JSX コンポーネント内での変数宣言を禁止する（const { } = useService() のみ許可）。
// コンポーネント内のネストした関数の中の宣言も対象にし、大文字始まりの名前は除く
export const noHandlerInComponent = defineRule({
  create: (context) => ({
    VariableDeclaration: (node) => {
      const declarator = singleConstDeclarator(node);
      if (!declarator?.init || isCallTo(declarator.init, "useService")) return;
      const name = context.sourceCode.getText(declarator.id);
      if (/^[A-Z]/.test(name) || !isWithinComponent(node)) return;
      context.report({
        message: `In JSX components, '${name}' must be defined inside useService(). Move all logic to the co-located useService hook.`,
        node,
      });
    },
  }),
});
