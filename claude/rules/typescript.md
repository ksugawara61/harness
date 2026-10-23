---
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript のコード規約

リポジトリ側に独自の規約や lint 設定がある場合は、そちらを優先してください。

- **ファイル名** は kebab-case（`bookmark-check.tsx`）
- **コンポーネント名** は PascalCase（`BookmarkCheck`）
- **関数** はアロー関数を優先する
- **型定義** は `interface` ではなく `type` を使う
- **非 null アサーション**（`!`）を使わない
- **明示的な `any`** を使わない
- **UI テスト** では `testID` を使わず、`getByRole` や `getByLabelText` などのアクセシブルなクエリを優先する
