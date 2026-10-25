import { dirname, resolve } from "node:path";
import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import {
  type FeatureOptions,
  featureOptionsProperties,
  isDirectSubFeature,
  isSameFeature,
  parseFeaturePath,
  resolveFeaturesDir,
} from "../utils/feature-path.ts";

const MESSAGE_FROM_FEATURE =
  "フィーチャーから import できるのは、同じフィーチャーのファイルと直下のサブフィーチャー（features/<name>/）だけです。ほかのフィーチャーの中で使うものは、使う側の features/ か components/ に移してください";
const MESSAGE_FROM_OUTSIDE =
  "features の外から import できるのは、features 直下のフィーチャー（ページ）だけです。サブフィーチャーは親のフィーチャーから使ってください";

const isRelative = (source: string) =>
  source === "." ||
  source === ".." ||
  source.startsWith("./") ||
  source.startsWith("../");

/** フィーチャー own から target を import してよいか（own がどのフィーチャーにも属さなければ見ない） */
const isAllowedFrom = (own: string[] | undefined, target: string[]) =>
  own === undefined ||
  isSameFeature(own, target) ||
  isDirectSubFeature(own, target);

// features 直下にページ相当のフィーチャーだけを置き、部品をサブフィーチャーとして親の中に閉じ込めるための
// import の制約。フィーチャーからは、同じフィーチャーのファイルと直下のサブフィーチャーだけを import でき、
// features の外（ルーティングなど）からは features 直下のフィーチャーだけを import できる。
// groups に挙げたディレクトリ（`shared` など）の中のフィーチャーは、どこからでも import できる。
// 相対パスの import だけを見る（パスエイリアスは解決しない）
export const noCrossFeatureImport = defineRule({
  create: (context) => {
    const [options] = context.options as [FeatureOptions?];
    const featuresDir = resolveFeaturesDir(context.cwd, options);
    const importer = parseFeaturePath(featuresDir, context.filename, options);
    const message = (source: string): string | undefined => {
      if (!isRelative(source)) return undefined;
      const target = parseFeaturePath(
        featuresDir,
        resolve(dirname(context.filename), source),
        { ...options, isModule: true },
      );
      if (target?.feature === undefined || target.inGroup) return undefined;
      if (importer === undefined) {
        return target.feature.length === 1 ? undefined : MESSAGE_FROM_OUTSIDE;
      }
      return isAllowedFrom(importer.feature, target.feature)
        ? undefined
        : MESSAGE_FROM_FEATURE;
    };
    const check = (node: Node, source: Node | null | undefined) => {
      if (source?.type !== "Literal" || typeof source.value !== "string") {
        return;
      }
      const reported = message(source.value);
      if (reported !== undefined) context.report({ message: reported, node });
    };
    return {
      ExportAllDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ImportDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
    };
  },
  meta: {
    schema: [
      {
        additionalProperties: false,
        properties: featureOptionsProperties,
        type: "object",
      },
    ],
  },
});
