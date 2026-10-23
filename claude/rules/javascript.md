---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---

# JavaScript / TypeScript 構文のコーディングガイドライン

コードレビュー時は以下のルールに基づいて指摘してください。

## 配列生成は `map` / `reduce` / `filter` を優先する

`for` ループと `push` を組み合わせて配列を生成すると、中間状態の `let` 変数が増えます。
途中で break / continue / 条件分岐も混ざりやすくなります。
その結果、意図（「何を作っているか」）と実装（「どう作るか」）が分離されません。
配列の生成には可能な限り `map` / `filter` / `reduce` などの高階関数を使ってください。
入力と出力の対応関係だけでロジックを読める形にします。

### 1 対 1 変換は `map`

```ts
// Good: 入力 → 出力の対応が 1 行で読める
const titles = bookmarks.map((bookmark) => bookmark.title);

// Bad: for + push で中間状態を作っている
const titles: string[] = [];
for (const bookmark of bookmarks) {
  titles.push(bookmark.title);
}
```

### 条件による絞り込みは `filter`、`map` と組み合わせる

```ts
// Good: filter → map のチェーンで「絞ってから変換」を宣言的に書く
const publishedTitles = bookmarks
  .filter((bookmark) => bookmark.publishedAt != null)
  .map((bookmark) => bookmark.title);

// Bad: if + push で絞り込みと変換が手続き的に混ざっている
const publishedTitles: string[] = [];
for (const bookmark of bookmarks) {
  if (bookmark.publishedAt != null) {
    publishedTitles.push(bookmark.title);
  }
}
```

### 集約・畳み込みは `reduce`

単純な合計や、配列から別の形（オブジェクト・Map など）を組み立てる処理は
`reduce` を使ってください。累積値が明示されるため、初期値や中間の型が読み取りやすくなります。

```ts
// Good: 合計値の累積が 1 式で読める
const totalCount = bookmarks.reduce((sum, bookmark) => sum + bookmark.count, 0);

// Good: id をキーにしたマップを reduce で組み立てる
const bookmarksById = bookmarks.reduce<Record<string, Bookmark>>(
  (acc, bookmark) => {
    acc[bookmark.id] = bookmark;
    return acc;
  },
  {},
);

// Bad: for + 再代入 / for + push で中間変数を積み上げている
let totalCount = 0;
for (const bookmark of bookmarks) {
  totalCount += bookmark.count;
}

const bookmarksById: Record<string, Bookmark> = {};
for (const bookmark of bookmarks) {
  bookmarksById[bookmark.id] = bookmark;
}
```

### 例外: `for` を許容するケース

以下のように「配列の生成」ではないケースは、無理に `reduce` などに寄せず `for...of` を使ってください。

- 途中で `break` / `return` して早期終了したい（`find` / `some` / `every` で表現できないもの）
- 各要素に対して副作用のみを行い、配列を作らない（ログ出力・DOM 操作など）
- `await` を逐次実行する必要がある（`Promise.all` では並列になってしまうケース）

```ts
// Good: 逐次の副作用は for...of
for (const bookmark of bookmarks) {
  await syncBookmark(bookmark);
}

// Bad: 副作用の実行に forEach / map を使っている（戻り値を捨てている）
bookmarks.forEach((bookmark) => {
  syncBookmark(bookmark);
});
```

## 非同期処理は `async` / `await` + `try` / `catch` を優先する

Promise のメソッドチェーン（`.then()` / `.catch()` / `.finally()`）は避けます。
コールバック関数（`(err, result) => {}`）を使った非同期記述も同様です。
これらはスコープが入れ子になりやすく、変数の型も Promise に包まれてしまいます。
そのため、エラー発生箇所と責務の対応が追いにくくなります。
`async` / `await` と `try` / `catch` を基本形にし、エラーは発生点と同じ階層で処理してください。

### メソッドチェーンではなく `await` を使う

```ts
// Good: 値はそのまま変数に入り、次の処理が直線的に読める
const fetchBookmark = async (id: string): Promise<Bookmark> => {
  const response = await fetch(`/api/bookmarks/${id}`);
  const bookmark = await response.json();
  return bookmark;
};

// Bad: then のネストで中間値の型が Promise に埋もれている
const fetchBookmark = (id: string): Promise<Bookmark> =>
  fetch(`/api/bookmarks/${id}`).then((response) =>
    response.json().then((bookmark) => bookmark),
  );
```

