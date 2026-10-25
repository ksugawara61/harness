import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import {
  type FeatureOptions,
  featureOptionsProperties,
  isRelativeSource,
  isSameFeature,
  isSelfOrAncestorFeature,
  parseFeaturePath,
  resolveAliases,
  resolveFeaturesDir,
  resolveImportSource,
  SHARED_DIR,
  selfAndAncestorFeatures,
  sharedOwnerOf,
} from "../utils/feature-path.ts";

const MESSAGE_NOT_NEAREST =
  "共有フィーチャー（shared/<name>/）は、一番近い親のフィーチャーの shared/ からだけ import してください。ほかの shared/ のものを使うなら、使う側すべてに一番近い共通の親のフィーチャーの shared/ に移してください";
const MESSAGE_ALIAS =
  "共有フィーチャー（shared/<name>/）は、パスエイリアスではなく相対パスで import してください";

// フィーチャーの中の shared/<name>/ に、配下のフィーチャーに共通の部品（共有フィーチャー）を置く規約の
// import の制約。共有フィーチャーを import できるのは、import するファイルの属するフィーチャーと
// その親のフィーチャーのうち、shared/ を持つ一番近いものの shared/ の中だけで、相対パスで書く。
// 兄弟や子のフィーチャーの shared/、より近い shared/ があるときの遠い親の shared/、
// features の外からの shared/ の import は報告する。
// 一番近い shared/ を決めるため、ファイルシステムで各フィーチャーの shared/ の有無を見る
export const useNearestSharedImport = defineRule({
  create: (context) => {
    const [options] = context.options as [FeatureOptions?];
    const featuresDir = resolveFeaturesDir(context.cwd, options);
    const aliases = resolveAliases(context.cwd, options);
    const importer = parseFeaturePath(featuresDir, context.filename, options);
    const nearest =
      importer?.feature &&
      selfAndAncestorFeatures(importer.feature, importer.inGroup).find(
        (feature) => existsSync(join(featuresDir, ...feature, SHARED_DIR)),
      );
    const message = (source: string): string | undefined => {
      const resolved = resolveImportSource(context.filename, source, aliases);
      if (resolved === undefined) return undefined;
      const target = parseFeaturePath(featuresDir, resolved, {
        ...options,
        isModule: true,
      });
      if (target?.feature === undefined) return undefined;
      const owner = sharedOwnerOf(target.feature);
      if (owner === undefined) return undefined;
      // 共有フィーチャーの中から自身を import するときは、一番近いかを見ない
      // （親子の制約は no-cross-feature-import が見る）
      const isInside =
        importer?.feature !== undefined &&
        isSelfOrAncestorFeature(target.feature, importer.feature);
      if (
        !isInside &&
        (nearest === undefined || !isSameFeature(nearest, owner))
      ) {
        return MESSAGE_NOT_NEAREST;
      }
      return isRelativeSource(source) ? undefined : MESSAGE_ALIAS;
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
