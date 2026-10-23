import { ruleTester } from "../test-utils/rule-tester.ts";
import { noWaitingInWhen } from "./no-waiting-in-when.ts";

const specIt = (phases: string) => `specIt(spec, "key", { ${phases} });`;

ruleTester.run("no-waiting-in-when", noWaitingInWhen, {
  invalid: [
    {
      code: specIt("when: { run: () => waitFor(() => x) }"),
      errors: 1,
      name: "when の waitFor は報告する",
    },
    {
      code: specIt("when: { run: () => screen.findByText('a') }"),
      errors: 1,
      name: "when の screen.findBy* は報告する",
    },
    {
      code: specIt("when: { run: () => findByText('a') }"),
      errors: 1,
      name: "when の findBy* は報告する",
    },
    {
      code: specIt("when: { run: () => a.b.findByText('a') }"),
      errors: 1,
      name: "深いメンバーの findBy* も報告する",
    },
    {
      code: specIt(
        "when: { run: async () => { await screen.findByRole('a'); await waitFor(x); } }",
      ),
      errors: 1,
      name: "run ごとに最初の待機を 1 件だけ報告する",
    },
  ],
  valid: [
    {
      code: specIt("yields: { run: () => waitFor(() => x) }"),
      name: "yields の待機は許可する",
    },
    {
      code: specIt("when: { run: () => screen.findAllByText('a') }"),
      name: "findAllBy* は対象外",
    },
  ],
});
