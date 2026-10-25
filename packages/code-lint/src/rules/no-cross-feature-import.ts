import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import {
  type FeatureOptions,
  featureOptionsProperties,
  isDirectSubFeature,
  isSameFeature,
  isSelfOrAncestorFeature,
  parseFeaturePath,
  resolveAliases,
  resolveFeaturesDir,
  resolveImportSource,
  sharedOwnerOf,
} from "../utils/feature-path.ts";

const MESSAGE_FROM_FEATURE =
  "フィーチャーから import できるのは、同じフィーチャーのファイルと直下のサブフィーチャー（features/<name>/）、親のフィーチャーの共有フィーチャー（shared/<name>/）だけです。ほかのフィーチャーの中で使うものは、使う側の features/ か components/ に移してください";
const MESSAGE_FROM_OUTSIDE =
  "features の外から import できるのは、features 直下のフィーチャー（ページ）だけです。サブフィーチャーは親のフィーチャーから使ってください";

/** 共有フィーチャー target の持ち主が、own 自身か own の親のフィーチャーか */
const isSharedFromAncestor = (own: string[], target: string[]) => {
  const owner = sharedOwnerOf(target);
  return owner !== undefined && isSelfOrAncestorFeature(owner, own);
};

/** フィーチャー own から target を import してよいか（own がどのフィーチャーにも属さなければ見ない） */
const isAllowedFrom = (own: string[] | undefined, target: string[]) =>
  own === undefined ||
  isSameFeature(own, target) ||
  isDirectSubFeature(own, target) ||
  isSharedFromAncestor(own, target);

// features 直下にページ相当のフィーチャーだけを置き、部品をサブフィーチャーとして親の中に閉じ込めるための
// import の制約。フィーチャーからは、同じフィーチャーのファイルと直下のサブフィーチャーだけを import でき、
// features の外（ルーティングなど）からは features 直下のフィーチャーだけを import できる。
// 自身と親のフィーチャーの共有フィーチャー（shared/<name>/）も import できる
// （どの shared/ に限るかは use-nearest-shared-import が見る）。
// groups に挙げたディレクトリ（`shared` など）の中のフィーチャーは、どこからでも import できる。
// 相対パスと、aliases に挙げたパスエイリアス（既定は `@/` → `src/`）の import を見る
export const noCrossFeatureImport = defineRule({
  create: (context) => {
    const [options] = context.options as [FeatureOptions?];
    const featuresDir = resolveFeaturesDir(context.cwd, options);
    const aliases = resolveAliases(context.cwd, options);
    const importer = parseFeaturePath(featuresDir, context.filename, options);
    const message = (source: string): string | undefined => {
      const resolved = resolveImportSource(context.filename, source, aliases);
      if (resolved === undefined) return undefined;
      const target = parseFeaturePath(featuresDir, resolved, {
        ...options,
        isModule: true,
      });
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
