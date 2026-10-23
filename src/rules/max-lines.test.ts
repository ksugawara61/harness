import { ruleTester } from "../test-utils/rule-tester.ts";
import { maxLines } from "./max-lines.ts";

/** 上限 1 で数え、メッセージに出る行数を確かめる */
const counted = (
  code: string,
  count: number,
  name: string,
  skipBlankLines = false,
) => ({
  code,
  errors: [
    {
      message: `This file has too many lines (${count}). Maximum allowed is 1.`,
    },
  ],
  name,
  options: [{ maxLines: 1, skipBlankLines }],
});

ruleTester.run("max-lines", maxLines, {
  invalid: [
    counted("a;\nb;\nc;", 3, "トークンの手前の改行を 1 行として数える"),
    counted("a;\n\n\nb;", 4, "空行も数える"),
    counted("a;\n\n\nb;", 2, "skipBlankLines なら空行を数えない", true),
    counted("a;\n// x\n// y\nb;", 2, "コメントだけの行は数えない", true),
    counted(
      "a;\n/*\n x\n y\n*/\nb;",
      2,
      "ブロックコメントの中の改行は数えない",
      true,
    ),
    counted(
      "const s = `x\ny\nz`;\nb;",
      2,
      "複数行にまたがる 1 つのトークンの 2 行目以降は数えない",
    ),
    {
      code: "graphql(`\n  query A {\n    x\n  }\n`);",
      errors: [
        {
          message: "This file has too many lines (4). Maximum allowed is 1.",
        },
      ],
      name: "埋め込み GraphQL は JS とは別のドキュメントとして数える",
      options: [{ maxLines: 1, skipBlankLines: true }],
    },
  ],
  valid: [
    {
      code: "a;\nb;",
      name: "上限以内なら許可する",
      options: [{ maxLines: 2 }],
    },
    { code: "a;", name: "既定の上限は 300 行" },
  ],
});
