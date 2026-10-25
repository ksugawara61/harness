import { relative, sep } from "node:path";
import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import {
  type Alias,
  type FeatureOptions,
  featureOptionsProperties,
  isRelativeSource,
  resolveAliases,
  resolveFeaturesDir,
  resolveImportSource,
  segmentsIn,
} from "../utils/feature-path.ts";

/**
 * パスが属する境界の単位を、エイリアスのディレクトリからのパスで返す。
 * - featuresDir の直下のフィーチャー（groups の中はその中のフィーチャー）
 * - それ以外は、エイリアスのディレクトリの直下のディレクトリ（`app`・`ui` などのレイヤー）
 * - エイリアスのディレクトリの直下のファイルは、そのファイルだけで 1 つの単位
 */
const boundaryOf = (
  alias: Alias,
  featuresDir: string,
  path: string,
  options: FeatureOptions | undefined,
) => {
  const features = segmentsIn(featuresDir, path);
  if (features !== undefined) {
    const [first = ""] = features;
    const depth = options?.groups?.includes(first) ? 2 : 1;
    const unit = features.length > depth ? features.slice(0, depth) : features;
    return [relative(alias.dir, featuresDir), ...unit].join("/");
  }
  const [first] = segmentsIn(alias.dir, path) ?? [];
  return first;
};

const toPosix = (path: string) => path.split(sep).join("/");

// エイリアスのディレクトリ（既定は `src/`）の中を境界の単位に分け、単位を越える import を
// 相対パスで書くことを禁止する。越える import はパスエイリアス（`@/features/...`・`@/ui/...` など）で書く。
// 同じ単位の内側は相対パスのままでよい（親方向の `../` を含んでもよい）
export const noRelativeCrossBoundary = defineRule({
  create: (context) => {
    const [options] = context.options as [FeatureOptions?];
    const featuresDir = resolveFeaturesDir(context.cwd, options);
    const aliases = resolveAliases(context.cwd, options);
    const alias = aliases.find(
      ({ dir }) => segmentsIn(dir, context.filename) !== undefined,
    );
    const suggestion = (source: string): string | undefined => {
      if (alias === undefined || !isRelativeSource(source)) return undefined;
      const target = resolveImportSource(context.filename, source, aliases);
      if (target === undefined || segmentsIn(alias.dir, target) === undefined) {
        return undefined;
      }
      const own = boundaryOf(alias, featuresDir, context.filename, options);
      const other = boundaryOf(alias, featuresDir, target, options);
      if (own === other) return undefined;
      return `${alias.prefix}${toPosix(relative(alias.dir, target))}`;
    };
    const check = (node: Node, source: Node | null | undefined) => {
      if (source?.type !== "Literal" || typeof source.value !== "string") {
        return;
      }
      const suggested = suggestion(source.value);
      if (suggested === undefined) return;
      context.report({
        message: `境界（フィーチャー・レイヤー）を越える import は、相対パスではなくパスエイリアスで書いてください（"${suggested}"）`,
        node,
      });
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
