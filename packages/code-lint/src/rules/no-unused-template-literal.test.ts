import { ruleTester } from "../test-utils/rule-tester.ts";
import { noUnusedTemplateLiteral } from "./no-unused-template-literal.ts";

ruleTester.run("no-unused-template-literal", noUnusedTemplateLiteral, {
  invalid: [
    {
      code: "const foo = `bar`;",
      errors: 1,
      name: "埋め込みの無いテンプレートは文字列リテラルに直す",
      output: 'const foo = "bar";',
    },
    {
      code: "graphql(`query Foo { x }`);",
      errors: 1,
      name: "関数の引数でも報告する",
      output: 'graphql("query Foo { x }");',
    },
  ],
  valid: [
    { code: "const foo = `bar\nbaz`;", name: "改行を含むものは許可する" },
    {
      code: 'const foo = `"bar"`;',
      name: "ダブルクォートを含むものは許可する",
    },
    {
      code: "const foo = `'bar'`;",
      name: "シングルクォートを含むものは許可する",
    },
    { code: "const foo = `$" + "{bar}`;", name: "埋め込み式があれば許可する" },
    { code: "const foo = gql`bar`;", name: "タグ付きテンプレートは対象外" },
  ],
});
