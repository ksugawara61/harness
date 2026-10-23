import { defineRule, type ESTree } from "@oxlint/plugins";
import {
  ancestors,
  isFunction,
  isIdentifier,
  type Node,
} from "../utils/ast.ts";

const LIST_CONTAINERS = new Set(["menu", "ol", "ul"]);

/** 描画上の親になる要素までたどる式（条件分岐・論理演算・配列・型アサーションなど） */
const PASS_THROUGH = new Set([
  "ArrayExpression",
  "ArrowFunctionExpression",
  "JSXExpressionContainer",
  "JSXFragment",
  "LogicalExpression",
  "TSAsExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
]);

/** `items.map(cb)`・`items.flatMap(cb)`・`Array.from(items, cb)` のように、コールバックの戻り値を返す呼び出しか */
const returnsCallbackResults = (call: ESTree.CallExpression) => {
  const { callee } = call;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (isIdentifier(callee.property, /^(map|flatMap)$/)) return true;
  return (
    isIdentifier(callee.object, "Array") &&
    isIdentifier(callee.property, "from")
  );
};

/** current を描画する位置として、次にたどるノードを返す。描画されない位置なら undefined */
const nextRendered = (current: Node, parent: Node): Node | undefined => {
  if (PASS_THROUGH.has(parent.type)) return parent;
  if (parent.type === "ConditionalExpression") {
    return parent.test === current ? undefined : parent;
  }
  if (parent.type === "ReturnStatement") {
    // 要素を返す関数が描画される位置からたどり直す
    return ancestors(parent).find(isFunction);
  }
  const isCallback =
    parent.type === "CallExpression" &&
    (current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionExpression") &&
    parent.arguments.includes(current as never);
  return isCallback && returnsCallbackResults(parent) ? parent : undefined;
};

/** `<li>` を描画する親の要素を返す（条件式の判定部分など、描画されない位置なら undefined） */
const renderedParent = (element: Node): ESTree.JSXElement | undefined => {
  let current: Node | undefined = element;
  while (current) {
    const parent = (current as { parent?: Node }).parent;
    if (!parent) return undefined;
    if (parent.type === "JSXElement") return parent;
    current = nextRendered(current, parent);
  }
  return undefined;
};

const elementName = (element: ESTree.JSXElement) => {
  const { name } = element.openingElement;
  return name.type === "JSXIdentifier" ? name.name : undefined;
};

// Biome の nursery/noMisplacedListElements の置き換え。
// <ul> / <ol> / <menu> 以外の要素の中に置いた <li> を禁止する
export const noMisplacedListElements = defineRule({
  create: (context) => ({
    JSXElement: (node) => {
      if (elementName(node) !== "li") return;
      const parent = renderedParent(node);
      const parentName = parent && elementName(parent);
      if (parent && !LIST_CONTAINERS.has(parentName ?? "")) {
        context.report({
          message: "<li> elements must be placed inside <ul>, <ol> or <menu>.",
          node: node.openingElement,
        });
      }
    },
  }),
});
