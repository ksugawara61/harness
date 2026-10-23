import { ruleTester } from "../test-utils/rule-tester.ts";
import { noUnsafeIframeSandbox } from "./no-unsafe-iframe-sandbox.ts";

ruleTester.run("no-unsafe-iframe-sandbox", noUnsafeIframeSandbox, {
  invalid: [
    {
      code: '<iframe sandbox="allow-scripts allow-same-origin" />;',
      errors: 1,
      name: "allow-scripts と allow-same-origin の組み合わせは報告する",
    },
  ],
  valid: [
    {
      code: '<iframe sandbox="allow-scripts" />;',
      name: "片方だけなら許可する",
    },
    { code: "<iframe />;", name: "sandbox が無いことは対象外" },
  ],
});
