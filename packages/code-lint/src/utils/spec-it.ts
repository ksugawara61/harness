import type { ESTree } from "@oxlint/plugins";
import { isIdentifier, type Node, propertyValue } from "./ast.ts";

export type Phase = "given" | "when" | "yields";

/**
 * `specIt(spec, key, { given, when, yields })` から、指定したフェーズの `run` の値を取り出す。
 * 引数がちょうど 3 つで、3 つ目がオブジェクトリテラルの呼び出しだけを対象にする。
 * yields は `{ desc, run }` と `[{ desc, run }, ...]` の両方を扱う
 */
export const phaseRuns = (
  call: ESTree.CallExpression,
  phase: Phase,
): Node[] => {
  if (!isIdentifier(call.callee, "specIt") || call.arguments.length !== 3) {
    return [];
  }
  const [, , options] = call.arguments;
  if (!options) return [];
  const value = propertyValue(options, phase);
  if (!value) return [];
  const phaseObjects =
    phase === "yields" && value.type === "ArrayExpression"
      ? value.elements.filter(
          (element): element is ESTree.ObjectExpression =>
            element?.type === "ObjectExpression",
        )
      : [value];
  return phaseObjects
    .map((object) => propertyValue(object, "run"))
    .filter((run): run is Node => run !== undefined);
};
