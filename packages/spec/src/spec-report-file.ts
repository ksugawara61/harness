/**
 * SpecCoverageReporter が書き出す中間 JSON の型と書き出し
 *
 * 判定（exit 1）は後続の check-spec-coverage が担う。
 * この中間ファイルの型を変えると判定側の実装も壊れるため、スキーマはここで確定させる。
 */

import { writeFileSync } from "node:fs";

export type SpecCoverageReportMode = "full" | "related";

export type SpecCoverageReport = {
  mode: SpecCoverageReportMode;
  specFiles: string[];
  satisfied: string[];
  uncovered: string[];
  unknown: string[];
  /**
   * 仕様 ID → 仕様文（formatSpecCase の結果）
   *
   * 未網羅・不明の報告に仕様文を添えるために持つ。spec.ts に宣言されたケースだけを
   * 含むため、unknown な ID には対応する仕様文が無い。
   */
  sentences: Record<string, string>;
};

export const writeSpecReportFile = (
  outputFile: string,
  report: SpecCoverageReport,
): void => {
  writeFileSync(outputFile, JSON.stringify(report, null, 2));
};
