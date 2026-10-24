/**
 * spec.ts の宣言とテスト内の annotate() 呼び出しを突き合わせて仕様網羅を集計する vitest custom reporter
 *
 * 集計と中間 JSON の書き出しまでを担い、判定（exit 1）は行わない。
 * ブラウザ向けのバンドル（Storybook など）に vitest が混入しないよう、メインの `@ksugawara61/spec` からは export せず
 * `@ksugawara61/spec/reporter` サブパスから import する。
 */

import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Reporter, TestCase, TestProject, Vitest } from "vitest/node";
import { formatSpecCase, type Spec, type SpecCases } from "./define-spec.ts";
import { SPEC_ANNOTATION_TYPE } from "./spec-annotation.ts";
import {
  type SpecCoverageReport,
  type SpecCoverageReportMode,
  writeSpecReportFile,
} from "./spec-report-file.ts";

export type SpecCoverageReporterOptions = {
  mode: SpecCoverageReportMode;
  /** spec.ts を探索するディレクトリ（mode: "full" で使用） */
  featuresDir: string;
  /** 中間 JSON の書き出し先 */
  outputFile: string;
};

type CollectedAnnotation = {
  specId: string;
  passed: boolean;
};

const SPEC_FILE_NAME = "spec.ts";
const SPEC_TEST_FILE_NAMES = new Set(["test.ts", "test.tsx"]);

const isSpec = (value: unknown): value is Spec<string, SpecCases> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { featureId?: unknown }).featureId === "string" &&
  typeof (value as { cases?: unknown }).cases === "object";

const listSpecFiles = (rootDir: string): string[] => {
  if (!existsSync(rootDir)) return [];
  const entries = readdirSync(rootDir, { recursive: true }) as string[];
  return entries
    .filter((entry) => basename(entry) === SPEC_FILE_NAME)
    .map((entry) => join(rootDir, entry));
};

/** test.ts(x) に隣接する spec.ts（無ければ空配列） */
const listAdjacentSpecFile = (dir: string): string[] => {
  const specFile = join(dir, SPEC_FILE_NAME);
  return existsSync(specFile) ? [specFile] : [];
};

/** spec.ts の各宣言を [仕様 ID, 仕様文] のペアに展開する */
const collectDeclaredSpecCases = (
  moduleExports: Record<string, unknown>,
): [string, string][] =>
  Object.values(moduleExports)
    .filter(isSpec)
    .flatMap((spec) =>
      Object.entries(spec.cases).map(([key, specCase]): [string, string] => [
        spec.caseId(key),
        formatSpecCase(specCase),
      ]),
    );

export class SpecCoverageReporter implements Reporter {
  private readonly mode: SpecCoverageReportMode;
  private readonly featuresDir: string;
  private readonly outputFile: string;
  private project: TestProject | undefined;
  private readonly annotations: CollectedAnnotation[] = [];
  private readonly executedModuleDirs = new Set<string>();

  constructor(options: SpecCoverageReporterOptions) {
    this.mode = options.mode;
    this.featuresDir = options.featuresDir;
    this.outputFile = options.outputFile;
  }

  onInit(vitest: Vitest): void {
    this.project = vitest.getRootProject();
  }

  onTestCaseResult(testCase: TestCase): void {
    const moduleId = testCase.module.moduleId;
    if (SPEC_TEST_FILE_NAMES.has(basename(moduleId))) {
      this.executedModuleDirs.add(dirname(moduleId));
    }

    const passed = testCase.result().state === "passed";
    for (const annotation of testCase.annotations()) {
      if (annotation.type !== SPEC_ANNOTATION_TYPE) continue;
      this.annotations.push({ passed, specId: annotation.message });
    }
  }

  async onTestRunEnd(): Promise<void> {
    const project = this.project;
    if (project === undefined) return;

    const specFiles = this.resolveTargetSpecFiles();
    const declaredSpecCaseLists = await Promise.all(
      specFiles.map(async (specFile) =>
        collectDeclaredSpecCases(
          await project.import<Record<string, unknown>>(specFile),
        ),
      ),
    );
    const declaredSentences = new Map(declaredSpecCaseLists.flat());
    const declaredSpecIds = new Set(declaredSentences.keys());

    const annotatedIds = new Set(
      this.annotations.map((annotation) => annotation.specId),
    );
    const passedAnnotatedIds = new Set(
      this.annotations
        .filter((annotation) => annotation.passed)
        .map((annotation) => annotation.specId),
    );

    const report: SpecCoverageReport = {
      mode: this.mode,
      satisfied: [...declaredSpecIds]
        .filter((id) => passedAnnotatedIds.has(id))
        .sort(),
      sentences: Object.fromEntries(
        [...declaredSentences].sort(([a], [b]) => a.localeCompare(b)),
      ),
      specFiles: specFiles.sort(),
      uncovered: [...declaredSpecIds]
        .filter((id) => !passedAnnotatedIds.has(id))
        .sort(),
      unknown: [...annotatedIds]
        .filter((id) => !declaredSpecIds.has(id))
        .sort(),
    };

    writeSpecReportFile(this.outputFile, report);
    printReport(report);
  }

  /**
   * full は featuresDir 配下の spec.ts をすべて、related は実行された test.ts(x) に
   * 隣接する spec.ts だけを対象にする。related で再帰的に探すと、テストが実行されて
   * いない入れ子 feature の spec.ts まで未網羅として数えてしまう。
   */
  private resolveTargetSpecFiles(): string[] {
    if (this.mode === "full") return listSpecFiles(this.featuresDir);
    return [
      ...new Set([...this.executedModuleDirs].flatMap(listAdjacentSpecFile)),
    ];
  }
}

/** 仕様 ID の行。宣言された仕様文があれば添える（unknown な ID には無い） */
const specLineOf = (
  specId: string,
  sentences: Record<string, string>,
): string => {
  const sentence = sentences[specId];
  return sentence === undefined
    ? `  - ${specId}`
    : `  - ${specId}: ${sentence}`;
};

const printReport = (report: SpecCoverageReport): void => {
  console.log("\n📋 Spec Coverage Report");
  console.log("=".repeat(50));
  console.log(`Mode:       ${report.mode}`);
  console.log(`Spec files: ${report.specFiles.length}`);
  console.log(`Satisfied:  ${report.satisfied.length}`);
  console.log(`Uncovered:  ${report.uncovered.length}`);
  console.log(`Unknown:    ${report.unknown.length}`);

  if (report.uncovered.length > 0) {
    console.log("\n❌ Uncovered spec cases:");
    for (const id of report.uncovered) {
      console.log(specLineOf(id, report.sentences));
    }
  }

  if (report.unknown.length > 0) {
    console.log(
      "\n⚠️  Unknown annotated spec ids (not declared in any spec.ts):",
    );
    for (const id of report.unknown) {
      console.log(specLineOf(id, report.sentences));
    }
  }

  if (report.uncovered.length === 0 && report.unknown.length === 0) {
    console.log("\n✅ All declared spec cases are covered!");
  }

  console.log("");
};
