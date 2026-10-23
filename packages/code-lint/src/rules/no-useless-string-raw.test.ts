import { ruleTester } from "../test-utils/rule-tester.ts";
import { noUselessStringRaw } from "./no-useless-string-raw.ts";

ruleTester.run("no-useless-string-raw", noUselessStringRaw, {
  invalid: [
    {
      code: "String.raw`abc`;",
      errors: 1,
      name: "エスケープを含まない String.raw は報告する",
    },
  ],
  valid: [
    { code: "String.raw`a\\\\nb`;", name: "エスケープを含めば許可する" },
    { code: "raw`abc`;", name: "String.raw 以外のタグは対象外" },
  ],
});
