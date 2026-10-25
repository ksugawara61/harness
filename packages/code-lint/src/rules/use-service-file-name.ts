import { defineRule } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";

const MESSAGE =
  "useService は同じディレクトリの service.ts に置いてください（use-service.ts などの名前にしない）";

// パスの末尾のファイル名から拡張子を外した名前を返す
const stem = (path: string): string =>
  (path.split(/[/\\]/).at(-1) ?? "").replace(/\.[cm]?[jt]sx?$/, "");

const declaresUseService = (node: Node): boolean =>
  (node.type === "FunctionDeclaration" || node.type === "VariableDeclarator") &&
  isIdentifier(node.id, "useService");

// useService を置くファイルの名前を service.ts に揃える。
// service.ts 以外のファイルでの useService の宣言と、
// service 以外のモジュールからの useService の import を報告する
export const useServiceFileName = defineRule({
  create: (context) => {
    const inServiceFile = stem(context.filename) === "service";
    const reportDeclaration = (node: Node) => {
      if (inServiceFile || !declaresUseService(node)) return;
      context.report({ message: MESSAGE, node });
    };
    return {
      FunctionDeclaration: reportDeclaration,
      ImportDeclaration: (node) => {
        if (stem(node.source.value) === "service") return;
        const importsUseService = node.specifiers.some(
          (specifier) =>
            specifier.type === "ImportSpecifier" &&
            isIdentifier(specifier.imported, "useService"),
        );
        if (importsUseService) context.report({ message: MESSAGE, node });
      },
      VariableDeclarator: reportDeclaration,
    };
  },
});
