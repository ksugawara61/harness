import { defineRule } from "@oxlint/plugins";

const isExport = (node: { type: string }) =>
  node.type === "ExportNamedDeclaration" ||
  node.type === "ExportDefaultDeclaration" ||
  node.type === "ExportAllDeclaration";

// 1 つのファイル（feature の index.tsx など）からは 1 つの component だけを export する。
// 2 つ目以降の export 文（型の export を含む）をすべて報告する
export const noMultipleFeatureExports = defineRule({
  create: (context) => ({
    Program: (node) => {
      for (const statement of node.body.filter(isExport).slice(1)) {
        context.report({
          message: "このファイルからは一つの component のみ export できます",
          node: statement,
        });
      }
    },
  }),
});
