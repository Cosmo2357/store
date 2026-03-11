
# Plugin & App Store System — Next.js Reference Implementation

A reference implementation showing how to build a **plugin and app store system** —
where features are sold and unlocked individually — using nothing but Next.js App Router, SQLite, and Server Actions.



![名称未設定のデザイン](https://github.com/user-attachments/assets/b5c9dfec-44c9-4b85-ae12-af3badec452f)



---

## English

### The Problem This Solves

Building a system where users can purchase and unlock individual features has historically
required assembling several complex, independent systems:

- **Web Components or Module Federation** to load feature code at runtime without a full rebuild
- **Micro-frontends** with separate repositories, CI pipelines, and deployment processes
- **An external auth or permission service** to control who can access what
- **iframe sandboxing** or a dedicated plugin runtime to isolate feature code
- **A separate API server** for each feature's data needs
- **Feature flag infrastructure** (LaunchDarkly, etc.) to drive UI and access control

Each piece works, but wiring them together produces significant operational complexity —
multiple codebases, separate deployment units, and a large surface area for things to break.

---

### The Insight

Next.js already ships everything you need:

| Traditional requirement | Next.js equivalent |
|---|---|
| Module Federation / Web Components | `dynamic(() => import(...))` — automatic code splitting |
| Permission service + external auth | Server Component gate: render the loader only if purchased |
| Feature flag infrastructure | A single `purchased` column in SQLite |
| Separate API endpoints per feature | Server Actions — type-safe RPC, zero boilerplate |
| Separate deployment per feature | One app, one deploy |

The result: a fully functional plugin store system in a single codebase, with a few hundred lines of straightforward TypeScript.

---

### How It Works

#### 1. Dynamic Import — The Plugin Gate

```typescript
// PluginLoader.tsx
const Plugin = dynamic(() => import("@/plugins/AiAssistant"), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

`dynamic()` splits each plugin into its own JS bundle. The server only renders `PluginLoader`
if the user has subscribed — so the plugin's code is **never sent to unsubscribed users**.

```
Unsubscribed  →  Server returns "not subscribed" page
                 Plugin JS: never fetched ✓

Subscribed    →  Server renders PluginLoader
                 Browser fetches AiAssistant.js only on that page visit ✓
```

This applies equally to games (Space Shooter, Tetris, Platformer) and utility plugins (AI Assistant).
A 200 KB canvas game bundle never hits the network for non-subscribers.

#### 2. Server Actions — RPC Without the Boilerplate

```typescript
// Called on the client, executed on the server
const reply = await sendMessage("Write an email about...");
const history = await getMessages();
```

No REST endpoints to design, no `fetch()` to write, no API routes to maintain.
Server Actions behave like ordinary async functions while Next.js handles the
HTTP transport, serialization, and type inference across the boundary.

The AI Assistant plugin demonstrates this concretely: the chat UI sends messages and
receives replies through Server Actions backed by SQLite — zero API boilerplate.

#### 3. One Flag Drives Everything

```typescript
// layout.tsx — runs on the server on every request
const enabledPlugins = await getEnabledPlugins();

// Header.tsx — client component, receives plugins via Context
const menuItems = useFeatureFlags().filter((p) => p.purchased);
```

The `purchased` column in SQLite simultaneously controls:
- **Navigation** — which menu items appear in the header
- **Routing** — which dashboard pages are accessible
- **JS delivery** — which plugin bundles are ever sent to the browser

No external service. No cache invalidation headache. `revalidatePath()` keeps the UI
in sync the moment a purchase completes.

---

### One App, Zero Friction for New Features

Because everything lives in a single Next.js project, **adding a new plugin to sell is
exactly as hard as adding a new page** — no cross-repo pull requests, no separate deployment
pipeline, no API contract to negotiate with another team.

The navigation menu and dashboard routes are generated dynamically from the database,
so new entries appear automatically once a plugin is registered. There is nothing to hardcode.

Adding a plugin takes three steps:

**1.** Register it in `src/lib/db.ts`
```typescript
["my-plugin", "My Plugin", "Does something useful", "$9/mo", "/dashboard/my-plugin"],
```

**2.** Create the plugin page
```
src/plugins/MyPlugin/index.tsx
```

**3.** Map it in `PluginLoader.tsx`
```typescript
const PLUGIN_MAP = {
  "my-plugin": () => import("@/plugins/MyPlugin"),
  // existing plugins unchanged
};
```

That's it. The purchase gate, the menu entry, and the route protection are all inherited automatically.

---

### What's in the Store

| Plugin | Price | What it demonstrates |
|---|---|---|
| AI Assistant | $49/mo | Server Actions as RPC — client calls `sendMessage()`, server reads/writes SQLite |
| Space Shooter | $9/mo | Canvas game delivered only after purchase — 0 bytes to non-subscribers |
| Tetris | $9/mo | Same pattern, different content — shows plugins can be anything |
| Platformer | $9/mo | Side-scrolling game with physics, enemies, and level progression |

---

### User Journey

```
① Visit /store
         ↓
② Click "Subscribe" — Sutoraipe payment modal appears
         ↓
③ Payment confirmed → SQLite: purchased = 1
         ↓
④ Header menu updates instantly (revalidatePath)
         ↓
⑤ Navigate to /dashboard/ai-assistant
         ↓
⑥ Server confirms subscription — renders PluginLoader
         ↓
⑦ Browser fetches AiAssistant.js for the first time  ←  Dynamic Import
         ↓
⑧ Plugin mounts, calls sendMessage() via Server Action, renders live chat
```

---

### Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Framework | Next.js 16 (App Router) | Routing, SSR, code splitting |
| Database | better-sqlite3 | Subscription state, AI chat history |
| RPC | Server Actions | All client↔server communication |
| UI | shadcn/ui + Tailwind CSS v4 | Components and theming |
| Icons | react-icons | Visual plugin identity |
| Theme | next-themes | Dark mode |

---

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          Browser                             │
│  ┌────────────────────┐   ┌──────────────────────────────┐  │
│  │  Header            │   │  /dashboard/[pluginId]        │  │
│  │  (dynamic menu     │   │  ┌──────────────────────────┐│  │
│  │   from Context)    │   │  │  PluginLoader             ││  │
│  └────────────────────┘   │  │  dynamic(() => import())  ││  │
│           ↑               │  │         ↓ on mount        ││  │
│    Feature flags          │  │  [plugin.js chunk fetched]││  │
│    via Context            │  └──────────────────────────┘│  │
└───────────────────────────┴──────────────────────────────────┘
          │  Server Actions (POST)       │  Server Actions (POST)
          ↓                             ↓
┌──────────────────────────────────────────────────────────────┐
│                          Server                              │
│  purchase()  cancel()  sendMessage()  getMessages()          │
│  getEnabledPlugins()   clearMessages()                       │
│                    ↓                                         │
│         ┌──────────────────────────────┐                    │
│         │       data/db.sqlite         │                    │
│         │       plugins · ai_messages  │                    │
│         └──────────────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

---

### Setup

```bash
npm install
npm run dev
```

`data/db.sqlite` is created automatically on first run.

---

---

## 日本語

### このリポジトリが解決する問題

ユーザーが個別に機能を購入してアンロックするシステム — いわゆる**プラグイン・アプリストア**型のアーキテクチャは、
従来、複数の独立したシステムを組み合わせることでしか実現できませんでした。

- **Web Components や Module Federation** — フルリビルドなしにコードをランタイムでロードするため
- **マイクロフロントエンド** — 機能ごとに別リポジトリ・別 CI・別デプロイを管理するため
- **外部の認可サービス** — 誰が何にアクセスできるかを制御するため
- **iframe やプラグインランタイム** — 機能コードを分離して実行するため
- **機能ごとの API サーバー** — データアクセスを提供するため
- **Feature Flag インフラ**（LaunchDarkly 等）— UI と権限制御を一元管理するため

個々の部品は機能しますが、それらを繋ぎ合わせると複数のコードベース、個別のデプロイ単位、膨大な障害点が生まれます。

---

### 気づき

Next.js はすでに必要なものをすべて持っています。

| 従来必要だったもの | Next.js での代替 |
|---|---|
| Module Federation / Web Components | `dynamic(() => import(...))` — 自動コード分割 |
| 認可サービス + 外部 Auth | Server Component でのゲート処理 |
| Feature Flag インフラ | SQLite の `purchased` カラム 1 つ |
| 機能ごとの API エンドポイント | Server Actions — 型安全な RPC、ボイラープレートなし |
| 機能ごとの個別デプロイ | 1 アプリ、1 デプロイ |

結果として、シンプルな TypeScript 数百行で、フル機能のプラグインストアシステムが単一コードベースで完成します。

---

### 仕組み

#### 1. Dynamic Import — プラグインのゲート

```typescript
// PluginLoader.tsx
const Plugin = dynamic(() => import("@/plugins/AiAssistant"), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

`dynamic()` は各プラグインを独立した JS バンドルに分割します。
サーバーは購入済みのユーザーにのみ `PluginLoader` をレンダリングするため、
**未購入ユーザーにはプラグインのコードが一切送信されません。**

ゲームプラグイン（Space Shooter・Tetris・Platformer）も同様です。
200KB のキャンバスゲームバンドルは、未購入者のネットワークには一切流れません。

#### 2. Server Actions — ボイラープレートのない RPC

```typescript
// クライアントから通常の関数として呼び出せる
const reply = await sendMessage("Write an email about...");
const history = await getMessages();
```

REST エンドポイントの設計も、`fetch()` の記述も、API ルートのメンテナンスも不要です。
HTTP トランスポートとシリアライゼーションは Next.js が自動処理し、
TypeScript の型はクライアントとサーバーをまたいで一貫して維持されます。

AI Assistant プラグインがこれを具体的に示しています。チャット UI は Server Actions 経由でメッセージを送受信し、
SQLite に履歴を保存します — API のボイラープレートはゼロです。

#### 3. 1 つのフラグがすべてを制御する

```typescript
// layout.tsx — リクエストごとにサーバーで実行
const enabledPlugins = await getEnabledPlugins();

// Header.tsx — Context 経由でクライアントが受け取る
const menuItems = useFeatureFlags().filter((p) => p.purchased);
```

SQLite の `purchased` カラムが、ナビゲーション・ルーティング・JS 配信の 3 つを同時に制御します。
外部サービスは不要で、`revalidatePath()` が購入完了の瞬間に UI を同期します。

---

### 1 つのアプリ、新機能開発のゼロコスト

すべてが 1 つの Next.js プロジェクトに収まっているため、**ストアに新しいプラグインを追加することは、
新しいページを追加することと同じ難易度**です。
クロスリポジトリの PR も、個別のデプロイパイプラインも、API 契約の交渉も不要です。

メニュー項目とダッシュボードルートはデータベースから**動的に生成**されるため、
プラグインを登録するだけで自動的に現れます。ハードコードする箇所は一切ありません。

プラグインの追加は 3 ステップで完結します：

**1.** `src/lib/db.ts` に登録

```typescript
["my-plugin", "My Plugin", "Does something useful", "$9/mo", "/dashboard/my-plugin"],
```

**2.** プラグインページを作成

```
src/plugins/MyPlugin/index.tsx
```

**3.** `PluginLoader.tsx` にマッピングを追加

```typescript
const PLUGIN_MAP = {
  "my-plugin": () => import("@/plugins/MyPlugin"),
};
```

以上。購入ゲート・メニュー追加・ルート保護はすべて自動で引き継がれます。

---

### ストアに並ぶプラグイン

| プラグイン | 価格 | 何を示しているか |
|---|---|---|
| AI Assistant | $49/mo | Server Actions を RPC として使う例 — `sendMessage()` がサーバーの SQLite を読み書き |
| Space Shooter | $9/mo | 購入後にのみ届くキャンバスゲーム — 未購入者には 0 バイト |
| Tetris | $9/mo | 同じパターン、異なるコンテンツ — プラグインは何でもよいことを示す |
| Platformer | $9/mo | 物理演算・敵・レベル進行を持つ横スクロールアクション |

---

### セットアップ

```bash
npm install
npm run dev
```

`data/db.sqlite` は初回起動時に自動生成されます。
