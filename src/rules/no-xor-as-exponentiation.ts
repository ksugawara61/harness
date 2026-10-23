import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";

/** 区切りの _ を含みうる 10 進の整数リテラル（2・10・1_000 など）か */
const isDecimalInteger = (node: Node) =>
  node.type === "Literal" &&
  typeof node.value === "number" &&
  /^(0|[1-9][0-9_]*)$/.test(node.raw ?? "");

// Biome の nursery/noXorAsExponentiation の置き換え。
// `2 ^ 10` のように 10 進の整数リテラル同士の ^（XOR）を禁止する（累乗は **）
export const noXorAsExponentiation = defineRule({
  create: (context) => ({
    BinaryExpression: (node) => {
      if (node.operator !== "^") return;
      if (isDecimalInteger(node.left) && isDecimalInteger(node.right)) {
        context.report({
          message:
            "This bitwise XOR operator ^ is used between two integer literals. Use ** for exponentiation.",
          node,
        });
      }
    },
  }),
});
