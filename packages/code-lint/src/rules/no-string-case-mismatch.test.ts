import { ruleTester } from "../test-utils/rule-tester.ts";
import { noStringCaseMismatch } from "./no-string-case-mismatch.ts";

ruleTester.run("no-string-case-mismatch", noStringCaseMismatch, {
  invalid: [
    {
      code: "s.toLowerCase() === 'Abc';",
      errors: 1,
      name: "小文字にした値と大文字を含む文字列の比較は報告する",
    },
    {
      code: "'ABc' == s.toUpperCase();",
      errors: 1,
      name: "大文字にした値と小文字を含む文字列の比較も報告する",
    },
    {
      code: "switch (s.toUpperCase()) { case 'a': break; case 'B': break; }",
      errors: 1,
      name: "switch の case も検査する",
    },
  ],
  valid: [
    {
      code: "s.toLowerCase() === 'abc';",
      name: "大文字小文字が合っていれば許可する",
    },
    { code: "s.toLowerCase() !== 'Abc';", name: "!== は対象外" },
  ],
});
