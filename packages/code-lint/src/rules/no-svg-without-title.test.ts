import { ruleTester } from "../test-utils/rule-tester.ts";
import { noSvgWithoutTitle } from "./no-svg-without-title.ts";

ruleTester.run("no-svg-without-title", noSvgWithoutTitle, {
  invalid: [
    {
      code: "const x = <svg><path /></svg>;",
      errors: 1,
      name: "title も aria-label も無い svg は報告する",
    },
    {
      code: 'const x = <svg role="img"><path /></svg>;',
      errors: 1,
      name: "img ロールの svg も報告する",
    },
  ],
  valid: [
    {
      code: "const x = <svg><title>アイコン</title><path /></svg>;",
      name: "title があれば許可する",
    },
    {
      code: 'const x = <svg aria-label="アイコン" />;',
      name: "aria-label があれば許可する",
    },
    {
      code: 'const x = <svg aria-hidden="true" />;',
      name: "aria-hidden の svg は対象外",
    },
    {
      code: 'const x = <svg role="presentation" />;',
      name: "名前の要らないロールは対象外",
    },
  ],
});
