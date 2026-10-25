import { type Context, defineRule, type ESTree } from "@oxlint/plugins";
import { Kind, parse } from "graphql";
import { isIdentifier, type Node } from "../utils/ast.ts";

const KINDS = ["fragment", "mutation", "query", "subscription"] as const;

type OperationKind = (typeof KINDS)[number];

const MESSAGE_EXPORT =
  "graphqls/ のファイルからは、graphql() で書いた GraphQL の操作を 1 つだけ `export const` で export してください";

// パスの末尾のファイル名から拡張子を外した名前を返す
const stem = (path: string): string =>
  (path.split(/[/\\]/).at(-1) ?? "").replace(/\.[cm]?[jt]sx?$/, "");

/** kebab-case を PascalCase にする（`todo-item-fragment` → `TodoItemFragment`） */
const pascalCase = (name: string) =>
  name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

/** ファイル名の接尾辞が表す操作の種類（`todos-query` → `query`） */
const kindOfName = (name: string): OperationKind | undefined =>
  KINDS.find((kind) => name.endsWith(`-${kind}`));

/** `graphql(`...`, [...])` の GraphQL の文字列。埋め込み式を含むものは見ない */
const graphqlSource = (init: Node | null | undefined) => {
  if (
    init?.type !== "CallExpression" ||
    !isIdentifier(init.callee, "graphql")
  ) {
    return undefined;
  }
  const [first] = init.arguments;
  if (first?.type !== "TemplateLiteral" || first.expressions.length > 0) {
    return undefined;
  }
  return first.quasis[0]?.value.raw;
};

/** GraphQL の文字列の最初の定義の種類。解析できなければ undefined */
const kindOfSource = (source: string): OperationKind | undefined => {
  try {
    const [definition] = parse(source).definitions;
    if (definition?.kind === Kind.FRAGMENT_DEFINITION) return "fragment";
    if (definition?.kind === Kind.OPERATION_DEFINITION) {
      return definition.operation;
    }
  } catch {
    // 構文の誤りは graphql-* のルールが報告する
  }
  return undefined;
};

const checkDeclarator = (
  context: Context,
  declarator: ESTree.VariableDeclarator,
  name: string,
) => {
  if (!isIdentifier(declarator.id)) {
    context.report({ message: MESSAGE_EXPORT, node: declarator });
    return;
  }
  const expected = pascalCase(name);
  if (declarator.id.name !== expected) {
    context.report({
      message: `export する名前は、ファイル名を PascalCase にした ${expected} にしてください`,
      node: declarator.id,
    });
  }
  const source = graphqlSource(declarator.init);
  if (source === undefined) {
    context.report({ message: MESSAGE_EXPORT, node: declarator });
    return;
  }
  // ファイル名に種類の接尾辞が無いときは Program:exit で報告するため、ここでは見ない
  const kindInName = kindOfName(name);
  const kind = kindOfSource(source);
  if (kindInName !== undefined && kind !== undefined && kind !== kindInName) {
    context.report({
      message: `${kind} を書いたファイルの名前は、-${kind} で終えてください（${name.replace(/-(fragment|mutation|query|subscription)$/, "")}-${kind}.ts）`,
      node: declarator,
    });
  }
};

// フィーチャーの graphqls/ に置く GraphQL の操作のファイルを、1 ファイル 1 操作に揃える。
// - ファイル名は操作の種類で終える（`todo-item-fragment.ts`・`todos-query.ts`・`create-todo-mutation.ts`）
// - export は graphql() で書いた操作 1 つだけで、名前はファイル名の PascalCase（`TodoItemFragment`）
// ファイル名から export の名前と操作の種類がわかり、grep で操作を一意に追える。
// どのファイルに当てるかは、利用側の overrides で `src/features/**/graphqls/*.ts` などに当てる
export const useGraphqlOperationFile = defineRule({
  create: (context) => {
    const name = stem(context.filename);
    let exported = 0;
    const report = (node: Node) => {
      context.report({ message: MESSAGE_EXPORT, node });
    };
    return {
      ExportAllDeclaration: report,
      ExportDefaultDeclaration: report,
      ExportNamedDeclaration: (node) => {
        if (node.exportKind === "type") return;
        if (node.declaration?.type !== "VariableDeclaration") {
          report(node);
          return;
        }
        for (const declarator of node.declaration.declarations) {
          exported += 1;
          if (exported > 1) {
            report(declarator);
            continue;
          }
          checkDeclarator(context, declarator, name);
        }
      },
      "Program:exit": (node) => {
        if (kindOfName(name) === undefined) {
          context.report({
            message:
              "graphqls/ のファイルの名前は、操作の種類（-fragment・-query・-mutation・-subscription）で終えてください",
            node,
          });
        }
        if (exported === 0) report(node);
      },
    };
  },
});
