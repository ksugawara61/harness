import { ruleTester } from "../test-utils/rule-tester.ts";
import { sortJsxAttributes } from "./sort-jsx-attributes.ts";

ruleTester.run("sort-jsx-attributes", sortJsxAttributes, {
  invalid: [
    {
      code: '<Hello lastName="Smith" firstName="John" />;',
      errors: 1,
      name: "並んでいない属性を並べ替える",
      output: '<Hello firstName="John" lastName="Smith" />;',
    },
    {
      code: "<Hello b a {...props} d c />;",
      errors: 1,
      name: "spread 属性の前後で別々に並べ替える",
      output: "<Hello a b {...props} c d />;",
    },
  ],
  valid: [
    { code: "<Hello a b c />;", name: "並んでいれば許可する" },
    {
      code: "<Hello b {...props} a />;",
      name: "spread をまたぐ並びは問わない",
    },
  ],
});
