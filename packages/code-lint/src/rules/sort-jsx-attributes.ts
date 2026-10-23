import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import { sortFix } from "../utils/sorted-chunks.ts";

const attributeName = (attribute: Node): string | undefined => {
  if (attribute.type !== "JSXAttribute") return undefined;
  const { name } = attribute;
  return name.type === "JSXNamespacedName"
    ? `${name.namespace.name}:${name.name.name}`
    : name.name;
};

// Biome の assist/source/useSortedAttributes（sortOrder: natural）の置き換え。
// JSX の属性を natural order に並べる。spread 属性の前後では並べ替えない
export const sortJsxAttributes = defineRule({
  create: (context) => ({
    JSXOpeningElement: (node) => {
      const fix = sortFix(
        context,
        node.attributes.map((attribute) => ({
          name: attributeName(attribute),
          node: attribute,
        })),
      );
      if (fix) {
        context.report({
          fix,
          message: "JSX の属性が natural order に並んでいません。",
          node,
        });
      }
    },
  }),
  meta: { fixable: "code" },
});
