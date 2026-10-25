import { defineRule } from "@oxlint/plugins";
import {
  type FeatureOptions,
  featureOptionsProperties,
  parseFeaturePath,
  resolveFeaturesDir,
} from "../utils/feature-path.ts";

type Options = FeatureOptions & {
  /** フィーチャーの中に置いてよい、features・shared・components・graphqls 以外のディレクトリ（`assets` など） */
  allowDirs?: string[];
};

const COMPONENTS_DIR = "components";

const GRAPHQLS_DIR = "graphqls";

const MESSAGE_OUTSIDE_FEATURE =
  "features 直下（グループの直下）にはフィーチャーのディレクトリだけを置き、ファイルはフィーチャーの中に置いてください";
const MESSAGE_DIR =
  "フィーチャーの中のディレクトリは、サブフィーチャーを置く features/<name>/、配下に共通の部品を置く shared/<name>/、ロジックの無い部品を置く components/、GraphQL の操作を置く graphqls/ だけにしてください";
const MESSAGE_COMPONENTS =
  "components/ には部品を 1 ファイルずつ直接置いてください（components/<name>.tsx）。ディレクトリにするなら features/ のサブフィーチャーにしてください";
const MESSAGE_GRAPHQLS =
  "graphqls/ には GraphQL の操作（fragment・query・mutation）を 1 ファイルずつ直接置いてください（graphqls/<operation-name>.ts）";

// 中にファイルを 1 つずつ直接置くディレクトリと、中にディレクトリを切ったときのメッセージ
const FLAT_DIRS = new Map([
  [COMPONENTS_DIR, MESSAGE_COMPONENTS],
  [GRAPHQLS_DIR, MESSAGE_GRAPHQLS],
]);

// フィーチャーのディレクトリ構成を強制する。
// - features 直下にはフィーチャーのディレクトリだけを置く
// - フィーチャーの中のファイルは、フィーチャーのルート・components/ の直下・graphqls/ の直下・
//   サブフィーチャー（features/<name>/）・共有フィーチャー（shared/<name>/）のどれかに置く。
//   サブフィーチャーと共有フィーチャーは、同じ構成で入れ子にできる
// どのファイルを対象にするかは、利用側の overrides で featuresDir の中のパスに当てる
export const useFeatureDirectory = defineRule({
  create: (context) => {
    const [options] = context.options as [Options?];
    const featuresDir = resolveFeaturesDir(context.cwd, options);
    const allowDirs = options?.allowDirs ?? [];
    const message = (): string | undefined => {
      const path = parseFeaturePath(featuresDir, context.filename, options);
      if (path === undefined) return undefined;
      const [dir, ...rest] = path.rest;
      if (path.feature === undefined) return MESSAGE_OUTSIDE_FEATURE;
      if (rest.length === 0 || allowDirs.includes(dir ?? "")) return undefined;
      const flatMessage = FLAT_DIRS.get(dir ?? "");
      if (flatMessage === undefined) return MESSAGE_DIR;
      return rest.length === 1 ? undefined : flatMessage;
    };
    return {
      Program: (node) => {
        const reported = message();
        if (reported !== undefined) context.report({ message: reported, node });
      },
    };
  },
  meta: {
    schema: [
      {
        additionalProperties: false,
        properties: {
          ...featureOptionsProperties,
          allowDirs: { items: { type: "string" }, type: "array" },
        },
        type: "object",
      },
    ],
  },
});
