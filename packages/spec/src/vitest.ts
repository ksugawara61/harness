/**
 * 仕様 ID と given / when / yields のフェーズを結び付ける vitest 用のテストラッパ
 *
 * `it` 名の生成（formatSpecCase）と `annotate` の呼び出しをラッパ側に閉じ込め、
 * 書き忘れ・typo を型で防ぐ。vitest に依存するため、ブラウザ向けのバンドルに vitest が
 * 混入しないようメインの `@ksugawara61/spec` からは export せず `@ksugawara61/spec/vitest`
 * サブパスから import する（`./reporter` と同じ事情）。
 */

import { it, type TestContext } from "vitest";
import {
  formatSpecCase,
  type Spec,
  type SpecCase,
  type SpecCases,
} from "./define-spec.ts";
import { SPEC_ANNOTATION_TYPE } from "./spec-annotation.ts";

/**
 * 1 フェーズの定義
 *
 * `desc` に `spec.ts` の仕様文をそのまま書き、`run` にそれを実装するコールバックを書く。
 * 仕様文が実装の真上に並ぶため、テストファイル単体で「何の振る舞いを確認しているか」が読める。
 * `desc` は `spec.ts` のリテラル型に固定されているため、食い違うと typecheck が失敗する。
 * キー名を `desc` にしているのは、oxlint の `code-lint/sort-keys` が並べ替えた辞書順で
 * 仕様文が `run` より前に来るようにするため。
 */
export type SpecItPhase<Desc extends string, Run> = {
  /** `spec.ts` に宣言した仕様文と同じ文字列 */
  desc: Desc;
  /** フェーズの実装 */
  run: Run;
};

/**
 * `spec.ts` が `given` を宣言しているケースでだけ `given` フェーズを必須にする
 *
 * 条件型の中からは型引数を推論できないため、`given` の戻り値の型（`Given`）は
 * `SpecItPhases` 側の省略可能なプロパティから推論し、ここでは「必須かどうか」と
 * 仕様文の一致だけを表す（`run` は推論結果をそのまま通すため `unknown`）。
 */
type GivenPhaseRequirement<Case extends SpecCase> = Case extends {
  given: string;
}
  ? { given: SpecItPhase<Case["given"], unknown> }
  : { given?: never };

type YieldsRunFn<When, Given> = (
  when: Awaited<When>,
  given: Awaited<Given>,
  ctx: TestContext,
) => void | Promise<void>;

/**
 * `yields` フェーズの型。`spec.ts` の `yields` が配列なら `SpecItPhase` の配列、
 * 単一 `string` なら従来どおり `SpecItPhase` 1 つを受け取る
 */
type MapYieldsToPhases<Yields extends readonly string[], RunFn> = {
  [I in keyof Yields]: SpecItPhase<Yields[I] & string, RunFn>;
};

type YieldsPhase<
  Case extends SpecCase,
  When,
  Given,
> = Case["yields"] extends readonly string[]
  ? MapYieldsToPhases<Case["yields"], YieldsRunFn<When, Given>>
  : SpecItPhase<Case["yields"] & string, YieldsRunFn<When, Given>>;

/**
 * 1 ケースのフェーズ定義（`given` の必須判定を除いた本体）
 *
 * フェーズ名は `SpecCase` の `given` / `when` / `yields` と揃えている。
 * 各フェーズの `run` は位置引数の末尾に vitest のテストコンテキストを受け取る
 * （`onTestFinished` などを使えるようにするため）。
 * `yields` が受け取れるのは `when` の結果と `given` の戻り値だけで、
 * `given` の途中の変数は型の上で参照できない。
 */
type SpecItPhaseBodies<Case extends SpecCase, Given, When> = {
  /** 前提。`spec.ts` が `given` を宣言しているケースでのみ書けて、宣言があれば必須になる */
  given?: SpecItPhase<Case["given"] & string, (ctx: TestContext) => Given>;
  /** 操作（1 ケースにつき 1 つ）。render 自体が `when` にあたるケースでは render を置く */
  when: SpecItPhase<
    Case["when"],
    (given: Awaited<Given>, ctx: TestContext) => When
  >;
  /** 観測できる結果（Gherkin の Then） */
  yields: YieldsPhase<Case, When, Given>;
};

