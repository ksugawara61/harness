import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { defineRule, type ESTree } from "@oxlint/plugins";

const STORIES_FILE_NAME = "stories.tsx";

const MESSAGE =
  "同じディレクトリに stories.tsx を置き、このコンポーネントの story を書いてください";

/** 値の export 文か（`export type` だけの文は数えない） */
const isValueExport = (statement: ESTree.Statement | ESTree.Directive) => {
  if (statement.type === "ExportDefaultDeclaration") return true;
  if (statement.type !== "ExportNamedDeclaration") return false;
  return statement.exportKind !== "type";
};

// コンポーネントを export するファイルの隣に stories.tsx を置くことを強制する。
// 同じディレクトリに stories.tsx が無ければ、最初の値の export 文を報告する。
// どのファイルをコンポーネントの入口とみなすかは、利用側の overrides で決める
export const useStoriesFile = defineRule({
  create: (context) => ({
    Program: (node) => {
      const firstExport = node.body.find(isValueExport);
      if (firstExport === undefined) return;
      const storiesPath = join(dirname(context.filename), STORIES_FILE_NAME);
      if (existsSync(storiesPath)) return;
      context.report({ message: MESSAGE, node: firstExport });
    },
  }),
});
