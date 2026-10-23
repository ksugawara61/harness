import { defineRule, type ESTree } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";

/** 引数を 1 つだけ受け取り、その引数をそのまま返す関数なら true */
const isIdentityFunction = (fn: Node): boolean => {
  if (
    fn.type !== "ArrowFunctionExpression" &&
    fn.type !== "FunctionExpression"
  ) {
    return false;
  }
  const [param, ...rest] = fn.params;
  if (rest.length > 0 || !param || !isIdentifier(param)) return false;
  const { body } = fn;
  if (body?.type !== "BlockStatement") return isIdentifier(body, param.name);
  const [first] = body.body;
  return (
    first?.type === "ReturnStatement" &&
    isIdentifier(first.argument, param.name)
  );
};

// Biome の complexity/noFlatMapIdentity の置き換え。
// `xs.flatMap((x) => x)` のように恒等関数を渡した flatMap を禁止する（flat() を使う）
export const noFlatMapIdentity = defineRule({
  create: (context) => ({
    CallExpression: (node: ESTree.CallExpression) => {
      const { callee } = node;
      if (callee.type !== "MemberExpression" || callee.computed) return;
      if (!isIdentifier(callee.property, "flatMap")) return;
      const [callback] = node.arguments;
      if (callback && isIdentityFunction(callback)) {
        context.report({
          message:
            "Avoid unnecessary callback in flatMap call. Use flat() instead.",
          node,
        });
      }
    },
  }),
});
