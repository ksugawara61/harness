import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import { descendants, isCallTo } from "../utils/ast.ts";
import { phaseRuns } from "../utils/spec-it.ts";

const isWaiting = (node: Node) =>
  isCallTo(node, "waitFor") ||
  isCallTo(node, /^findBy/) ||
  (node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name.startsWith("findBy"));

// specIt の when フェーズの run 内での待機（waitFor / findBy* クエリ）を禁止する。
// run ごとに最初の待機を 1 件だけ報告する
export const noWaitingInWhen = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      for (const run of phaseRuns(node, "when")) {
        const waiting = descendants(run).find(isWaiting);
        if (waiting) {
          context.report({
            message:
              "when 内で待機することは禁止されています。when は操作だけを行い、待機を伴う検証は yields に移してください。",
            node: waiting,
          });
        }
      }
    },
  }),
});