/** 1 ケースのフェーズ定義。`spec.ts` が `given` を宣言していれば `given` フェーズも必須になる */
export type SpecItPhases<
  Case extends SpecCase,
  Given,
  When,
> = SpecItPhaseBodies<Case, Given, When> & GivenPhaseRequirement<Case>;

/**
 * `key` に対応するケースの仕様文
 *
 * `key` は `cases` に宣言したキーに型で絞られているが、`noUncheckedIndexedAccess` では
 * 型引数で添字アクセスした値にも `undefined` が付くため、`SpecCase` として受け直す。
 */
const sentenceOf = <Cases extends SpecCases>(
  spec: Spec<string, Cases>,
  key: keyof Cases & string,
): string => formatSpecCase(spec.cases[key] as SpecCase);

/**
 * `spec.ts` で宣言したケースを 1 件のテストとして登録する
 *
 * `it` 名は `formatSpecCase` が生成するため、仕様網羅レポートの仕様文と
 * テストレポートの `it` 名が常に一致する。各フェーズの `desc` は `spec.ts` の仕様文と
 * 一致することを型で要求するため、どちらか一方だけを書き換えると typecheck が失敗する。
 *
 * `spec.ts` が `given` を宣言していないケースでは `given` を書けず、`when` / `yields` が
 * 受け取る `given` は `undefined` 型になる
 * （型引数 `Given` の推論候補が無く、既定値の `undefined` が採用される）。
 */
const specItCase = <
  FeatureId extends string,
  Cases extends SpecCases,
  Key extends keyof Cases & string,
  Given = undefined,
  When = unknown,
>(
  spec: Spec<FeatureId, Cases>,
  key: Key,
  phases: SpecItPhases<Cases[Key], Given, When>,
): void => {
  // 交差した条件型は未解決のためプロパティが never に潰れる。本体側の型で受け直す
  const { given, when, yields } = phases as SpecItPhaseBodies<
    Cases[Key],
    Given,
    When
  >;

  it(sentenceOf(spec, key), async (ctx) => {
    await ctx.annotate(spec.caseId(key), SPEC_ANNOTATION_TYPE);
    // given 省略時は Given が undefined に解決されるため、呼び出し側の型と一致する
    const givenResult = (await given?.run(ctx)) as Awaited<Given>;
    const whenResult = await when.run(givenResult, ctx);
    const yieldsList = Array.isArray(yields) ? yields : [yields];
    for (const y of yieldsList) {
      await y.run(whenResult, givenResult, ctx);
    }
  });
};

/**
 * `specIt.each` の 1 行のデータ
 *
 * `name` は `it` 名を行ごとに区別するためのラベルで、`formatSpecCase` が生成する
 * 仕様文にそのまま添える（仕様網羅レポートの仕様文とテストレポートの `it` 名が
 * 乖離しないようにするため）。
 */
export type SpecItEachRow = { name: string };

type YieldsEachRunFn<Row extends SpecItEachRow, When, Given> = (
  row: Row,
  when: Awaited<When>,
  given: Awaited<Given>,
  ctx: TestContext,
) => void | Promise<void>;

/**
 * `specIt.each` 用の `yields` フェーズの型
 */
type YieldsEachPhase<
  Case extends SpecCase,
  Row extends SpecItEachRow,
  When,
  Given,
> = Case["yields"] extends readonly string[]
  ? MapYieldsToPhases<Case["yields"], YieldsEachRunFn<Row, When, Given>>
  : SpecItPhase<Case["yields"] & string, YieldsEachRunFn<Row, When, Given>>;

/**
 * `specIt.each` の 1 ケースのフェーズ定義（`given` の必須判定を除いた本体）
 *
 * `SpecItPhaseBodies` と同じ役割だが、各フェーズの `run` は先頭引数で行データ
 * `row` を受け取る。`given` の戻り値・`when` の結果・`TestContext` の並びは
 * `specIt` と揃えたまま、`row` をその手前に追加している。
 */
