import { defineRule, type ESTree } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";

const LOOPS = new Set([
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "WhileStatement",
]);

/** child が parent の中で最後に実行される位置にあるか（ブロックの最後の文・if の分岐） */
const isLastIn = (parent: Node, child: Node): boolean => {
  if (parent.type === "BlockStatement") return parent.body.at(-1) === child;
  if (parent.type === "IfStatement") return parent.test !== child;
  return LOOPS.has(parent.type) && (parent as { body: Node }).body === child;
};

/** ループの本体の最後にある continue なら、そのループを返す */
const loopEndedBy = (node: ESTree.ContinueStatement): Node | undefined => {
  let child: Node = node;
  for (let parent = node.parent as Node; ; parent = parent.parent as Node) {
    if (!isLastIn(parent, child)) return undefined;
    if (LOOPS.has(parent.type)) return parent;
    child = parent;
  }
};

// Biome の complexity/noUselessContinue の置き換え。
// ループの本体の最後で実行される continue を禁止する（ラベル付きは同じループを指すときだけ）
export const noUselessContinue = defineRule({
  create: (context) => ({
    ContinueStatement: (node) => {
      const loop = loopEndedBy(node);
      if (!loop) return;
      const { parent } = loop as Node & { parent: Node };
      const loopLabel =
        parent.type === "LabeledStatement" ? parent.label.name : undefined;
      if (node.label && node.label.name !== loopLabel) return;
      context.report({ message: "Unnecessary continue statement.", node });
    },
  }),
});
