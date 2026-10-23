import { describe, expect, it } from "vitest";
import { checkGraphql } from "./checks.ts";

const ruleIds = (source: string) =>
  checkGraphql(source).map((problem) => problem.ruleId);

describe("checkGraphql", () => {
  it.each([
    {
      expected: [
        "no-duplicate-argument-names",
        "no-duplicate-fields",
        "no-duplicate-fields",
      ],
      name: "フィールドの引数の重複は、引数のルールで 1 件、重複ごとに no-duplicate-fields で報告する",
      source: "query A { x(a: 1, a: 2, a: 3) }",
    },
    {
      expected: ["no-duplicate-argument-names"],
      name: "ディレクティブの引数の重複は引数のルールだけで報告する",
      source: "query A { x @include(if: true, if: false) }",
    },
    {
      expected: ["no-duplicate-input-field-names"],
      name: "入力オブジェクトの重複したフィールドを報告する",
      source: "query A { x(i: { p: 1, p: 2 }) }",
    },
    {
      expected: [
        "no-duplicate-variable-names",
        "no-duplicate-fields",
        "no-duplicate-fields",
      ],
      name: "重複した変数は操作ごとに 1 件、重複ごとにも 1 件報告する",
      source: "query A($v: Int, $v: Int, $v: Int) { x }",
    },
    {
      expected: [
        "use-lone-anonymous-operation",
        "use-lone-executable-definition",
      ],
      name: "無名の操作が複数あれば最初の 1 つだけ報告する",
      source: "{ x } { y } { z }",
    },
    {
      expected: [
        "use-lone-executable-definition",
        "no-duplicate-graphql-operation-name",
      ],
      name: "同じ名前の操作を報告する",
      source: "query A { x } query A { y }",
    },
    {
      expected: [
        "no-duplicate-field-definition-names",
        "use-deprecated-reason",
        "use-deprecated-date",
        "no-duplicate-enum-value-names",
      ],
      name: "型定義の重複と @deprecated の引数の不足を報告する",
      source: "type T { a: Int a: Int b: Int @deprecated }\nenum E { A A }",
    },
    {
      expected: [],
      name: "構文エラーのドキュメントは検査しない",
      source: "query A {",
    },
  ])("$name", ({ expected, source }) => {
    expect(ruleIds(source)).toEqual(expected);
  });
});
