import { defineRule, type ESTree } from "@oxlint/plugins";
import { roleElements } from "aria-query";

/** Biome がそもそも検査しないロール */
const IGNORED_ROLES = new Set([
  "alert",
  "combobox",
  "img",
  "listbox",
  "option",
  "status",
]);

const staticAttribute = (element: ESTree.JSXOpeningElement, name: string) => {
  const attribute = element.attributes.find(
    (item) =>
      item.type === "JSXAttribute" &&
      item.name.type === "JSXIdentifier" &&
      item.name.name === name,
  );
  if (
    attribute?.type !== "JSXAttribute" ||
    attribute.value?.type !== "Literal"
  ) {
    return undefined;
  }
  return { node: attribute, value: String(attribute.value.value) };
};

/** HTML の要素（コンポーネントやカスタム要素ではない）の名前を返す */
const htmlElementName = (node: ESTree.JSXOpeningElement) => {
  if (node.name.type !== "JSXIdentifier") return undefined;
  const { name } = node.name;
  return /^[A-Z]/.test(name) || name.includes("-") ? undefined : name;
};

/** ロールに対応する要素の一覧。検査しないロールや対応する要素が無いロールは空 */
const elementsForRole = (role: string) =>
  IGNORED_ROLES.has(role) ? [] : [...(roleElements.get(role as never) ?? [])];

// Biome の a11y/useSemanticElements の置き換え（ロールと要素の対応は aria-query を使う）。
// HTML の要素に role を付けるより、そのロールを持つ意味のある要素を使うよう求める。
// 大文字始まりのコンポーネントとカスタム要素（名前に - を含む）は対象外
export const useSemanticElements = defineRule({
  create: (context) => ({
    JSXOpeningElement: (node) => {
      const elementName = htmlElementName(node);
      const role = elementName ? staticAttribute(node, "role") : undefined;
      const elements = role ? elementsForRole(role.value) : [];
      if (!role || elements.length === 0) return;
      const isSemantic = elements.some(
        (element) =>
          element.name === elementName &&
          (element.attributes ?? []).every(
            (required) =>
              staticAttribute(node, required.name)?.value === required.value,
          ),
      );
      if (!isSemantic) {
        const names = [...new Set(elements.map((element) => element.name))];
        context.report({
          message: `The elements with this role can be changed to the following elements: ${names.join(", ")}`,
          node: role.node,
        });
      }
    },
  }),
});
