import type { ESTree } from "@oxlint/plugins";

export type Node = ESTree.Node;

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

export type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

export const isFunction = (node: Node): node is FunctionNode =>
  node.type === "ArrowFunctionExpression" ||
  node.type === "FunctionExpression" ||
  node.type === "FunctionDeclaration";
