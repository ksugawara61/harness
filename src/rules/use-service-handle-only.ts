import { defineRule } from "@oxlint/plugins";
import { isIdentifier, isPlainBlockFunction } from "../utils/ast.ts";
import {
  enclosingUseService,
  singleConstDeclarator,
} from "../utils/function-scope.ts";

/**
 * `const name = () => { ... }` の形で関数を代入した宣言なら、その name を返す。
 * 変数に型注釈がある宣言（const f: Fn = ...）と useCallback などで包んだ関数は対象外
 */
const functionVariableName = (
  declarator: ReturnType<typeof singleConstDeclarator>,
): string | undefined => {
  if (!declarator?.init || !isPlainBlockFunction(declarator.init)) {
    return undefined;
  }
  const { id } = declarator;
  return isIdentifier(id) && !id.typeAnnotation ? id.name : undefined;
};

// useService 内の関数変数（ブロック本体の関数を代入した const）は handle プレフィックス必須
export const useServiceHandleOnly = defineRule({
  create: (context) => ({
    VariableDeclaration: (node) => {
      const name = functionVariableName(singleConstDeclarator(node));
      if (!name || name.startsWith("handle") || name === "useService") return;
      if (!enclosingUseService(node)) return;
      context.report({
        message: `'${name}' は関数ですが 'handle' で始まっていません。useService 内の関数変数は handleXxx の形式にしてください。`,
        node,
      });
    },
  }),
});
