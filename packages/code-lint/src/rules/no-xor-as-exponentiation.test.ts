import { ruleTester } from "../test-utils/rule-tester.ts";
import { noXorAsExponentiation } from "./no-xor-as-exponentiation.ts";

ruleTester.run("no-xor-as-exponentiation", noXorAsExponentiation, {
  invalid: [
    {
      code: "const x = 2 ^ 10;",
      errors: 1,
      name: "整数リテラル同士の ^ は報告する",
    },
  ],
  valid: [
    { code: "const x = a ^ 2;", name: "変数との ^ は許可する" },
    { code: "const x = 0xff ^ 0x0f;", name: "16 進のビットマスクは許可する" },
  ],
});
