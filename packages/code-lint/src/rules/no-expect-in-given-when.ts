import { defineRule } from "@oxlint/plugins";
import { descendants, isCallTo } from "../utils/ast.ts";
import { phaseRuns } from "../utils/spec-it.ts";

const MESSAGES = {
  given:
    "given 内で expect を呼ぶことは禁止されています。given は前提の構築だけを行い、検証は yields に移してください。",
  when: "when 内で expect を呼ぶことは禁止されています。when は操作だけを行い、検証は yields に移してください。",
} as const;

// specIt の given / when フェーズの run 内で expect を呼ぶことを禁止する。
// フェーズごとに最初の expect(...) を 1 件だけ報告する
export const noExpectInGivenWhen = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      for (const phase of ["given", "when"] as const) {
        for (const run of phaseRuns(node, phase)) {
          const expectCall = descendants(run).find((child) =>
            isCallTo(child, "expect"),
          );
          if (expectCall) {
            context.report({ message: MESSAGES[phase], node: expectCall });
          }
        }
      }
    },
  }),
});
