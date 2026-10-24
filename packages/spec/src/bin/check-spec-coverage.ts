#!/usr/bin/env node
// SpecCoverageReporter が書き出した中間 JSON（<project-path>/coverage/spec-coverage.json）を読み、
// 未網羅・不明な仕様 ID があれば exit 1 する。
// 使い方: check-spec-coverage <project-path>...
import {
  evaluateSpecReport,
  readSpecReport,
  type SpecCoverageCheckReport,
} from "../check.ts";

const projectPaths = process.argv.slice(2);

if (projectPaths.length === 0) {
  console.error("Usage: check-spec-coverage <project-path> [project-path ...]");
  process.exit(1);
}

let hasViolation = false;
let totalSpecFiles = 0;
let totalSatisfied = 0;

for (const projectPath of projectPaths) {
  let report: SpecCoverageCheckReport;
  try {
    report = readSpecReport(projectPath);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  totalSpecFiles += report.specFiles.length;
  totalSatisfied += report.satisfied.length;

  console.log(`\n📋 Spec Coverage: ${projectPath}`);
  console.log("=".repeat(50));
  console.log(`Mode:       ${report.mode}`);
  console.log(`Spec files: ${report.specFiles.length}`);
  console.log(`Satisfied:  ${report.satisfied.length}`);

  const violationLines = evaluateSpecReport(report);
  if (violationLines.length > 0) {
    hasViolation = true;
    console.log("");
    for (const line of violationLines) {
      console.log(line);
    }
  }
}

if (hasViolation) {
  console.log("");
  process.exit(1);
}

console.log(
  `\n✅ All spec cases are covered! (spec files: ${totalSpecFiles}, satisfied: ${totalSatisfied})\n`,
);
