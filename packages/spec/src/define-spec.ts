/**
 * 1 ケースの仕様。Gherkin の Given / When / Then に対応する
 *
 * Then に対応するキーだけ `yields` という名前にしている。oxlint の
 * `code-lint/sort-keys` がオブジェクトのキーを辞書順に並べ替えるため、`then` のままだと
 * `given` / `then` / `when` の順に並んで Gherkin の読み順にならない。
 * `given` < `when` < `yields` なら辞書順がそのまま読み順になる。
 * 表示上の語彙は Gherkin のまま（`formatSpecCase` は `Then …` を出力する）。
 */
export type SpecCase = {
  /** 前提。前提を持たないケースでは省略できる */
  given?: string;
  /** 操作（1 ケースにつき 1 つ） */
  when: string;
  /** 観測できる結果（Gherkin の Then）。複数の結果は配列で宣言する */
  yields: string | readonly string[];
};

export type SpecCases = Record<string, SpecCase>;

export type Spec<FeatureId extends string, Cases extends SpecCases> = {
  featureId: FeatureId;
  cases: Cases;
  caseId: <Key extends keyof Cases & string>(key: Key) => `${FeatureId}.${Key}`;
};

/**
 * フィーチャー単位の仕様を宣言する
 *
 * `Cases` を `const` 型引数にして仕様文をリテラル型のまま保つ。`specIt` はこの
 * リテラル型と `test.tsx` に書いた仕様文の一致を型で要求するため、食い違うと
 * typecheck が失敗する。
 */
export const defineSpec = <
  FeatureId extends string,
  const Cases extends SpecCases,
>(
  featureId: FeatureId,
  cases: Cases,
): Spec<FeatureId, Cases> => ({
  caseId: (key) => `${featureId}.${key}`,
  cases,
  featureId,
});

/**
 * 仕様ケースを 1 行の仕様文に整形する
 *
 * 未網羅・不明の仕様を報告するときに仕様 ID へ添えるため、表示側（reporter /
 * check-spec-coverage）から切り離した純粋関数にしている。
 */
export const formatSpecCase = ({ given, when, yields }: SpecCase): string => {
  const yieldsList = typeof yields === "string" ? [yields] : yields;
  return [
    ...(given === undefined ? [] : [`Given ${given}`]),
    `When ${when}`,
    ...yieldsList.map((y, i) => `${i === 0 ? "Then" : "And"} ${y}`),
  ].join(" / ");
};
