#!/usr/bin/env node
// Markdown 文書を textlint・markdownlint・本文の文字数上限で検査する。
// textlint のプロファイル（preset の組み合わせ）はこのパッケージが持ち、
// どのディレクトリをどのプロファイルで検査するか・どのディレクトリに何字の上限を掛けるかは
// リポジトリルートの docs-lint.config.json で決める。
// markdownlint のルールもこのパッケージのプロファイルにあり、リポジトリルートの .markdownlint-cli2.jsonc が読む。
// textlint は既存文書の違反を段階的に直すため、既定では変更で追加・書き換えた行に掛かる指摘だけを報告する。
// markdownlint と文字数は変更行ではなく、対象の文書全体を検査する（文字数は front matter を除く本文で数える）。
// 除外は .textlintignore と .markdownlint-cli2.jsonc の ignores に書く。使い方は @ksugawara61/docs-lint の README を参照。
//
//   docs-lint                  … origin/main との merge-base から作業ツリー（未コミット・未追跡含む）までに変更した行
//   docs-lint <file...>        … 指定した文書のうち変更した行
//   docs-lint --base=<ref>     … 比較元を変える
//   docs-lint --all [file...]  … 変更の有無によらず全行を検査する（既存違反の棚卸し・修正用）
//   docs-lint --fix <file...>  … 指定した文書の markdownlint と textlint の自動修正できる指摘を全行直して書き込み、
//                                      残る指摘を表示する（変更行の絞り込みはしない。修正で行番号がずれるため、文書は必ず明示する。
//                                       文字数は自動で直せないため検査しない）

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { argv, cwd, exit } from "node:process";
import { createLinter, loadLinterFormatter, loadTextlintrc } from "textlint";
import {
  findCharLimit,
  findOversizedDocs,
  formatOversizedDoc,
} from "../char-limit/limit.ts";
import { groupByTextlintProfile, loadConfig } from "../config.ts";
import { isDocPath, selectChangedDocs, selectFixTargets } from "../docs.ts";
import {
  mergeUntrackedChanges,
  parseAddedLines,
  parseGitNameStatus,
} from "../git.ts";
import { runMarkdownlint } from "../markdownlint/run.ts";
import {
  presetModulesDir,
  type TextlintProfile,
  textlintrcPath,
} from "../textlint/profiles.ts";
import {
  filterToAddedLines,
  summarizeFixResults,
} from "../textlint/results.ts";

const args = argv.slice(2);
const option = (name: string) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const all = args.includes("--all");
const fix = args.includes("--fix");
const root = cwd();
const config = loadConfig(root);
// ./docs/x.md や絶対パスでも変更一覧（リポジトリルートからの相対パス）と照合できるようにそろえる
const files = args
  .filter((arg) => !arg.startsWith("--"))
  .filter(isDocPath)
  .map((arg) => relative(root, resolve(root, arg)));

const git = (gitArgs: string[]) =>
  execFileSync("git", gitArgs, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });

const resolveBase = () => {
  const ref = option("base") ?? "origin/main";
  try {
    return git(["merge-base", ref, "HEAD"]).trim();
  } catch {
    console.error(
      `❌ ${ref} との merge-base を解決できません。git fetch origin main するか --base を指定してください`,
    );
    return exit(2);
  }
};

const listUntracked = () =>
  git(["ls-files", "--others", "--exclude-standard"]).split("\n");

const listAllDocs = () =>
  [...git(["ls-files"]).split("\n"), ...listUntracked()].filter(isDocPath);

/** 変更行モードの対象と追加行。未追跡の文書は addedLines に載らず全行が対象になる */
const collectChanges = () => {
  const base = resolveBase();
  const untracked = listUntracked();
  const changes = mergeUntrackedChanges(
    parseGitNameStatus(git(["diff", "--name-status", "--find-renames", base])),
    untracked,
  );
  const changed = selectChangedDocs(changes);
  const targets =
    files.length > 0 ? changed.filter((path) => files.includes(path)) : changed;
  const tracked = targets.filter((path) => !untracked.includes(path));
  const addedLines =
    tracked.length > 0
      ? parseAddedLines(
          git([
            "diff",
            "--unified=0",
            "--find-renames",
            base,
            "--",
            // rename を検出させるため、移動元のパスも pathspec に含める
            ...changes
              .filter(({ path }) => tracked.includes(path))
              .flatMap(({ path, previousPath }) =>
                previousPath ? [previousPath, path] : [path],
              ),
          ]),
          tracked,
        )
      : new Map<string, Set<number>>();
  return { addedLines, base, targets };
};

const linterFor = async (profile: TextlintProfile) =>
  createLinter({
    cwd: root,
    descriptor: await loadTextlintrc({
      configFilePath: textlintrcPath(profile),
      node_modulesDir: presetModulesDir(),
    }),
    ignoreFilePath: resolve(root, ".textlintignore"),
  });

/** markdownlint の結果を表示し、終了コードを返す */
const reportMarkdownlint = ({
  code,
  findings,
}: Awaited<ReturnType<typeof runMarkdownlint>>) => {
  if (code === 0) {
    console.log(
      fix
        ? "✅ 修正後に残る markdownlint の指摘はありません"
        : "✅ markdownlint の指摘はありません",
    );
    return 0;
  }
  for (const finding of findings) {
    console.log(finding);
  }
  console.log(
    fix
      ? "❌ markdownlint の自動修正できない指摘が残っています。手で直してください"
      : "❌ markdownlint の指摘があります。自動修正できるものは docs-lint --fix <file> で直せます",
  );
  return code;
};