type SpecItEachPhaseBodies<
  Case extends SpecCase,
  Row extends SpecItEachRow,
  Given,
  When,
> = {
  /** 前提。`spec.ts` が `given` を宣言しているケースでのみ書けて、宣言があれば必須になる */
  given?: SpecItPhase<
    Case["given"] & string,
    (row: Row, ctx: TestContext) => Given
  >;
  /** 操作（1 ケースにつき 1 つ）。render 自体が `when` にあたるケースでは render を置く */
  when: SpecItPhase<
    Case["when"],
    (row: Row, given: Awaited<Given>, ctx: TestContext) => When
  >;
  /** 観測できる結果（Gherkin の Then） */
  yields: YieldsEachPhase<Case, Row, When, Given>;
};

/** `specIt.each` の 1 ケースのフェーズ定義。`spec.ts` が `given` を宣言していれば `given` フェーズも必須になる */
export type SpecItEachPhases<
  Case extends SpecCase,
  Row extends SpecItEachRow,
  Given,
  When,
> = SpecItEachPhaseBodies<Case, Row, Given, When> & GivenPhaseRequirement<Case>;

/**
 * `spec.ts` で宣言した 1 つのケースに、複数行のデータを流して複数の `it` として登録する
 *
 * `it.each` と同じくデータをテーブルで一覧できるようにしつつ、`specIt` と同じ型の恩恵
 * （`desc` と `spec.ts` の仕様文の一致を typecheck で強制、`it` 名と `annotate` の
 * 書き忘れ防止）を保つ。行ごとに `it` を登録し `annotate` を呼ぶため、`SpecCoverageReporter`
 * からは同一仕様 ID を複数のテストが網羅している状態になる（いずれか 1 つが pass すれば
 * 「網羅済み」と判定される、`specIt` と同じ集計ルール）。
 *
 * `it.each(cases)(name, fn)` と同じくカリー化し、`spec, key` を先に確定させてから
 * `rows, phases` を渡す形にしている。`Cases[Key]` は型引数が確定するまで未解決のままの
 * 条件型（`GivenPhaseRequirement`）なので、1 回の呼び出しに `phases` の `given.run` へ
 * 明示的な仮引数（`row`）を含めると、それだけで `Given` の推論が `phases` の型ではなく
 * 既定値 `undefined` に落ちる（TypeScript の型推論の制約）。`spec, key` を先に渡して
 * `Cases[Key]` を具体的な型へ解決してから `phases` を型検査すると、この問題を避けられる。
 */
export const specItEach = <
  FeatureId extends string,
  Cases extends SpecCases,
  Key extends keyof Cases & string,
>(
  spec: Spec<FeatureId, Cases>,
  key: Key,
) => {
  const baseSentence = sentenceOf(spec, key);

  return <Row extends SpecItEachRow, Given = undefined, When = unknown>(
    rows: readonly Row[],
    phases: SpecItEachPhases<Cases[Key], Row, Given, When>,
  ): void => {
    // 交差した条件型は未解決のためプロパティが never に潰れる。本体側の型で受け直す
    const { given, when, yields } = phases as SpecItEachPhaseBodies<
      Cases[Key],
      Row,
      Given,
      When
    >;

    for (const row of rows) {
      it(`${baseSentence} / ${row.name}`, async (ctx) => {
        await ctx.annotate(spec.caseId(key), SPEC_ANNOTATION_TYPE);
        // given 省略時は Given が undefined に解決されるため、呼び出し側の型と一致する
        const givenResult = (await given?.run(row, ctx)) as Awaited<Given>;
        const whenResult = await when.run(row, givenResult, ctx);
        const yieldsList = Array.isArray(yields) ? yields : [yields];
        for (const y of yieldsList) {
          await y.run(row, whenResult, givenResult, ctx);
        }
      });
    }
  };
};

export const specIt = Object.assign(specItCase, { each: specItEach });
