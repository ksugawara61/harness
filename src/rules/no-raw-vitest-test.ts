import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";

/**
 * `import { it }`・`{ it }` のような省略記法では、同じ位置に識別子が 2 つできる。
 * ソース上の 1 か所を 1 件として数えるため、後から訪れる方を除く
 */
const isShorthandDuplicate = (node: Node) => {
  const { parent } = node as Node & { parent: Node };
  if (parent.type === "ImportSpecifier" || parent.type === "ExportSpecifier") {
    const self =
      parent.type === "ImportSpecifier" ? parent.imported : parent.exported;
    return (
      node === self &&
      parent.local !== self &&
      parent.local.start === self.start
    );
  }
  return parent.type === "Property" && parent.shorthand && parent.key === node;
};

// 仕様テスト（test.ts(x)）では specIt / specIt.each だけを使い、素の it / test を禁止する。
// 呼び出しだけでなく、import・プロパティ名・変数名など it / test という識別子をすべて対象にする
export const noRawVitestTest = defineRule({
  create: (context) => ({
    Identifier: (node) => {
      if (node.name !== "it" && node.name !== "test") return;
      if (isShorthandDuplicate(node)) return;
      context.report({
        message:
          "仕様テストの test.ts(x) で素の it / test を使うことは禁止されています。仕様テストは specIt / specIt.each を使い、純粋関数の単体テストは *.test.ts(x) に分離してください。",
        node,
      });
    },
  }),
});
