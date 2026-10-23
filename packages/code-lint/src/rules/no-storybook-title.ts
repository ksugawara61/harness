import { defineRule, type ESTree } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";

/** `const meta = { ... }` のオブジェクトを返す。`{ ... } satisfies Meta` は変数に型注釈が無いときだけ */
const metaObject = (node: ESTree.VariableDeclarator): Node | undefined => {
  const { id, init, parent } = node;
  const isConst =
    parent.type === "VariableDeclaration" && parent.kind === "const";
  if (!isConst || !isIdentifier(id, "meta")) {
    return undefined;
  }
  if (init?.type === "TSSatisfiesExpression" && !id.typeAnnotation) {
    return init.expression;
  }
  return init ?? undefined;
};

const hasTitle = (object: Node) =>
  object.type === "ObjectExpression" &&
  object.properties.some(
    (property) =>
      property.type === "Property" &&
      !property.computed &&
      !property.shorthand &&
      isIdentifier(property.key, "title"),
  );

// Storybook の meta に title を定義することを禁止する（autoTitle を使う）
export const noStorybookTitle = defineRule({
  create: (context) => ({
    VariableDeclarator: (node) => {
      const object = metaObject(node);
      if (object && hasTitle(object)) {
        context.report({
          message:
            "title is not allowed in Storybook meta. Remove it to use autoTitle instead.",
          node: node.parent,
        });
      }
    },
  }),
});
