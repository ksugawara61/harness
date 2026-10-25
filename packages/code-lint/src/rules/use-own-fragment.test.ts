import { ruleTester } from "../test-utils/rule-tester.ts";
import { useOwnFragment } from "./use-own-fragment.ts";

const ITEM = "src/features/todo-page/features/todo-list/features/todo-item";
const LIST = "src/features/todo-page/features/todo-list";

ruleTester.run("use-own-fragment", useOwnFragment, {
  invalid: [
    {
      code: "import { TodoItemFragment } from './features/todo-item/graphqls/todo-item-fragment.ts'; const todo = readFragment(TodoItemFragment, masked);",
      errors: 1,
      filename: `${LIST}/service.ts`,
      name: "親が子のフィーチャーの fragment を読むと報告する",
    },
    {
      code: "import { TodoItemFragment } from '@/features/todo-page/features/todo-list/features/todo-item/graphqls/todo-item-fragment.ts'; readFragment(TodoItemFragment, masked);",
      errors: 1,
      filename: `${ITEM}/service.ts`,
      name: "自分の fragment でも、パスエイリアスで import すると報告する",
    },
    {
      code: "import { TodoItemFragment } from './fragment.ts'; readFragment(TodoItemFragment, masked);",
      errors: 1,
      filename: `${ITEM}/service.ts`,
      name: "graphqls/ の外のファイルの fragment を読むと報告する",
    },
    {
      code: "import { TodoItemFragment } from './graphqls/fragments/todo-item.ts'; readFragment(TodoItemFragment, masked);",
      errors: 1,
      filename: `${ITEM}/service.ts`,
      name: "graphqls/ の中のディレクトリの fragment を読むと報告する",
    },
    {
      code: "const TodoItemFragment = graphql(`fragment TodoItem on Todo { id }`); readFragment(TodoItemFragment, masked);",
      errors: 1,
      filename: `${ITEM}/service.ts`,
      name: "同じファイルで宣言した fragment を読むと報告する",
    },
    {
      code: "import * as fragments from './graphqls/todo-item-fragment.ts'; readFragment(fragments.TodoItemFragment, masked);",
      errors: 1,
      filename: `${ITEM}/service.ts`,
      name: "識別子でない fragment は、どこのものか判断できないため報告する",
    },
    {
      code: "import { TodoItemFragment } from './features/todo-item/graphqls/todo-item-fragment'; unmask(TodoItemFragment, masked);",
      errors: 1,
      filename: `${LIST}/service.ts`,
      name: "functions に挙げた関数を見る",
      options: [{ functions: ["unmask"] }],
    },
  ],
  valid: [
    {
      code: "import { TodoItemFragment } from './graphqls/todo-item-fragment.ts'; const todo = readFragment(TodoItemFragment, maskedTodo);",
      filename: `${ITEM}/service.ts`,
      name: "同じフィーチャーの graphqls/ の fragment は許可する",
    },
    {
      code: "import { TodoItemFragment } from './graphqls/todo-item-fragment'; readFragment(TodoItemFragment, maskedTodo);",
      filename: `${ITEM}/service.ts`,
      name: "拡張子を省いた import も許可する",
    },
    {
      code: "import { TodoItemFragment as Fragment } from './graphqls/todo-item-fragment.ts'; readFragment(Fragment, maskedTodo);",
      filename: `${ITEM}/service.ts`,
      name: "別名で import しても、同じフィーチャーの graphqls/ なら許可する",
    },
    {
      code: "import { TodoItemFragment } from './gql/todo-item-fragment.ts'; readFragment(TodoItemFragment, maskedTodo);",
      filename: `${ITEM}/service.ts`,
      name: "graphqlsDir でディレクトリの名前を変えられる",
      options: [{ graphqlsDir: "gql" }],
    },
    {
      code: "import { TodoItemFragment } from './features/todo-item/graphqls/todo-item-fragment.ts'; const masked = maskFragments([TodoItemFragment], todo);",
      filename: `${LIST}/mocks.ts`,
      name: "readFragment 以外（maskFragments など）は対象にしない",
    },
  ],
});
