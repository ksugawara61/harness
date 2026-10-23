import { defineRule, type ESTree } from "@oxlint/plugins";

/** 静的な文字列の属性値を返す */
const staticAttribute = (element: ESTree.JSXOpeningElement, name: string) => {
  const attribute = element.attributes.find(
    (item) =>
      item.type === "JSXAttribute" &&
      item.name.type === "JSXIdentifier" &&
      item.name.name === name,
  );
  if (attribute?.type !== "JSXAttribute") return undefined;
  if (!attribute.value) return "";
  return attribute.value.type === "Literal"
    ? String(attribute.value.value)
    : null;
};

const hasTitleChild = (element: ESTree.JSXElement) =>
  element.children.some(
    (child) =>
      child.type === "JSXElement" &&
      child.openingElement.name.type === "JSXIdentifier" &&
      child.openingElement.name.name === "title",
  );

/** 名前（タイトル）が必要な画像のロールか。ロール未指定の svg は img とみなす */
const needsName = (role: string | null | undefined) =>
  role === undefined ||
  role === null ||
  /^(img|image|graphics-document|graphics-symbol)$/.test(role);

/** 名前の要らない svg（aria-hidden・title あり・装飾のロール・aria-label あり）か */
const hasAccessibleName = (node: ESTree.JSXElement) => {
  const opening = node.openingElement;
  if (staticAttribute(opening, "aria-hidden") === "true") return true;
  if (hasTitleChild(node) || !needsName(staticAttribute(opening, "role"))) {
    return true;
  }
  return (
    staticAttribute(opening, "aria-label") !== undefined ||
    staticAttribute(opening, "aria-labelledby") !== undefined
  );
};

// Biome の a11y/noSvgWithoutTitle の置き換え。
// <svg> に <title>・aria-label・aria-labelledby のいずれも無いことを禁止する（aria-hidden="true" は除く）
export const noSvgWithoutTitle = defineRule({
  create: (context) => ({
    JSXElement: (node) => {
      const opening = node.openingElement;
      if (opening.name.type !== "JSXIdentifier" || opening.name.name !== "svg")
        return;
      if (!hasAccessibleName(node)) {
        context.report({
          message:
            "Alternative text title element cannot be empty. Add a <title> or aria-label to the svg.",
          node: opening,
        });
      }
    },
  }),
});
