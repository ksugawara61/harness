import { ruleTester } from "../test-utils/rule-tester.ts";
import { noDynamicNamespaceImportAccess } from "./no-dynamic-namespace-import-access.ts";

ruleTester.run(
  "no-dynamic-namespace-import-access",
  noDynamicNamespaceImportAccess,
  {
    invalid: [
      {
        code: "import * as ns from 'a'; ns[key];",
        errors: 1,
        name: "名前空間への動的なアクセスは報告する",
      },
    ],
    valid: [
      {
        code: "import * as ns from 'a'; ns.key;",
        name: "静的なアクセスは許可する",
      },
      {
        code: "import type * as ns from 'a'; type T = (typeof ns)['key'];",
        name: "型だけの import は対象外",
      },
    ],
  },
);
