import { ruleTester } from "../test-utils/rule-tester.ts";
import { useMocksRecord } from "./use-mocks-record.ts";

ruleTester.run("use-mocks-record", useMocksRecord, {
  invalid: [
    {
      code: "export const TodoMocks = { Success: () => [handler] } satisfies Record<string, HttpHandler[]>;",
      errors: 1,
      name: "値がアロー関数のケースは報告する",
    },
    {
      code: "export const TodoMocks = { Success: function () { return [handler]; } } satisfies Record<string, HttpHandler[]>;",
      errors: 1,
      name: "値が関数式のケースは報告する",
    },
    {
      code: "export const TodoMocks = { Success() { return [handler]; } } satisfies Record<string, HttpHandler[]>;",
      errors: 1,
      name: "メソッド記法のケースは報告する",
    },
    {
      code: "export const TodoMocks = { Error: [handler], Success: (todos) => [handler(todos)] } satisfies Record<string, HttpHandler[]>;",
      errors: 1,
      name: "関数のケースだけを報告する",
    },
    {
      code: "export const TodoMocks = { Success: [handler] };",
      errors: 1,
      name: "satisfies で型を付けていない Record は報告する",
    },
    {
      code: "export const TodoMocks = { Success: [handler] } as const;",
      errors: 1,
      name: "as const だけで satisfies が無い Record は報告する",
    },
    {
      code: "export const TodoMocks: Record<string, HttpHandler[]> = { Success: [handler] };",
      errors: 1,
      name: "型注釈で型を付けた Record は報告する",
    },
    {
      code: "export const TodoMocks = { Success: [handler] } satisfies Record<Key, HttpHandler[]>;",
      errors: 1,
      name: "キーが string でない Record は報告する",
    },
    {
      code: "export const TodoMocks = { Success: [handler] } satisfies { Success: HttpHandler[] };",
      errors: 1,
      name: "Record でない型で satisfies したものは報告する",
    },
    {
      code: "export const TodoMocks = [handler] satisfies Record<string, HttpHandler>;",
      errors: 1,
      name: "オブジェクトリテラルでない値は報告する",
    },
    {
      code: "export const Todo = { Success: [handler] } satisfies Record<string, HttpHandler[]>;",
      errors: 1,
      name: "Mocks で終わらない変数名は報告する",
    },
    {
      code: "export const TodoMock = { Success: [handler] } satisfies Record<string, HttpHandler[]>;",
      errors: 1,
      name: "単数形の Mock で終わる変数名は報告する",
    },
    {
      code: "export const mockTodo = { id: '1' };",
      errors: 2,
      name: "Record でない素のデータの export は変数名と形の両方を報告する",
    },
    {
      code: "export const createTodoMocks = () => [handler];",
      errors: 1,
      name: "ファクトリ関数の export は報告する",
    },
    {
      code: "export function TodoMocks() { return [handler]; }",
      errors: 1,
      name: "関数宣言の export は報告する",
    },
    {
      code: "export { TodoQueryMocks } from './graphqls/todo-query/mocks';",
      errors: 1,
      name: "ほかのモジュールの Mocks の re-export は報告する",
    },
    {
      code: "export * from './handlers';",
      errors: 1,
      name: "export * は報告する",
    },
    {
      code: "export default { Success: [handler] } satisfies Record<string, HttpHandler[]>;",
      errors: 1,
      name: "default export は報告する",
    },
  ],
  valid: [
    {
      code: "export const TodoMocks = { Error: [errorHandler], Success: [handler] } satisfies Record<string, HttpHandler[]>;",
      name: "HttpHandler の配列の Record を許可する",
    },
    {
      code: "export const TodoQueryMocks = { Success: http.get('/api/todos', () => HttpResponse.json([])) } satisfies Record<string, HttpHandler>;",
      name: "値がハンドラを作る呼び出しなら、引数に関数があっても許可する",
    },
    {
      code: "export const TodoMocks = { Success: [handler] } as const satisfies Record<string, readonly HttpHandler[]>;",
      name: "as const を付けた Record を許可する",
    },
    {
      code: "export const TodoCardPropsMocks = { Default: { todo, onPress } } satisfies Record<string, ComponentProps<typeof TodoCard>>;",
      name: "Props のモックの Record を許可する",
    },
    {
      code: "const todos = [buildTodo()]; const failure = () => new HttpResponse(null, { status: 500 }); export const TodoMocks = { Error: [http.get(PATH, failure)], Success: createTodoHandlers(todos) } satisfies Record<string, HttpHandler[]>;",
      name: "export しない内部の値と関数は対象にしない",
    },
  ],
});
