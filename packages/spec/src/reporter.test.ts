import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { TestCase, Vitest } from "vitest/node";
import { defineSpec } from "./define-spec.ts";
import { SpecCoverageReporter } from "./reporter.ts";
import type { SpecCoverageReport } from "./spec-report-file.ts";

const spec = defineSpec("reporter", {
  collection: {
    when: "テストを実行する",
    yields: "隣接する仕様を網羅対象にする",
  },
});

const createTestCase = (moduleId: string): TestCase =>
  ({
    annotations: () => [],
    module: { moduleId },
    result: () => ({ state: "passed" }),
  }) as unknown as TestCase;

describe("SpecCoverageReporter", () => {
  it.each([
    {
      collectsSpec: true,
      expectedUncovered: ["reporter.collection"],
      mode: "full" as const,
      moduleFileName: "transform.test.ts",
      name: "多段ネストした子 feature の spec.ts を full の網羅対象にする",
    },
    {
      collectsSpec: true,
      expectedUncovered: ["reporter.collection"],
      mode: "related" as const,
      moduleFileName: "test.tsx",
      name: "多段ネストした子 feature の test.tsx に隣接する spec.ts を related の網羅対象にする",
    },
    {
      collectsSpec: false,
      expectedUncovered: [],
      mode: "related" as const,
      moduleFileName: "transform.test.ts",
      name: "多段ネストした子 feature の transform.test.ts に隣接する spec.ts を related の網羅対象にしない",
    },
  ])(
    "$name",
    async ({ collectsSpec, expectedUncovered, mode, moduleFileName }) => {
      const rootDir = mkdtempSync(join(tmpdir(), "spec-reporter-"));
      const featureDir = join(
        rootDir,
        "parent",
        "features",
        "child",
        "features",
        "grandchild",
      );
      const outputFile = join(rootDir, "spec-coverage.json");
      const specFile = join(featureDir, "spec.ts");
      mkdirSync(featureDir, { recursive: true });
      writeFileSync(specFile, "");

      const reporter = new SpecCoverageReporter({
        featuresDir: rootDir,
        mode,
        outputFile,
      });
      reporter.onInit({
        getRootProject: () => ({
          import: async () => ({ spec }),
        }),
      } as unknown as Vitest);
      reporter.onTestCaseResult(
        createTestCase(join(featureDir, moduleFileName)),
      );
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        await reporter.onTestRunEnd();
        const report = JSON.parse(
          readFileSync(outputFile, "utf8"),
        ) as SpecCoverageReport;

        expect(report.specFiles).toEqual(collectsSpec ? [specFile] : []);
        expect(report.uncovered).toEqual(expectedUncovered);
      } finally {
        consoleSpy.mockRestore();
        rmSync(rootDir, { force: true, recursive: true });
      }
    },
  );

  it("実行された test.tsx より下の階層にある子 feature の spec.ts を related の網羅対象にしない", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "spec-reporter-"));
    const parentDir = join(rootDir, "parent");
    const childDir = join(parentDir, "features", "child");
    const outputFile = join(rootDir, "spec-coverage.json");
    mkdirSync(childDir, { recursive: true });
    writeFileSync(join(childDir, "spec.ts"), "");

    const reporter = new SpecCoverageReporter({
      featuresDir: rootDir,
      mode: "related",
      outputFile,
    });
    reporter.onInit({
      getRootProject: () => ({
        import: async () => ({ spec }),
      }),
    } as unknown as Vitest);
    reporter.onTestCaseResult(createTestCase(join(parentDir, "test.tsx")));
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await reporter.onTestRunEnd();
      const report = JSON.parse(
        readFileSync(outputFile, "utf8"),
      ) as SpecCoverageReport;

      expect(report.specFiles).toEqual([]);
      expect(report.uncovered).toEqual([]);
    } finally {
      consoleSpy.mockRestore();
      rmSync(rootDir, { force: true, recursive: true });
    }
  });
});
