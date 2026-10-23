import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isTextlintProfile,
  TEXTLINT_PROFILES,
  type TextlintProfile,
} from "./textlint/profiles.ts";

/** リポジトリルートに置く設定ファイル */
const CONFIG_FILE_NAME = "docs-lint.config.json";

type TextlintOverride = { dir: string; profile: TextlintProfile };

type CharLimitOverride = { dir: string; max: number };

export type DocsLintConfig = {
  charLimit: {
    /** dir（リポジトリルートからの相対パス。末尾は /）配下の文書は、本文を max 字までにする。先に書いたものが優先 */
    overrides: CharLimitOverride[];
  };
  textlint: {
    /** dir（リポジトリルートからの相対パス。末尾は /）配下の文書は profile で検査する。先に書いたものが優先 */
    overrides: TextlintOverride[];
    /** overrides に当てはまらない文書のプロファイル */
    profile: TextlintProfile;
  };
};

const DEFAULT_CONFIG: DocsLintConfig = {
  charLimit: { overrides: [] },
  textlint: { overrides: [], profile: "technical" },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toProfile = (value: unknown, where: string): TextlintProfile => {
  if (!isTextlintProfile(value)) {
    throw new Error(
      `${CONFIG_FILE_NAME}: ${where} は ${TEXTLINT_PROFILES.join(" / ")} のいずれかです（${JSON.stringify(value)}）`,
    );
  }
  return value;
};

/** overrides[].dir を検証し、別のディレクトリの前方一致を防ぐため末尾に / を補う */
const toDir = (override: Record<string, unknown>, where: string): string => {
  if (typeof override.dir !== "string" || override.dir === "") {
    throw new Error(`${CONFIG_FILE_NAME}: ${where}.dir は空でない文字列です`);
  }
  return override.dir.endsWith("/") ? override.dir : `${override.dir}/`;
};

const toOverrides = (value: unknown, where: string): unknown[] => {
  const overrides = value ?? [];
  if (!Array.isArray(overrides)) {
    throw new Error(`${CONFIG_FILE_NAME}: ${where} は配列です`);
  }
  return overrides;
};

const toSection = (value: unknown, where: string): Record<string, unknown> => {
  const section = value ?? {};
  if (!isRecord(section)) {
    throw new Error(`${CONFIG_FILE_NAME}: ${where} はオブジェクトです`);
  }
  return section;
};

/** 設定ファイルの中身を検証し、省略した項目を既定値で埋める */
export const parseConfig = (raw: unknown): DocsLintConfig => {
  if (!isRecord(raw)) {
    throw new Error(`${CONFIG_FILE_NAME}: オブジェクトではありません`);
  }
  const charLimit = toSection(raw.charLimit, "charLimit");
  const textlint = toSection(raw.textlint, "textlint");
  return {
    charLimit: {
      overrides: toOverrides(charLimit.overrides, "charLimit.overrides").map(
        (override: unknown, index) => {
          const where = `charLimit.overrides[${index}]`;
          if (!isRecord(override)) {
            throw new Error(`${CONFIG_FILE_NAME}: ${where} はオブジェクトです`);
          }
          const { max } = override;
          if (typeof max !== "number" || !Number.isInteger(max) || max <= 0) {
            throw new Error(
              `${CONFIG_FILE_NAME}: ${where}.max は正の整数です（${JSON.stringify(max)}）`,
            );
          }
          return { dir: toDir(override, where), max };
        },
      ),
    },
    textlint: {
      overrides: toOverrides(textlint.overrides, "textlint.overrides").map(
        (override: unknown, index) => {
          const where = `textlint.overrides[${index}]`;
          if (!isRecord(override)) {
            throw new Error(`${CONFIG_FILE_NAME}: ${where} はオブジェクトです`);
          }
          return {
            dir: toDir(override, where),
            profile: toProfile(override.profile, `${where}.profile`),
          };
        },
      ),
      profile:
        textlint.profile === undefined
          ? DEFAULT_CONFIG.textlint.profile
          : toProfile(textlint.profile, "textlint.profile"),
    },
  };
};

/** root の設定ファイルを読む。無ければ既定値（全文書を technical で検査） */
export const loadConfig = (root: string): DocsLintConfig => {
  const path = resolve(root, CONFIG_FILE_NAME);
  return existsSync(path)
    ? parseConfig(JSON.parse(readFileSync(path, "utf8")))
    : DEFAULT_CONFIG;
};

/**
 * 文書を、検査に使うプロファイルごとに分ける。
 * @param paths リポジトリルートからの相対パス
 */
export const groupByTextlintProfile = (
  paths: string[],
  { textlint }: DocsLintConfig,
): Map<TextlintProfile, string[]> =>
  paths.reduce((groups, path) => {
    const profile =
      textlint.overrides.find(({ dir }) => path.startsWith(dir))?.profile ??
      textlint.profile;
    groups.set(profile, [...(groups.get(profile) ?? []), path]);
    return groups;
  }, new Map<TextlintProfile, string[]>());
