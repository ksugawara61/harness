import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

RuleTester.describe = describe;
RuleTester.it = it;

/** TSX として解析する RuleTester。各ケースの name がテスト名になる */
export const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});