/** 指定した文書の自動修正を書き込み、残る指摘を表示する */
const runFix = async () => {
  const targets = selectFixTargets(files);
  if (targets.length === 0) {
    console.error("❌ --fix には修正する .md 文書を指定してください");
    return 2;
  }
  // textlint の修正は markdownlint の修正後の文書に掛ける（同じ文書を並行して書き換えない）
  console.log(`markdownlint: ${targets.length} 文書の自動修正を適用します`);
  const markdownlintCode = reportMarkdownlint(
    await runMarkdownlint({ fix: true, paths: targets, root }),
  );
  console.log(`textlint: ${targets.length} 文書の自動修正を適用します`);
  const fixResultGroups = await Promise.all(
    [...groupByTextlintProfile(targets, config)].map(
      async ([profile, paths]) => {
        const linter = await linterFor(profile);
        return linter.fixFiles(paths.map((path) => resolve(root, path)));
      },
    ),
  );
  const { applied, remaining, writes } = summarizeFixResults(
    fixResultGroups.flat(),
  );
  await Promise.all(
    writes.map(({ filePath, output }) => writeFile(filePath, output)),
  );
  console.log(
    `${applied} 件を自動修正し、${writes.length} 文書を書き換えました`,
  );

  const count = remaining.reduce(
    (sum, { messages }) => sum + messages.length,
    0,
  );
  if (count === 0) {
    console.log("✅ 修正後に残る textlint の指摘はありません");
    return markdownlintCode;
  }
  const formatter = await loadLinterFormatter({ formatterName: "stylish" });
  console.log(formatter.format(remaining));
  console.log(
    "❌ textlint の自動修正できない指摘が残っています。手で直してください",
  );
  return Math.max(markdownlintCode, 1);
};

/** 対象の文書を textlint で検査し、addedLines があれば変更行の指摘だけを報告する */
const runTextlint = async (
  targets: string[],
  addedLines: Map<string, Set<number>>,
) => {
  // ブログ記事など、ディレクトリによってプロファイルを変える（docs-lint.config.json）
  const lintResults = await Promise.all(
    [...groupByTextlintProfile(targets, config)].map(
      async ([profile, paths]) => {
        const linter = await linterFor(profile);
        return linter.lintFiles(paths.map((path) => resolve(root, path)));
      },
    ),
  );
  const results = filterToAddedLines(
    lintResults.flat(),
    addedLines,
    (filePath) => relative(root, filePath),
  );
  const count = results.reduce((sum, { messages }) => sum + messages.length, 0);
  if (count === 0) {
    console.log("✅ textlint の指摘はありません");
    return 0;
  }

  const formatter = await loadLinterFormatter({ formatterName: "stylish" });
  console.log(formatter.format(results));
  console.log(
    all
      ? "❌ textlint の指摘があります"
      : "❌ 変更した行に textlint の指摘があります。文書全体を確認するには docs-lint --all <file>",
  );
  return 1;
};

/** 上限のある文書の本文の文字数を数え、上限を超えた文書を表示する（docs-lint.config.json の charLimit） */
const runCharLimit = async (targets: string[]) => {
  const limited = targets.filter(
    (path) => findCharLimit(path, config) !== undefined,
  );
  if (limited.length === 0) {
    return 0;
  }
  console.log(`文字数: 上限のある ${limited.length} 文書の本文を数えます`);
  const docs = await Promise.all(
    limited.map(async (path) => ({
      path,
      source: await readFile(resolve(root, path), "utf8"),
    })),
  );
  const oversized = findOversizedDocs(docs, config);
  if (oversized.length === 0) {
    console.log("✅ 本文の文字数は上限内です");
    return 0;
  }
  for (const doc of oversized) {
    console.error(`❌ ${formatOversizedDoc(doc)}`);
  }
  return 1;
};

const run = async () => {
  if (fix) {
    return runFix();
  }
  const { addedLines, base, targets } = all
    ? {
        addedLines: new Map<string, Set<number>>(),
        base: undefined,
        targets: files.length > 0 ? files : listAllDocs(),
      }
    : collectChanges();

  console.log(
    base === undefined
      ? `${targets.length} 文書の全行を検査します（.textlintignore と .markdownlint-cli2.jsonc の除外は除く）`
      : `比較元 ${base.slice(0, 12)} から変更した ${targets.length} 文書を検査します（textlint は追加・書き換えた行、markdownlint と文字数は文書全体）`,
  );
  if (targets.length === 0) {
    console.log("✅ 検査対象の文書がありません");
    return 0;
  }

  const textlintCode = await runTextlint(targets, addedLines);
  // 既存の違反は 0 件にしてあるため、文書全体に掛かるルール（見出しの重複など）も取りこぼさないよう全行を検査する
  const markdownlintCode = reportMarkdownlint(
    await runMarkdownlint({ fix: false, paths: targets, root }),
  );
  const charLimitCode = await runCharLimit(targets);
  return Math.max(textlintCode, markdownlintCode, charLimitCode);
};

exit(await run());
