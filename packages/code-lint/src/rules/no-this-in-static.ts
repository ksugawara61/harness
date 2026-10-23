import { defineRule } from "@oxlint/plugins";
import { ancestors, type Node } from "../utils/ast.ts";

/** アロー関数以外で最も近い関数（またはクラスの静的ブロック・プロパティ）が static か */
const isInStaticContext = (node: Node): boolean => {
  const boundary = ancestors(node).find(
    (ancestor) =>
      ancestor.type === "FunctionExpression" ||
      ancestor.type === "FunctionDeclaration" ||
      ancestor.type === "StaticBlock" ||
      ancestor.type === "PropertyDefinition",
  );
  if (!boundary) return false;
  if (boundary.type === "StaticBlock") return true;
  if (boundary.type === "PropertyDefinition") return boundary.static;
  const { parent } = boundary;
  return parent?.type === "MethodDefinition" && parent.static;
};

// Biome の complexity/noThisInStatic の置き換え。
// static なメソッド・アクセサ・プロパティ・静的ブロックの中の this / super を禁止する（`new this()` は除く）
export const noThisInStatic = defineRule({
  create: (context) => {
    const check = (node: Node) => {
      const { parent } = node as Node & { parent: Node };
      if (parent.type === "NewExpression" && parent.callee === node) return;
      if (isInStaticContext(node)) {
        context.report({
          message: `Using ${node.type === "Super" ? "super" : "this"} in a static context can be confusing.`,
          node,
        });
      }
    };
    return { Super: check, ThisExpression: check };
  },
});
