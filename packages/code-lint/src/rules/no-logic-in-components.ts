import { defineRule } from "@oxlint/plugins";
import { isIdentifier } from "../utils/ast.ts";

const HOOK_NAME = /^use[A-Z]/;

const MESSAGE =
  "components/ にはフックを持たない、Props だけで描画が決まる部品を置いてください。フックを使うなら features/ のサブフィーチャーにしてください";

// components/ に置く部品にロジックを持たせない。
// フック（useXxx(...)・React.useXxx(...)）の呼び出しを報告する。
// 利用側の overrides で `src/features/**/components/**` などに当てる
export const noLogicInComponents = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      const { callee } = node;
      const name =
        callee.type === "MemberExpression" && !callee.computed
          ? callee.property
          : callee;
      if (!isIdentifier(name, HOOK_NAME)) return;
      context.report({ message: MESSAGE, node });
    },
  }),
});
