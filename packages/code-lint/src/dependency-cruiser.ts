import { type Dirent, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type {
  IRegularForbiddenRuleType,
  SeverityType,
} from "dependency-cruiser";
import { SHARED_DIR, SUB_FEATURES_DIR } from "./utils/feature-path.ts";

export type SharedFeatureRulesOptions = {
  /** フィーチャーを置くディレクトリ。相対パスは cwd から解決する */
  featuresDir?: string;
  /** features 直下で、フィーチャーをまとめるだけのディレクトリ（`shared` など） */
  groups?: string[];
  /** dependency-cruiser を動かすディレクトリ（モジュールのパスの基準）。既定は process.cwd() */
  cwd?: string;
  /** 違反の重さ。既定は "error" */
  severity?: SeverityType;
};

const DEFAULT_FEATURES_DIR = "src/features";

const subDirs = (dir: string): string[] => {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .toSorted();
};

/** dir のフィーチャー自身と、配下のサブフィーチャー・共有フィーチャーのディレクトリを返す */
const collectFeatures = (dir: string): string[] => [
  dir,
  ...[SUB_FEATURES_DIR, SHARED_DIR].flatMap((container) =>
    subDirs(join(dir, container)).flatMap((name) =>
      collectFeatures(join(dir, container, name)),
    ),
  ),
];

/** features 直下（groups の中はその中）のフィーチャーのディレクトリを返す */
const topLevelFeatures = (featuresDir: string, groups: string[]) =>
  subDirs(featuresDir).flatMap((name) =>
    groups.includes(name)
      ? subDirs(join(featuresDir, name)).map((child) =>
          join(featuresDir, name, child),
        )
      : [join(featuresDir, name)],
  );

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** ディレクトリの中のモジュールにマッチする正規表現 */
const under = (dirs: string[]) =>
  `^(?:${dirs.map((dir) => escapeRegExp(dir)).join("|")})/`;

/**
 * フィーチャーの中の shared/<name>/ に置いた共有フィーチャーの依存を制御する、
 * dependency-cruiser の forbidden のルールを返す。
 * - shared-not-nearest：共有フィーチャーは、import するモジュールのフィーチャー自身と親のフィーチャーのうち、
 *   shared/ を持つ一番近いものの shared/ からだけ import する
 * - shared-not-relative：共有フィーチャーをパスエイリアスで import しない
 * 一番近い shared/ を決めるため、呼んだ時点のファイルシステムで各フィーチャーの shared/ の有無を見る
 */
export const sharedFeatureRules = (
  options: SharedFeatureRulesOptions = {},
): IRegularForbiddenRuleType[] => {
  const cwd = options.cwd ?? process.cwd();
  const featuresDir = resolve(cwd, options.featuresDir ?? DEFAULT_FEATURES_DIR);
  const severity = options.severity ?? "error";
  const toModulePath = (dir: string) => relative(cwd, dir).split(sep).join("/");
  const owners = topLevelFeatures(featuresDir, options.groups ?? [])
    .flatMap(collectFeatures)
    .filter((dir) => subDirs(join(dir, SHARED_DIR)).length > 0)
    .map(toModulePath);
  return owners.flatMap((owner): IRegularForbiddenRuleType[] => {
    const shared = under([`${owner}/${SHARED_DIR}`]);
    const closer = owners.filter((other) => other.startsWith(`${owner}/`));
    return [
      {
        comment: `${owner}/${SHARED_DIR}/ の共有フィーチャーは、${owner} の中からだけ import する`,
        from: { pathNot: under([owner]) },
        name: "shared-not-nearest",
        severity,
        to: { path: shared },
      },
      ...closer.map((other): IRegularForbiddenRuleType => ({
        comment: `${other} からは、より近い ${other}/${SHARED_DIR}/ を使い、${owner}/${SHARED_DIR}/ の共有フィーチャーを import しない`,
        from: { path: under([other]) },
        name: "shared-not-nearest",
        severity,
        to: { path: shared, pathNot: under([other]) },
      })),
      {
        comment: `${owner}/${SHARED_DIR}/ の共有フィーチャーは、パスエイリアスではなく相対パスで import する`,
        from: {},
        name: "shared-not-relative",
        severity,
        to: { dependencyTypes: ["aliased"], path: shared },
      },
    ];
  });
};
