import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import { descendants, isCallTo, isMemberCallTo } from "../utils/ast.ts";
import { phaseRuns } from "../utils/spec-it.ts";

const isEvent = (node: Node) =>
  isCallTo(node, "fireEvent") ||
  isMemberCallTo(node, /^(fireEvent|userEvent|user)$/, /.*/);

// specIt の yields フェーズの run 内での操作（fireEvent / userEvent）を禁止する。
// 呼び出しごとに最初の操作を 1 件だけ報告する（配列の yields も最初に見つかった 1 件だけ）
export const noEventInYields = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      const event = phaseRuns(node, "yields")
        .map((run) => descendants(run).find(isEvent))
        .find((found) => found !== undefined);
      if (event) {
        context.report({
          message:
            "yields 内で操作することは禁止されています。yields は検証だけを行い、操作は when に移してください。",
          node: event,
        });
      }
    },
  }),
});
