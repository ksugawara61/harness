import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

/** フィーチャーの構成を見るルールに共通のオプション */
export type FeatureOptions = {
  /** フィーチャーを置くディレクトリ。相対パスは oxlint を動かすディレクトリから解決する */
  featuresDir?: string;
  /** features 直下で、フィーチャーをまとめるだけのディレクトリ（`shared` など） */
  groups?: string[];
  /**
   * import のパスエイリアス。接頭辞から解決先のディレクトリへの対応（`{ "@/": "src/" }` など）。
   * 相対パスは oxlint を動かすディレクトリから解決する
   */
  aliases?: Record<string, string>;
};

/** FeatureOptions の JSON Schema のプロパティ。各ルールの meta.schema で広げる */
export const featureOptionsProperties = {
  aliases: { additionalProperties: { type: "string" }, type: "object" },
  featuresDir: { type: "string" },
  groups: { items: { type: "string" }, type: "array" },
} as const;

const DEFAULT_FEATURES_DIR = "src/features";

const DEFAULT_ALIASES: Record<string, string> = { "@/": "src/" };

/** 各フィーチャーのサブフィーチャーを置くディレクトリの名前 */
export const SUB_FEATURES_DIR = "features";

/**
 * 各フィーチャーの中で、配下のフィーチャーに共通の部品を置くディレクトリの名前。
 * 中には features/ と同じく、フィーチャーのディレクトリ（共有フィーチャー）を置く
 */
export const SHARED_DIR = "shared";

/** フィーチャーの中で、子のフィーチャーを置くディレクトリ */
const isFeatureContainer = (segment: string | undefined) =>
  segment === SUB_FEATURES_DIR || segment === SHARED_DIR;

export type FeaturePath = {
  /**
   * パスが属するフィーチャーのディレクトリ（featuresDir からのセグメント）。
   * `todo-page/features/todo-list` は ["todo-page", "features", "todo-list"]、
   * 共有フィーチャー `todo-page/shared/todo-error` は ["todo-page", "shared", "todo-error"]。
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

export type Alias = {
  /** import のパスの接頭辞（`@/` など） */
  prefix: string;
  /** 接頭辞が指すディレクトリの絶対パス */
  dir: string;
};

export const resolveAliases = (
  cwd: string,
  options?: FeatureOptions,
): Alias[] =>
  Object.entries(options?.aliases ?? DEFAULT_ALIASES).map(([prefix, dir]) => ({
    dir: resolve(cwd, dir),
    prefix,
  }));

export const isRelativeSource = (source: string) =>
  source === "." ||
  source === ".." ||
  source.startsWith("./") ||
  source.startsWith("../");

/**
 * import のパスを絶対パスに解決する。相対パスは import するファイルから、
 * エイリアスは接頭辞の指すディレクトリから解決する。どちらでもなければ（パッケージなど）undefined
 */
export const resolveImportSource = (
  filename: string,
  source: string,
  aliases: Alias[],
): string | undefined => {
  if (isRelativeSource(source)) return resolve(dirname(filename), source);
  const alias = aliases.find(({ prefix }) => source.startsWith(prefix));
  return alias && resolve(alias.dir, source.slice(alias.prefix.length));
};

/** dir の中のパスなら、dir からのセグメントを返す。dir の外なら undefined */
export const segmentsIn = (dir: string, path: string) => {
  const rel = relative(dir, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return undefined;
  return rel.split(sep);
};

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
  const segments = segmentsIn(featuresDir, path);
  if (segments === undefined) return undefined;
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
  while (isFeatureContainer(segments[index]) && hasName(index + 1)) {
    feature.push(segments[index] ?? "", segments[index + 1] ?? "");
    index += 2;
  }
  return { feature, inGroup, rest: segments.slice(index) };
};

/** child が parent の直下のサブフィーチャー（`<parent>/features/<name>`）か */
export const isDirectSubFeature = (parent: string[], child: string[]) =>
  child.length === parent.length + 2 &&
  parent.every((segment, index) => child[index] === segment) &&
  child[parent.length] === SUB_FEATURES_DIR;

/**
 * 共有フィーチャー（`<owner>/shared/<name>`）なら、shared/ を持つフィーチャー owner を返す。
 * グループの中のフィーチャー（`shared/<name>`）のグループのディレクトリは shared/ とみなさない
 */
export const sharedOwnerOf = (feature: string[]) =>
  feature.length > 2 && feature.at(-2) === SHARED_DIR
    ? feature.slice(0, -2)
    : undefined;

export const isSameFeature = (a: string[], b: string[]) =>
  a.length === b.length && a.every((segment, index) => b[index] === segment);

/** ancestor が feature 自身か、feature を配下に持つ親のフィーチャーか */
export const isSelfOrAncestorFeature = (
  ancestor: string[],
  feature: string[],
) =>
  ancestor.length <= feature.length &&
  ancestor.every((segment, index) => feature[index] === segment);

/**
 * feature 自身と親のフィーチャーを、近い順に返す。
 * `todo-page/features/todo-list` は [["todo-page", "features", "todo-list"], ["todo-page"]]。
 * グループの中のフィーチャーは、グループのディレクトリをフィーチャーとみなさない
 */
export const selfAndAncestorFeatures = (feature: string[], inGroup: boolean) =>
  Array.from(
    { length: Math.ceil((feature.length - (inGroup ? 1 : 0)) / 2) },
    (_, index) => feature.slice(0, feature.length - index * 2),
  );
