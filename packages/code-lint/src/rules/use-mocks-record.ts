import { type Context, defineRule, type ESTree } from "@oxlint/plugins";
import { isFunction, isIdentifier, type Node } from "../utils/ast.ts";

const RECORD_MESSAGE =
  "モックは `{ ... } satisfies Record<string, T>` の形で export してください（T は HttpHandler などのモックの型）";

// `as const` を外した式を返す
const unwrapAsConst = (node: Node): Node =>
  node.type === "TSAsExpression" &&
  node.typeAnnotation.type === "TSTypeReference" &&
  isIdentifier(node.typeAnnotation.typeName, "const")
    ? node.expression
    : node;

// `Record<string, T>` の型か
const isStringRecordType = (node: Node): boolean =>
  node.type === "TSTypeReference" &&
  isIdentifier(node.typeName, "Record") &&
  node.typeArguments?.params[0]?.type === "TSStringKeyword";

// `{ ... } [as const] satisfies Record<string, T>` のオブジェクトリテラルを取り出す
const recordObject = (init: Node | null | undefined) => {
  if (init?.type !== "TSSatisfiesExpression") return undefined;
  if (!isStringRecordType(init.typeAnnotation)) return undefined;
  const object = unwrapAsConst(init.expression);
  return object.type === "ObjectExpression" ? object : undefined;
};

const isFunctionProperty = (property: Node): boolean =>
  property.type === "Property" &&
  (property.method || isFunction(property.value));

// `export const XxxMocks = { ... } satisfies Record<string, T>` の宣言を 1 つ検査する
const checkDeclarator = (
  context: Context,
  declarator: ESTree.VariableDeclarator,
) => {
  if (!isIdentifier(declarator.id)) {
    context.report({ message: RECORD_MESSAGE, node: declarator });
    return;
  }
  if (!declarator.id.name.endsWith("Mocks")) {
    context.report({
      message: "export するモックの変数名は `Mocks` で終えてください",
      node: declarator.id,
    });
  }
  const object = recordObject(declarator.init);
  if (object === undefined) {
    context.report({ message: RECORD_MESSAGE, node: declarator });
    return;
  }
  for (const property of object.properties.filter(isFunctionProperty)) {
    context.report({
      message:
        "モックの値に関数を置かず、HttpHandler などのモックの値そのものを置いてください",
      node: property,
    });
  }
};

// mocks ファイルの export を `〜Mocks` の Record に揃える。
// 値に関数（ファクトリ）を置くと、ケース名で引いた値の型がケースごとに変わり、
// story や test での使い方が揃わなくなるため、値はモックの型そのものにする
export const useMocksRecord = defineRule({
  create: (context) => ({
    ExportAllDeclaration: (node) => {
      context.report({ message: RECORD_MESSAGE, node });
    },
    ExportDefaultDeclaration: (node) => {
      context.report({ message: RECORD_MESSAGE, node });
    },
    ExportNamedDeclaration: (node) => {
      if (node.declaration?.type !== "VariableDeclaration") {
        context.report({ message: RECORD_MESSAGE, node });
        return;
      }
      for (const declarator of node.declaration.declarations) {
        checkDeclarator(context, declarator);
      }
    },
  }),
});
