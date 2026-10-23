import type { ESTree } from "@oxlint/plugins";

export type Node = ESTree.Node;

const isNode = (value: unknown): value is Node =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string";

const childNodes = (node: Node): Node[] =>
  Object.entries(node).flatMap(([key, value]) => {
    if (key === "parent") return [];
    if (Array.isArray(value)) return value.filter(isNode);
    return isNode(value) ? [value] : [];
  });

/** node 自身を含む子孫ノードを深さ優先・出現順で列挙する */
export const descendants = (node: Node): Node[] => [
  node,
  ...childNodes(node).flatMap(descendants),
];

/** node の祖先を近い順に列挙する（node 自身は含まない） */
export const ancestors = (node: Node): Node[] => {
  const parent = (node as { parent?: Node | null }).parent;
  return parent ? [parent, ...ancestors(parent)] : [];
};

export const isIdentifier = (
  node: Node | null | undefined,
  name?: string | RegExp,
): node is ESTree.IdentifierReference => {
  if (node?.type !== "Identifier") return false;
  if (name === undefined) return true;
  return typeof name === "string" ? node.name === name : name.test(node.name);
};

/** `callee(...)` の callee が識別子 name（文字列は完全一致、正規表現はマッチ）か */
export const isCallTo = (node: Node, name: string | RegExp): boolean =>
  node.type === "CallExpression" && isIdentifier(node.callee, name);

/** `object.property(...)` の形の呼び出しか（どちらも識別子） */
export const isMemberCallTo = (
  node: Node,
  object: string | RegExp,
  property: string | RegExp,
): boolean =>
  node.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  isIdentifier(node.callee.object, object) &&
  isIdentifier(node.callee.property, property);

export type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

export const isFunction = (node: Node): node is FunctionNode =>
  node.type === "ArrowFunctionExpression" ||
  node.type === "FunctionExpression" ||
  node.type === "FunctionDeclaration";

/** `{ ... }` の本体を持つ関数か（式本体のアロー関数は false） */
const hasBlockBody = (node: Node): node is FunctionNode =>
  isFunction(node) && node.body?.type === "BlockStatement";

/**
 * 戻り値の型注釈も型引数も無い、ブロック本体の関数か。
 * 移植元の GritQL のパターン（`($p) => { $body }` など）は型注釈付きの関数に一致しなかったため、
 * 検出範囲を揃えるために使う
 */
export const isPlainBlockFunction = (node: Node): node is FunctionNode =>
  hasBlockBody(node) && !node.returnType && !node.typeParameters;

/**
 * オブジェクトリテラルから、`name: value` の形のプロパティの値を取り出す。
 * 文字列キー（`"name": value`）・計算キー・メソッド記法（`name() {}`）は対象外
 */
export const propertyValue = (object: Node, name: string): Node | undefined => {
  if (object.type !== "ObjectExpression") return undefined;
  const property = object.properties.find(
    (item): item is ESTree.ObjectProperty =>
      item.type === "Property" &&
      !item.computed &&
      !item.method &&
      isIdentifier(item.key, name),
  );
  return property?.value;
};