### エラーハンドリングは `try` / `catch` に寄せる

`.catch()` を末尾に付ける書き方だと、どの `await` が原因か追跡しづらく、
型推論上も `catch` のコールバックに渡る引数が `unknown` で閉じ込められます。
エラーを捕捉したい範囲を `try` ブロックで明示し、同じ階層で処理してください。

```ts
// Good: 捕捉範囲と後処理が同じ階層にまとまっている
const saveBookmark = async (input: BookmarkInput): Promise<Bookmark> => {
  try {
    const response = await api.post("/bookmarks", input);
    return response.data;
  } catch (error) {
    logger.error("failed to save bookmark", { error, input });
    throw new BookmarkSaveError({ cause: error });
  }
};

// Bad: .catch() チェーンでエラー処理が末尾に流れ、成功時の戻り値型が曖昧になる
const saveBookmark = (input: BookmarkInput): Promise<Bookmark> =>
  api
    .post("/bookmarks", input)
    .then((response) => response.data)
    .catch((error) => {
      logger.error("failed to save bookmark", { error, input });
      throw new BookmarkSaveError({ cause: error });
    });
```

### コールバック API は Promise 化してから `await` する

コールバック引数 (`(err, result) => {}`) を受け取る API は、`util.promisify` や
`new Promise` でラップしてから `await` で扱ってください。
コールバックをそのまま使うと、エラー分岐が `if (err)` ベースに散り、
関数の戻り値型が `void` になって呼び出し側でのエラーハンドリングが強制できません。

```ts
// Good: promisify してから await、失敗時は try/catch で受ける
import { readFile } from "node:fs/promises";

const loadConfig = async (path: string): Promise<Config> => {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as Config;
  } catch (error) {
    throw new ConfigLoadError({ cause: error, path });
  }
};

// Bad: コールバックで err 分岐を書いている
import { readFile } from "node:fs";

const loadConfig = (
  path: string,
  callback: (err: Error | null, config?: Config) => void,
): void => {
  readFile(path, "utf8", (err, raw) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, JSON.parse(raw) as Config);
  });
};
```

### 並列実行は `Promise.all` + `await` を使う

独立した非同期処理を並列に走らせたい場合も、`.then()` チェーンではなく
`Promise.all` の結果を `await` で受けて分解代入してください。

```ts
// Good: 並列実行の結果を await で受け、以降は同期的に読める
const loadDashboard = async (userId: string) => {
  try {
    const [bookmarks, scraps] = await Promise.all([
      fetchBookmarks(userId),
      fetchScraps(userId),
    ]);
    return { bookmarks, scraps };
  } catch (error) {
    logger.error("failed to load dashboard", { error, userId });
    throw error;
  }
};

// Bad: then チェーンで結果を組み立てている
const loadDashboard = (userId: string) =>
  Promise.all([fetchBookmarks(userId), fetchScraps(userId)]).then(
    ([bookmarks, scraps]) => ({ bookmarks, scraps }),
  );
```

## コメントは「なぜ」だけを書き、自明な内容は書かない

コードを読めば分かる内容をコメントで繰り返さないでください。
関数名・変数名・型・呼び出しているライブラリの API から読み取れる「何をしているか」は書きません。
コメントが残るのは、コードからは読み取れない理由・制約・経緯があるときだけです。

- 書く: 回避策の理由、外部仕様の制約、一見不要に見えるコードを消してはいけない理由、関連 Issue 番号
- 書かない: 処理内容の言い換え、ライブラリの使い方の説明、「〜しないと動かない」のような当然の帰結

```tsx
// Good: コードから読み取れない理由（公開値なので秘匿しない）を書いている
// Cloudflare Web Analytics の token はブラウザに配信される公開値なのでシークレットにしない
const CLOUDFLARE_BEACON = JSON.stringify({ token: "..." });

// Bad: useServerDocumentContext を呼んで描画していることはコードを読めば分かる
// JS バンドル・CSS・フォントのタグがこの context で渡されるので描画する
const { bodyNodes, headNodes } = useServerDocumentContext();
```
