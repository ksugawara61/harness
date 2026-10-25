import { defineRule } from "@oxlint/plugins";
import {
  type FeatureOptions,
  featureOptionsProperties,
  parseFeaturePath,
  resolveFeaturesDir,
  SHARED_DIR,
} from "../utils/feature-path.ts";

type Options = FeatureOptions & {
  /** フィーチャーの中に置いてよい、features・components・shared 以外のディレクトリ（`graphqls` など） */
  allowDirs?: string[];
};

const COMPONENTS_DIR = "components";

const MESSAGE_OUTSIDE_FEATURE =
  "features 直下（グループの直下）にはフィーチャーのディレクトリだけを置き、ファイルはフィーチャーの中に置いてください";
const MESSAGE_DIR =
  "フィーチャーの中のディレクトリは、サブフィーチャーを置く features/<name>/ と、ロジックの無い部品を置く components/、配下に共通のロジックを置く shared/ だけにしてください";
const MESSAGE_COMPONENTS =
  "components/ には部品を 1 ファイルずつ直接置いてください（components/<name>.tsx）。ディレクトリにするなら features/ のサブフィーチャーにしてください";

// フィーチャーのディレクトリ構成を強制する。
// - features 直下にはフィーチャーのディレクトリだけを置く
// - フィーチャーの中のファイルは、フィーチャーのルート・components/ の直下・shared/ の中・
//   サブフィーチャー（features/<name>/、同じ構成で入れ子にできる）のどれかに置く
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
      if (rest.length === 0 || dir === SHARED_DIR) return undefined;
      if (allowDirs.includes(dir ?? "")) return undefined;
      if (dir !== COMPONENTS_DIR) return MESSAGE_DIR;
      return rest.length === 1 ? undefined : MESSAGE_COMPONENTS;
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
