import { isAbsolute, relative, resolve, sep } from "node:path";

/** フィーチャーの構成を見るルールに共通のオプション */
export type FeatureOptions = {
  /** フィーチャーを置くディレクトリ。相対パスは oxlint を動かすディレクトリから解決する */
  featuresDir?: string;
  /** features 直下で、フィーチャーをまとめるだけのディレクトリ（`shared` など） */
  groups?: string[];
};

/** FeatureOptions の JSON Schema のプロパティ。各ルールの meta.schema で広げる */
export const featureOptionsProperties = {
  featuresDir: { type: "string" },
  groups: { items: { type: "string" }, type: "array" },
} as const;

const DEFAULT_FEATURES_DIR = "src/features";

/** 各フィーチャーのサブフィーチャーを置くディレクトリの名前 */
const SUB_FEATURES_DIR = "features";

export type FeaturePath = {
  /**
   * パスが属するフィーチャーのディレクトリ（featuresDir からのセグメント）。
   * `todo-page/features/todo-list` は ["todo-page", "features", "todo-list"]。
   * features 直下やグループの直下に置いたファイルのように、どのフィーチャーにも属さなければ undefined
   */
  feature: string[] | undefined;
  /** フィーチャーのディレクトリから見た残りのセグメント */
  rest: string[];
  /** features 直下のグループに属するか */
  inGroup: boolean;
};

export const resolveFeaturesDir = (cwd: string, options?: FeatureOptions) =>
  resolve(cwd, options?.featuresDir ?? DEFAULT_FEATURES_DIR);

/**
 * featuresDir の中のパスを、属するフィーチャーと残りに分ける。featuresDir の外なら undefined。
 * ファイルのパスは、最後のセグメントをフィーチャーとみなさない。
 * import 先は `../todo-list` のようにフィーチャーのディレクトリを指すことがあるため、
 * `isModule` を true にして最後のセグメントもフィーチャーとみなす
 */
export const parseFeaturePath = (
  featuresDir: string,
  path: string,
  options?: FeatureOptions & { isModule?: boolean },
): FeaturePath | undefined => {
  const rel = relative(featuresDir, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return undefined;
  const segments = rel.split(sep);
  // 名前のセグメントのあとに、ファイル名が 1 つ残るか（import 先はディレクトリでもよい）
  const minRest = options?.isModule ? 0 : 1;
  const hasName = (index: number) => index + minRest < segments.length;
  const [first = ""] = segments;
  const inGroup = options?.groups?.includes(first) ?? false;
  const start = inGroup ? 1 : 0;
  if (!hasName(start)) {
    return { feature: undefined, inGroup, rest: segments.slice(start) };
  }
  const feature = segments.slice(0, start + 1);
  let index = start + 1;
  while (segments[index] === SUB_FEATURES_DIR && hasName(index + 1)) {
    feature.push(SUB_FEATURES_DIR, segments[index + 1] ?? "");
    index += 2;
  }
  return { feature, inGroup, rest: segments.slice(index) };
};

/** child が parent の直下のサブフィーチャー（`<parent>/features/<name>`）か */
export const isDirectSubFeature = (parent: string[], child: string[]) =>
  child.length === parent.length + 2 &&
  parent.every((segment, index) => child[index] === segment) &&
  child[parent.length] === SUB_FEATURES_DIR;

export const isSameFeature = (a: string[], b: string[]) =>
  a.length === b.length && a.every((segment, index) => b[index] === segment);
