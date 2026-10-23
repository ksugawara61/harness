import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * パッケージが提供する textlint のプロファイル（preset の組み合わせ）。
 * - technical: 技術文書向け。`preset-ja-technical-writing` と `@textlint-ja/preset-ai-writing`
 * - blog: technical に、AI が書いた文章に多い単語を指摘する `preset-ai-words-ja` を足したもの
 */
export const TEXTLINT_PROFILES = ["technical", "blog"] as const;

export type TextlintProfile = (typeof TEXTLINT_PROFILES)[number];

export const isTextlintProfile = (value: unknown): value is TextlintProfile =>
  TEXTLINT_PROFILES.some((profile) => profile === value);

/** パッケージのルート。src/textlint/ からも dist/textlint/ からも 2 つ上になる */
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

/** プロファイルの textlintrc */
export const textlintrcPath = (profile: TextlintProfile): string =>
  join(packageRoot, "profiles", "textlint", `${profile}.json`);

/** preset が node_modules にあるかを確かめる目印 */
const PRESET_MARKER = "textlint-rule-preset-ja-technical-writing";

/** dir が node_modules ならそのもの、そうでなければ dir 直下の node_modules */
const toNodeModulesDir = (dir: string): string =>
  basename(dir) === "node_modules" ? dir : join(dir, "node_modules");

/**
 * preset を読み込む node_modules。利用側の cwd ではなく、このパッケージの依存が見える場所を使う。
 * Node.js と同じく、パッケージのルートから親へ node_modules をたどって最初に preset があるものを選ぶ。
 * require.resolve は symlink を実体のパスに直すため、pnpm の isolated な配置では
 * preset 自身の node_modules（ほかの preset が無い）を指してしまう。そのためパスを自前でたどる。
 */
export const presetModulesDir = (): string => {
  for (let dir = packageRoot; ; dir = dirname(dir)) {
    const candidate = toNodeModulesDir(dir);
    if (existsSync(join(candidate, PRESET_MARKER))) {
      return candidate;
    }
    if (dirname(dir) === dir) {
      throw new Error(
        `${PRESET_MARKER} が見つかりません。@ksugawara61/docs-lint の依存をインストールしてください`,
      );
    }
  }
};
