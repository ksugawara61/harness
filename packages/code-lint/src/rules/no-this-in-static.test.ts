import { ruleTester } from "../test-utils/rule-tester.ts";
import { noThisInStatic } from "./no-this-in-static.ts";

ruleTester.run("no-this-in-static", noThisInStatic, {
  invalid: [
    {
      code: "class A { static f() { return this.x; } }",
      errors: 1,
      name: "static メソッドの this は報告する",
    },
    {
      code: "class A extends B { static f() { return super.f(); } }",
      errors: 1,
      name: "static メソッドの super も報告する",
    },
    {
      code: "class A { static x = this.y; }",
      errors: 1,
      name: "static プロパティの this も報告する",
    },
    {
      code: "class A { static { this.x = 1; } }",
      errors: 1,
      name: "静的ブロックの this も報告する",
    },
    {
      code: "class A { static f() { return () => this; } }",
      errors: 1,
      name: "アロー関数の中の this も static の文脈とみなす",
    },
  ],
  valid: [
    {
      code: "class A { f() { return this.x; } }",
      name: "static でないメソッドは許可する",
    },
    {
      code: "class A { static f() { return new this(); } }",
      name: "new this() は許可する",
    },
    {
      code: "class A { static f() { return function () { return this; }; } }",
      name: "通常の関数の中の this は対象外",
    },
  ],
});
