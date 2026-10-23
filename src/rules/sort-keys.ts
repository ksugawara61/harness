import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import { sortFix } from "../utils/sorted-chunks.ts";

const keyName = (property: Node): string | undefined => {
  if (property.type !== "Property" || property.computed) return undefined;
  const { key } = property;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return undefined;
};

// Biome の assist/source/useSortedKeys（sortOrder: natural）の置き換え。
// オブジェクトリテラルのキーを natural order に並べる。spread と計算キーの前後では並べ替えない
export const sortKeys = defineRule({
  create: (context) => ({
    ObjectExpression: (node) => {
      const fix = sortFix(
        context,
        node.properties.map((property) => ({
          name: keyName(property),
          node: property,
        })),
      );
      if (fix) {
        context.report({
          fix,
          message: "オブジェクトのキーが natural order に並んでいません。",
          node,
        });
      }
    },
  }),
  meta: { fixable: "code" },
});
