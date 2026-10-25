import { ruleTester } from "../test-utils/rule-tester.ts";
import { useGraphqlOperationFile } from "./use-graphql-operation-file.ts";

const DIR = "src/features/todo-page/features/todo-list/graphqls";

const fragment =
  "export const TodoItemFragment = graphql(`fragment TodoItem on Todo { id }`);";

ruleTester.run("use-graphql-operation-file", useGraphqlOperationFile, {
  invalid: [
    {
      code: "export const TodoFragment = graphql(`fragment TodoItem on Todo { id }`);",
      errors: 1,
      filename: `${DIR}/todo-item-fragment.ts`,
      name: "export の名前がファイル名の PascalCase でなければ報告する",
    },
    {
      code: "export const TodosFragment = graphql(`query Todos { todos { id } }`);",
      errors: 1,
      filename: `${DIR}/todos-fragment.ts`,
      name: "ファイル名の接尾辞と操作の種類が食い違えば報告する",
    },
    {
      code: "export const Todos = graphql(`query Todos { todos { id } }`);",
      errors: 1,
      filename: `${DIR}/todos.ts`,
      name: "ファイル名が操作の種類で終わらなければ報告する",
    },
    {
      code: `${fragment} export const OtherFragment = graphql(\`fragment Other on Todo { id }\`);`,
      errors: 1,
      filename: `${DIR}/todo-item-fragment.ts`,
      name: "2 つ目の export は報告する",
    },
    {
      code: `${fragment} export const toTodo = (todo) => todo;`,
      errors: 1,
      filename: `${DIR}/todo-item-fragment.ts`,
      name: "操作でない値の export は報告する",
    },
    {
      code: "export const TodosQuery = queryOptions({ queryKey: ['todos'] });",
      errors: 1,
      filename: `${DIR}/todos-query.ts`,
      name: "graphql() で書いていない export は報告する",
    },
    {
      code: "export default graphql(`query Todos { todos { id } }`);",
      errors: 2,
      filename: `${DIR}/todos-query.ts`,
      name: "default export は報告する（名前付きの export も無いため 2 件）",
    },
    {
      code: "const TodosQuery = graphql(`query Todos { todos { id } }`); export { TodosQuery };",
      errors: 2,
      filename: `${DIR}/todos-query.ts`,
      name: "宣言と分けた export は報告する（名前付きの宣言の export も無いため 2 件）",
    },
  ],
  valid: [
    {
      code: fragment,
      filename: `${DIR}/todo-item-fragment.ts`,
      name: "fragment を -fragment のファイルから同じ名前で export する",
    },
    {
      code: "import { TodoItemFragment } from '../features/todo-item/graphqls/todo-item-fragment.ts'; export const TodosQuery = graphql(`query Todos { todos { id ...TodoItem } }`, [TodoItemFragment]);",
      filename: `${DIR}/todos-query.ts`,
      name: "fragment を取り込む query を -query のファイルから export する",
    },
    {
      code: "export const CreateTodoMutation = graphql(`mutation CreateTodo($title: String!) { createTodo(title: $title) { id } }`);",
      filename: `${DIR}/create-todo-mutation.ts`,
      name: "mutation を -mutation のファイルから export する",
    },
    {
      code: "export const TodosQuery = graphql(`query Todos { todos { id `);",
      filename: `${DIR}/todos-query.ts`,
      name: "GraphQL の構文の誤りは見ない（graphql-* のルールが報告する）",
    },
    {
      code: `${fragment} export type TodoItem = ResultOf<typeof TodoItemFragment>;`,
      filename: `${DIR}/todo-item-fragment.ts`,
      name: "型の export は数えない",
    },
  ],
});
