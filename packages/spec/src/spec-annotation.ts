/**
 * 仕様 ID を対応付ける annotate() の種別
 *
 * 呼び出し側（`./vitest.ts` の specIt）と集計側（`./reporter.ts`）の契約なので、
 * どちらからも import できる node 非依存のこのファイルで 1 箇所だけ定義する。
 */
export const SPEC_ANNOTATION_TYPE = "spec";
