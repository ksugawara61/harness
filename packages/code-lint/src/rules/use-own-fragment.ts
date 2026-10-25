import { dirname, resolve } from "node:path";
import { defineRule, type ESTree } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";
import { isRelativeSource } from "../utils/feature-path.ts";

type Options = {
  /** フィーチャーの fragment を置くファイルの名前（拡張子を除く） */
  fragmentFile?: string;
  /** fragment の masking を外す関数の名前 */
  functions?: string[];
};

const DEFAULT_FRAGMENT_FILE = "fragment";

const DEFAULT_FUNCTIONS = ["readFragment"];

// パスの末尾のファイル名から拡張子を外した名前を返す
const stem = (path: string): string =>
  (path.split(/[/\\]/).at(-1) ?? "").replace(/\.[cm]?[jt]sx?$/, "");

const message = (fragmentFile: string) =>
  `readFragment には、同じディレクトリの ${fragmentFile}.ts から import した fragment だけを渡してください。子のフィーチャーの fragment は子の useService で読み、親からは masked のまま渡します`;

/** import した名前から、import 元のパスへの対応を作る */
const importSources = (program: ESTree.Program) =>
  new Map(
    program.body
      .filter((node) => node.type === "ImportDeclaration")
      .flatMap((node) =>
        node.specifiers.map((specifier) => [
          specifier.local.name,
          node.source.value,
        ]),
      ),
  );

// fragment colocation の規約。フィーチャーは自分の fragment.ts の fragment だけを readFragment で読む。
// 子のフィーチャーの fragment を親で読むと、子だけが使うフィールドに親が依存し、
// fragment の masking で子の取得するフィールドを子に閉じ込められなくなるため、報告する
export const useOwnFragment = defineRule({
  create: (context) => {
    const [options] = context.options as [Options?];
    const fragmentFile = options?.fragmentFile ?? DEFAULT_FRAGMENT_FILE;
    const functions = options?.functions ?? DEFAULT_FUNCTIONS;
    const dir = resolve(context.cwd, dirname(context.filename));
    const isFragmentFile = stem(context.filename) === fragmentFile;
    let sources = new Map<string, string>();
    // 同じディレクトリの fragment ファイル（`./fragment.ts` など）からの import か
    const isOwnFragment = (node: Node | undefined) => {
      if (!isIdentifier(node)) return false;
      const source = sources.get(node.name);
      if (source === undefined) return isFragmentFile;
      if (!isRelativeSource(source)) return false;
      const resolved = resolve(dir, source);
      return dirname(resolved) === dir && stem(resolved) === fragmentFile;
    };
    return {
      CallExpression: (node) => {
        if (!functions.some((name) => isIdentifier(node.callee, name))) return;
        const [fragment] = node.arguments;
        if (isOwnFragment(fragment)) return;
        context.report({ message: message(fragmentFile), node });
      },
      Program: (node) => {
        sources = importSources(node);
      },
    };
  },
  meta: {
    schema: [
      {
        additionalProperties: false,
        properties: {
          fragmentFile: { type: "string" },
          functions: { items: { type: "string" }, type: "array" },
        },
        type: "object",
      },
    ],
  },
});
