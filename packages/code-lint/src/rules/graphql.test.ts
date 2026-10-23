import { ruleTester } from "../test-utils/rule-tester.ts";
import { graphqlRules } from "./graphql.ts";

const {
  "graphql-no-duplicate-fields": noDuplicateFields,
  "graphql-use-lone-executable-definition": useLoneExecutableDefinition,
  "graphql-use-named-operations": useNamedOperations,
} = graphqlRules;

ruleTester.run("graphql-no-duplicate-fields", noDuplicateFields, {
  invalid: [
    {
      code: "graphql(`query A { x { id id } }`);",
      errors: 1,
      name: "graphql() の中の重複したフィールドを報告する",
    },
    {
      code: "gql`query A($a: Int, $a: Int) { x }`;",
      errors: 1,
      name: "タグ付きテンプレートの重複した変数も報告する",
    },
  ],
  valid: [
    {
      code: "graphql(`query A { x { id } y: x { id } }`);",
      name: "別名を付ければ許可する",
    },
    {
      code: "foo(`query A { x { id id } }`);",
      name: "graphql 以外の関数の引数は対象外",
    },
    {
      code: "graphql(`query A { $" + "{field} }`);",
      name: "埋め込み式を含むテンプレートは対象外",
    },
  ],
});

ruleTester.run(
  "graphql-use-lone-executable-definition",
  useLoneExecutableDefinition,
  {
    invalid: [
      {
        code: "graphql(`query A { x } query B { y } query C { z }`);",
        errors: 1,
        name: "1 つのテンプレートに複数の定義があれば 1 件報告する",
      },
    ],
    valid: [
      {
        code: "graphql(`query A { x }`); graphql(`query B { y }`);",
        name: "テンプレートごとに 1 つなら許可する",
      },
    ],
  },
);

ruleTester.run("graphql-use-named-operations", useNamedOperations, {
  invalid: [
    {
      code: "graphql(`query { x }`);",
      errors: 1,
      name: "名前の無い query は報告する",
    },
  ],
  valid: [{ code: "graphql(`{ x }`);", name: "省略形の query は対象外" }],
});
