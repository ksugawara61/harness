import { dirname, join, resolve } from "node:path";
import { defineRule, type ESTree } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";
import { isRelativeSource } from "../utils/feature-path.ts";

type Options = {
  /** フィーチャーの GraphQL の操作を置くディレクトリの名前 */
  graphqlsDir?: string;
  /** fragment の masking を外す関数の名前 */
  functions?: string[];
};

const DEFAULT_GRAPHQLS_DIR = "graphqls";

const DEFAULT_FUNCTIONS = ["readFragment"];

const message = (graphqlsDir: string) =>
  `readFragment には、同じフィーチャーの ${graphqlsDir}/ から import した fragment だけを渡してください。子のフィーチャーの fragment は子の useService で読み、親からは masked のまま渡します`;

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

// fragment colocation の規約。フィーチャーは自分の graphqls/ の fragment だけを readFragment で読む。
// 子のフィーチャーの fragment を親で読むと、子だけが使うフィールドに親が依存し、
// fragment の masking で子の取得するフィールドを子に閉じ込められなくなるため、報告する
export const useOwnFragment = defineRule({
  create: (context) => {
    const [options] = context.options as [Options?];
    const graphqlsDir = options?.graphqlsDir ?? DEFAULT_GRAPHQLS_DIR;
    const functions = options?.functions ?? DEFAULT_FUNCTIONS;
    const dir = resolve(context.cwd, dirname(context.filename));
    const ownGraphqlsDir = join(dir, graphqlsDir);
    let sources = new Map<string, string>();
    // 同じフィーチャーの graphqls/ の直下のファイル（`./graphqls/todo-item-fragment.ts` など）からの import か
    const isOwnFragment = (node: Node | undefined) => {
      if (!isIdentifier(node)) return false;
      const source = sources.get(node.name);
      if (source === undefined || !isRelativeSource(source)) return false;
      return dirname(resolve(dir, source)) === ownGraphqlsDir;
    };
    return {
      CallExpression: (node) => {
        if (!functions.some((name) => isIdentifier(node.callee, name))) return;
        const [fragment] = node.arguments;
        if (isOwnFragment(fragment)) return;
        context.report({ message: message(graphqlsDir), node });
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
          functions: { items: { type: "string" }, type: "array" },
          graphqlsDir: { type: "string" },
        },
        type: "object",
      },
    ],
  },
});
