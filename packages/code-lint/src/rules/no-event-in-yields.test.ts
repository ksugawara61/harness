import { ruleTester } from "../test-utils/rule-tester.ts";
import { noEventInYields } from "./no-event-in-yields.ts";

const specIt = (phases: string) => `specIt(spec, "key", { ${phases} });`;

ruleTester.run("no-event-in-yields", noEventInYields, {
  invalid: [
    {
      code: specIt("yields: { run: () => { fireEvent.click(a); } }"),
      errors: 1,
      name: "yields の fireEvent.* は報告する",
    },
    {
      code: specIt("yields: { run: () => { fireEvent(a, e); } }"),
      errors: 1,
      name: "yields の fireEvent() は報告する",
    },
    {
      code: specIt(
        "yields: { run: async () => { await userEvent.click(a); await user.type(a, 'x'); } }",
      ),
      errors: 1,
      name: "run ごとに最初の操作を 1 件だけ報告する",
    },
    {
      code: specIt(
        "yields: [{ desc: 'a', run: () => { fireEvent.click(a); } }, { desc: 'b', run: () => { user.click(b); } }]",
      ),
      errors: 1,
      name: "配列の yields は最初に見つかった操作を 1 件だけ報告する",
    },
  ],
  valid: [
    {
      code: specIt("when: { run: () => fireEvent.click(a) }"),
      name: "when の操作は許可する",
    },
    {
      code: specIt("yields: { run: () => { a.user.click(x); } }"),
      name: "user 以外のオブジェクトの click は対象外",
    },
  ],
});
