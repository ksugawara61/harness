import { defineRule } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";

type Case = "lower" | "upper";

/** 引数なしの `s.toLowerCase()` / `s.toUpperCase()` なら、変換後の大文字小文字を返す */
const caseOf = (node: Node): Case | undefined => {
  if (node.type !== "CallExpression" || node.arguments.length > 0)
    return undefined;
  const { callee } = node;
  if (callee.type !== "MemberExpression" || callee.computed) return undefined;
  if (isIdentifier(callee.property, "toLowerCase")) return "lower";
  return isIdentifier(callee.property, "toUpperCase") ? "upper" : undefined;
};

/** 文字列リテラルが変換後の大文字小文字と食い違う（比較が常に false になる）か */
const mismatches = (literal: Node, expected: Case) => {
  if (literal.type !== "Literal" || typeof literal.value !== "string")
    return false;
  const { value } = literal;
  const converted =
    expected === "lower" ? value.toLowerCase() : value.toUpperCase();
  return converted !== value;
};

const MESSAGE =
  "This expression always returns false, because the string is converted and will never match.";

// Biome の correctness/noStringCaseMismatch の置き換え。
// toLowerCase() / toUpperCase() の結果を、大文字小文字の合わない文字列リテラルと比べることを禁止する
export const noStringCaseMismatch = defineRule({
  create: (context) => ({
    BinaryExpression: (node) => {
      if (node.operator !== "==" && node.operator !== "===") return;
      const pairs: [Node, Node][] = [
        [node.left, node.right],
        [node.right, node.left],
      ];
      for (const [call, literal] of pairs) {
        const expected = caseOf(call);
        if (expected && mismatches(literal, expected)) {
          context.report({ message: MESSAGE, node });
          return;
        }
      }
    },
    SwitchStatement: (node) => {
      const expected = caseOf(node.discriminant);
      if (!expected) return;
      for (const switchCase of node.cases) {
        if (switchCase.test && mismatches(switchCase.test, expected)) {
          context.report({ message: MESSAGE, node: switchCase.test });
        }
      }
    },
  }),
});
