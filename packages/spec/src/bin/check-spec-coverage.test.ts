import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(
  new URL("./check-spec-coverage.ts", import.meta.url),
);

const runCheck = (projectPath: string) =>
  spawnSync(process.execPath, [scriptPath, projectPath], {
    encoding: "utf8",
  });

const writeReport = (projectDir: string, overrides: object) => {
  const coverageDir = join(projectDir, "coverage");
  mkdirSync(coverageDir, { recursive: true });
  writeFileSync(
    join(coverageDir, "spec-coverage.json"),
    JSON.stringify({
      mode: "full",
      satisfied: [],
      specFiles: ["src/features/todo-add/spec.ts"],
      uncovered: [],
      unknown: [],
      ...overrides,
    }),
  );
};

describe("check-spec-coverage", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "check-spec-coverage-test-"));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  it("違反がなければ exit 0 になりサマリを出力する", () => {
    writeReport(dir, { satisfied: ["todo-add.render.form"] });

    const result = runCheck(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/All spec cases are covered/);
  });

  it("未網羅の仕様があれば exit 1 になり feature ごとに ID を出力する", () => {
    writeReport(dir, { uncovered: ["todo-add.render.form"] });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/未網羅/);
    expect(result.stdout).toMatch(/todo-add:/);
    expect(result.stdout).toMatch(/todo-add\.render\.form/);
  });

  it("未網羅の仕様に仕様文があれば仕様 ID に添えて出力する", () => {
    writeReport(dir, {
      sentences: {
        "todo-add.render.form":
          "When 追加画面を開く / Then 入力フォームが表示される",
      },
      uncovered: ["todo-add.render.form"],
    });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(
      /todo-add\.render\.form: When 追加画面を開く \/ Then 入力フォームが表示される/,
    );
  });

  it("不明な仕様 ID があれば exit 1 になり feature ごとに ID を出力する", () => {
    writeReport(dir, { unknown: ["todo-add.unknown-case"] });

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/不明な仕様 ID/);
    expect(result.stdout).toMatch(/todo-add:/);
    expect(result.stdout).toMatch(/todo-add\.unknown-case/);
  });

  it("中間 JSON が無ければ reporter 未実行と分かるメッセージで exit 1 になる", () => {
    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/coverage[/\\]spec-coverage\.json/);
    expect(result.stderr).toMatch(/reporter/i);
  });

  it("プロジェクトのパスを渡さなければ使い方を出力して exit 1 になる", () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Usage: check-spec-coverage/);
  });
});
