import type { ESTree } from "@oxlint/plugins";
import {
  ancestors,
  isPlainBlockFunction,
  isIdentifier,
  type Node,
} from "./ast.ts";

/**
 * ブロック本体を持つ関数が `const name = () => { ... }`（変数の型注釈あり可・async 可）か
 * `function name() { ... }` で宣言されていれば、その name を返す。
 * `const name = function () {}`・`export default function name() {}`・
 * 戻り値の型注釈や型引数のある関数は、移植元の GritQL と同じく対象外
 */
const declaredFunctionName = (node: Node): string | undefined => {
  if (!isPlainBlockFunction(node)) return undefined;
  if (node.type === "FunctionDeclaration") {
    if (node.parent.type === "ExportDefaultDeclaration") return undefined;
    return node.id?.name;
  }
  if (node.type !== "ArrowFunctionExpression") return undefined;
  const declarator = node.parent;
  if (
    declarator.type !== "VariableDeclarator" ||
    declarator.init !== node ||
    declarator.parent.type !== "VariableDeclaration" ||
    declarator.parent.kind !== "const" ||
    !isIdentifier(declarator.id)
  ) {
    return undefined;
  }
  return declarator.id.name;
};

const COMPONENT_NAME = /^[A-Z]/;

/** JSX コンポーネント（大文字始まりの名前で宣言された関数）の内側にあるか */
export const isWithinComponent = (node: Node): boolean =>
  ancestors(node).some((ancestor) =>
    COMPONENT_NAME.test(declaredFunctionName(ancestor) ?? ""),
  );

/** node を内側に含む useService の宣言（最も近いもの）を返す */
export const enclosingUseService = (node: Node): Node | undefined =>
  ancestors(node).find(
    (ancestor) => declaredFunctionName(ancestor) === "useService",
  );

/**
 * `const x = ...` のように宣言子が 1 つだけの const 宣言を取り出す。
 * for 文の初期化部分（`for (const x of xs)`）は対象外
 */
export const singleConstDeclarator = (
  node: ESTree.VariableDeclaration,
): ESTree.VariableDeclarator | undefined => {
  if (node.kind !== "const" || node.declarations.length !== 1) {
    return undefined;
  }
  if (/^For(In|Of)?Statement$/.test(node.parent.type)) return undefined;
  const [declarator] = node.declarations;
  return declarator?.init ? declarator : undefined;
};
