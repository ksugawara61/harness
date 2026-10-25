import { ruleTester } from "../test-utils/rule-tester.ts";
import { useServiceFileName } from "./use-service-file-name.ts";

ruleTester.run("use-service-file-name", useServiceFileName, {
  invalid: [
    {
      code: "export const useService = () => { return {}; };",
      errors: 1,
      filename: "src/features/todo-add/use-service.ts",
      name: "use-service.ts での useService の宣言は報告する",
    },
    {
      code: "export function useService() { return {}; }",
      errors: 1,
      filename: "src/features/todo-add/use-service.ts",
      name: "use-service.ts での useService の関数宣言は報告する",
    },
    {
      code: "const useService = () => ({}); export const TodoAdd = () => { const s = useService(); return null; };",
      errors: 1,
      filename: "src/features/todo-add/index.tsx",
      name: "コンポーネントと同じファイルでの useService の宣言は報告する",
    },
    {
      code: "import { useService } from './use-service.ts';",
      errors: 1,
      filename: "src/features/todo-add/index.tsx",
      name: "use-service.ts からの useService の import は報告する",
    },
    {
      code: "import { useService } from './use-service';",
      errors: 1,
      filename: "src/features/todo-add/index.tsx",
      name: "拡張子を省いた use-service からの useService の import は報告する",
    },
    {
      code: "import { useService as useTodoAddService } from './hooks.ts';",
      errors: 1,
      filename: "src/features/todo-add/index.tsx",
      name: "別名で import しても service 以外のモジュールからなら報告する",
    },
  ],
  valid: [
    {
      code: "export const useService = () => { return {}; };",
      filename: "src/features/todo-add/service.ts",
      name: "service.ts での useService の宣言を許可する",
    },
    {
      code: "export function useService() { return {}; }",
      filename: "src/features/todo-add/service.tsx",
      name: "service.tsx での useService の関数宣言を許可する",
    },
    {
      code: "import { useService } from './service.ts';",
      filename: "src/features/todo-add/index.tsx",
      name: "service.ts からの useService の import を許可する",
    },
    {
      code: "import { useService } from './service';",
      filename: "src/features/todo-add/index.tsx",
      name: "拡張子を省いた service からの useService の import を許可する",
    },
    {
      code: "import { useQuery } from '@tanstack/react-query'; export const useTodos = () => useQuery(options);",
      filename: "src/features/todo-list/use-todos.ts",
      name: "useService 以外のフックの宣言と import は対象にしない",
    },
  ],
});
