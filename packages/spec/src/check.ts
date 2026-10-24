/**
 * SpecCoverageReporter が書き出した中間 JSON を判定する
 *
 * reporter 内で throw しても vitest の run を落とせない（未定義動作）ため、
 * 集計は reporter が、判定と exit 1 は check-spec-coverage（`./bin/check-spec-coverage.ts`）が担う。
 *
 * 中間 JSON は `<project-path>/coverage/spec-coverage.json` に置く規約とする
 * （vitest の coverage 出力と同じ `coverage/` 配下）。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SpecCoverageReport } from "./spec-report-file.ts";

/**
 * 判定に使う中間 JSON の形。`sentences` を持たない古い reporter の出力も読めるよう省略可能にする
 */
export type SpecCoverageCheckReport = Omit<SpecCoverageReport, "sentences"> & {
  sentences?: SpecCoverageReport["sentences"];
};

const REPORT_RELATIVE_PATH = join("coverage", "spec-coverage.json");

const specReportPathFor = (projectPath: string): string =>
  join(projectPath, REPORT_RELATIVE_PATH);

/** 中間 JSON を読む。無ければ reporter が実行されていないと分かるエラーを投げる */
export const readSpecReport = (
  projectPath: string,
): SpecCoverageCheckReport => {
  const reportPath = specReportPathFor(projectPath);
  if (!existsSync(reportPath)) {
    throw new Error(
      `${reportPath} が見つかりません。先に vitest（SpecCoverageReporter）を実行してください。`,
    );
  }
  return JSON.parse(
    readFileSync(reportPath, "utf8"),
  ) as SpecCoverageCheckReport;
};

const featureIdOf = (specId: string): string => specId.split(".")[0] ?? "";

/** 仕様 ID の配列を featureId（caseId の先頭セグメント）ごとにまとめる */
const groupByFeature = (specIds: string[]): Map<string, string[]> =>
  specIds.reduce((grouped, specId) => {
    const featureId = featureIdOf(specId);
    grouped.set(featureId, [...(grouped.get(featureId) ?? []), specId]);
    return grouped;
  }, new Map<string, string[]>());

/**
 * 仕様 ID の行。中間 JSON に仕様文（sentences）があれば添える。
 * spec.ts に宣言の無い ID（unknown）には仕様文が無いため ID だけになる。
 */
const specLineOf = (
  specId: string,
  sentences: Record<string, string>,
): string => {
  const sentence = sentences[specId];
  return sentence === undefined
    ? `    - ${specId}`
    : `    - ${specId}: ${sentence}`;
};

/** 違反の見出しと、フィーチャごとにまとめた仕様 ID の行を返す */
const violationLinesOf = (
  heading: string,
  specIds: string[],
  sentences: Record<string, string>,
): string[] => [
  heading,
  ...[...groupByFeature(specIds)].flatMap(([featureId, ids]) => [
    `  ${featureId}:`,
    ...ids.map((specId) => specLineOf(specId, sentences)),
  ]),
];

/**
 * レポートを判定し、違反があれば説明付きの行を返す（空配列なら違反なし）。
 * フィーチャ（featureId）ごとにまとめ、何をすれば直るかが分かる文面にする。
 */
export const evaluateSpecReport = (
  report: SpecCoverageCheckReport,
): string[] => {
  const sentences = report.sentences ?? {};

  return [
    ...(report.uncovered.length > 0
      ? violationLinesOf(
          "❌ 未網羅の仕様があります（テストを書いて annotate() で対応付けてください）:",
          report.uncovered,
          sentences,
        )
      : []),
    ...(report.unknown.length > 0
      ? violationLinesOf(
          "❌ 不明な仕様 ID があります（spec.ts に宣言するか annotate() の ID を直してください）:",
          report.unknown,
          sentences,
        )
      : []),
  ];
};
