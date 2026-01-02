# Task Command Center ⚡

**やる気が出るタスク管理アプリ** - Notionライクなプロジェクト管理 + AI計画 + 会議書き起こし

![PWA](https://img.shields.io/badge/PWA-対応-6366f1)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini%20%7C%20Whisper-10b981)
![Python](https://img.shields.io/badge/Python-3.9+-3776ab)

---

## 📋 目次

- [機能一覧](#-機能一覧)
- [スクリーンショット](#-スクリーンショット)
- [セットアップ](#-セットアップ)
- [使い方](#-使い方)
- [会議メモ・書き起こし機能](#-会議メモ書き起こし機能)
- [AI計画機能](#-ai計画機能)
- [API仕様](#-api仕様)
- [ファイル構成](#-ファイル構成)
- [カスタマイズ](#-カスタマイズ)
- [トラブルシューティング](#-トラブルシューティング)
- [セキュリティ](#-セキュリティ)

---

## ✨ 機能一覧

### 📊 ダッシュボード (`index.html`)
| 機能 | 説明 |
|------|------|
| カテゴリ別タスク管理 | 仕事・研究・資格試験・プライベートの4カテゴリ |
| プロジェクト別グループ化 | 同じ目標のタスクを階層表示 |
| アクティビティヒートマップ | GitHubスタイルの活動記録 |
| 完了率・連続達成 | モチベーション維持のための統計 |
| カレンダーウィジェット | 期限・完了タスクの可視化 |
| AIタスク計画 | 目標から詳細な計画を自動生成 |

### 📂 プロジェクト管理 (`projects.html`)
| 機能 | 説明 |
|------|------|
| カテゴリビュー | 研究・会社・資格など大項目で分類 |
| ボードビュー | ステータス別カンバン（企画中→進行中→完了） |
| リストビュー | シンプルなリスト表示 |
| テーブルビュー | スプレッドシート形式 |
| 進捗トラッキング | プロジェクト単位の完了率 |

### 📅 プランナー (`planner.html`)
| 機能 | 説明 |
|------|------|
| 年間目標 | カテゴリ別（仕事・学習・健康・お金・人間関係） |
| 月間プラン | 今月やること・カテゴリ別タスク |
| 週間プラン | 曜日別タスク・週のメッセージ |
| 月別サマリー | 12ヶ月の概要表示 |

### 🎙️ 会議メモ・議事録 (`meetings.html`)
| 機能 | 説明 |
|------|------|
| マイク録音 | ブラウザで直接録音 |
| システム音声録音 | イヤホン使用中でもPCの音声を録音 |
| 音声ファイルアップロード | mp3, wav, webm, m4a対応 |
| Whisper書き起こし | OpenAI Whisper APIで日本語テキスト化 |
| AI要約 | 会議内容を箇条書きで要約 |
| 議事録作成 | フォーマット済み議事録を自動生成 |
| アクション抽出 | 次のアクションを自動抽出 |
| Teams連携（オプション） | Microsoft Graph APIで会議同期 |

### 📲 PWA対応
- デスクトップ/スマホにアプリとしてインストール
- オフラインでも動作（データはローカル保存）
- プッシュ通知対応（将来）

---

## 📸 スクリーンショット

```
┌─────────────────────────────────────────────────────────┐
│  ⚡ Task Command Center                                 │
├─────────────┬───────────────────────────────────────────┤
│             │  完了率    完了タスク   残りタスク  連続達成  │
│ 📊 ダッシュ │   78%        156         44        7日    │
│ 📂 プロジェ │                                           │
│ 📅 プランナ ├───────────────────────────────────────────┤
│ 🎙️ 会議メモ │  アクティビティヒートマップ               │
│             │  ▓▓▒▒░░▓▓▓▒░░▓▓▓▓▒▒░▓▓▓▓▓▒               │
│ ─────────── ├───────────────────────────────────────────┤
│ 💼 仕事     │  💼 仕事          │  🔬 研究             │
│ 🔬 研究     │  ├ プロジェクトA │  ├ 論文執筆          │
│ 📚 資格試験 │  │ └ タスク1,2,3  │  │ └ タスク1,2       │
│ 🏠 プライベ │  └ プロジェクトB │  └ 実験計画          │
│             │                   │                      │
└─────────────┴───────────────────────────────────────────┘
```

---

## 🚀 セットアップ

### 動作要件

- Python 3.9以上
- モダンブラウザ（Chrome, Edge, Firefox, Safari）
- OpenAI APIキー（AI機能を使う場合）

### 1. 仮想環境の作成

```bash
cd task_management_dashboard

# 仮想環境を作成
python -m venv venv_task

# 仮想環境を有効化
# macOS / Linux:
source venv_task/bin/activate

# Windows (コマンドプロンプト):
venv_task\Scripts\activate

# Windows (PowerShell):
venv_task\Scripts\Activate.ps1
```

### 2. 依存関係のインストール

```bash
pip install -r requirements.txt
```

**requirements.txt の内容:**
```
python-dotenv>=1.0.0
```

### 3. 環境変数の設定

**`anken/.env`** ファイルを作成（ankenディレクトリ直下）：

```bash
# /Users/saki/lab/anken/.env

# ============================================
# Task Command Center 設定
# ============================================

# OpenAI API Key (必須 - AI計画・要約・書き起こしに使用)
OPENAI_API_KEY=sk-your-api-key-here

# サーバーポート (オプション、デフォルト: 8009)
TASK_DASHBOARD_PORT=8009

# ============================================
# Teams連携 (オプション - Azure AD設定)
# ============================================

# AZURE_CLIENT_ID=your-azure-client-id
# AZURE_CLIENT_SECRET=your-azure-client-secret
# AZURE_TENANT_ID=your-tenant-id
```

**読み込み優先順位:**
1. `anken/.env` （推奨）
2. `task_management_dashboard/.env`
3. システム環境変数

**OpenAI APIキーの取得方法:**
1. https://platform.openai.com/ にアクセス
2. アカウント作成/ログイン
3. API Keys → Create new secret key
4. キーをコピーして `.env` に貼り付け

### 4. サーバーの起動

```bash
python server.py
```

**出力例:**
```
==================================================
🚀 Task Command Center - PWA Server
==================================================
📍 Server running at: http://localhost:8009
📍 API Endpoints:
   - /api/generate    (AI Task Planning)
   - /api/summarize   (Meeting Summarization)
   - /api/transcribe  (Whisper Speech-to-Text)

✅ API Key loaded (ends with: ...xxxx)

Press Ctrl+C to stop the server
==================================================
```

### 5. ブラウザでアクセス

| ページ | URL | 説明 |
|--------|-----|------|
| ダッシュボード | http://localhost:8009/ | メイン画面 |
| プロジェクト | http://localhost:8009/projects.html | プロジェクト管理 |
| プランナー | http://localhost:8009/planner.html | 年間・月間・週間計画 |
| 会議メモ | http://localhost:8009/meetings.html | 録音・書き起こし |

### 6. アプリとしてインストール（オプション）

**Chrome/Edgeの場合:**
1. 上記URLにアクセス
2. アドレスバー右側のインストールアイコン（⊕）をクリック
3. 「インストール」をクリック

**iPhone/iPad (Safari):**
1. 共有ボタン → 「ホーム画面に追加」

---

## 📖 使い方

### タスク管理

1. **タスク追加**: 各カテゴリの「+ 追加」ボタン
2. **プロジェクト設定**: タスク作成時に「プロジェクト名」を入力すると自動グループ化
3. **完了**: タスク横のチェックボックスをクリック
4. **編集**: タスクをクリックしてモーダルで編集
5. **削除**: 編集モーダル内の「削除」ボタン

### プロジェクト管理

1. **プロジェクト作成**: 「+ 新規プロジェクト」ボタン
2. **ビュー切り替え**: ヘッダーのアイコンで切り替え
   - 📁 カテゴリビュー（デフォルト）
   - ▦ ボードビュー
   - ☰ リストビュー
   - ▤ テーブルビュー
3. **タスク追加**: プロジェクト詳細画面で追加

### プランナー

1. **年間目標**: 各カテゴリの「+ 目標を追加」
2. **月間プラン**: 「今月やること」に追加
3. **週間プラン**: 曜日をクリックしてタスク追加
4. **期間切り替え**: ヘッダーの矢印で前後の月/週に移動

---

## 🎙️ 会議メモ・書き起こし機能

### スタンドアロンモード（Teamsログイン不要）

NotepinAIのように、Microsoftアカウント不要で使えます。

#### マイク録音

1. 「🎤 マイク録音」ボタンをクリック
2. マイクへのアクセスを許可
3. 録音中は時間がカウントされます
4. 「⏹️ 録音停止」で終了
5. 自動的にWhisper APIで書き起こし

#### システム音声録音（イヤホン使用時）

イヤホンをしていてもTeamsやZoomの音声を録音できます。

1. 「🖥️ システム音声」ボタンをクリック
2. 画面共有ダイアログが表示されます
3. **重要**: 録音したい音声のソースを選択
   - **Chromeタブ**: 特定のタブの音声のみ録音
   - **画面全体**: PC全体の音声を録音
4. **「タブの音声を共有」または「システム音声を共有」にチェック**
5. 「共有」をクリック
6. 録音開始 → 「⏹️ 録音停止」で終了
7. 自動的にWhisper APIで書き起こし

```
┌─────────────────────────────────────────┐
│  共有するコンテンツを選択               │
├─────────────────────────────────────────┤
│  ○ 画面全体   ○ ウィンドウ   ● タブ    │
├─────────────────────────────────────────┤
│  [Teams会議のタブ]                      │
│                                         │
│  ☑ タブの音声も共有する  ← これが重要！ │
│                                         │
│              [共有] [キャンセル]         │
└─────────────────────────────────────────┘
```

#### 音声ファイルアップロード

1. 「📝 書き起こし」カードをクリック
2. 音声/動画ファイルをドラッグ＆ドロップ、または「ファイルを選択」
3. 対応形式: mp3, wav, webm, m4a, mp4, mov
4. Whisper APIで書き起こし

#### AI機能

書き起こしテキストに対して:

| 機能 | 説明 |
|------|------|
| ✨ AI要約 | 5-10個の箇条書きで要約 |
| 📋 議事録作成 | フォーマット済み議事録を生成 |
| ⚡ アクション抽出 | 次のアクションを自動抽出してタスク化 |

### Teams連携（オプション）

完全なTeams連携には Azure AD アプリ登録が必要です:

1. **Azure Portal** (https://portal.azure.com) にアクセス
2. **Azure Active Directory** → **アプリの登録** → **新規登録**
3. 以下の権限を追加:
   - `OnlineMeetings.Read`
   - `Calendars.Read`
   - `User.Read`
4. リダイレクト URI: `http://localhost:8009/auth/callback`
5. クライアントIDとシークレットを `.env` に追加

---

## 🤖 AI計画機能

目標を入力すると、詳細なタスク計画を自動生成します。

### 使い方

1. ダッシュボードの「✨ AI計画」ボタンをクリック
2. 以下を入力:
   - **目標**: 例「司法予備試験合格」「機械学習論文執筆」
   - **タイプ**: 資格試験 / 研究 / 仕事 / スキル習得
   - **レベル**: 初心者 / 中級者 / 上級者
   - **週あたり時間**: 利用可能な学習/作業時間
   - **期限**: 目標達成日
3. 「計画を生成」をクリック
4. 生成されたタスクをプレビュー
5. 「タスクをインポート」でダッシュボードに追加

### 生成される内容

- **おすすめ参考書・教材**: 具体的な書籍名
- **週ごとの計画**: 第1週〜最終週までの詳細
- **サブタスク**: 各タスクに5-8個の具体的なアクション
- **学習時間の目安**: 各タスクの所要時間

---

## 📡 API仕様

### POST /api/generate

AIタスク計画の生成

**リクエスト:**
```json
{
  "goal": "司法予備試験合格",
  "deadline": "2026-12-31",
  "goalType": "資格試験",
  "category": "certification",
  "level": "beginner",
  "hoursPerWeek": "15"
}
```

**レスポンス:**
```json
{
  "choices": [{
    "message": {
      "content": "{\"tasks\": [...]}"
    }
  }]
}
```

### POST /api/summarize

会議内容の要約・議事録生成

**リクエスト:**
```json
{
  "text": "会議の書き起こしテキスト...",
  "type": "summary|minutes|actions",
  "title": "週次定例会議",
  "participants": "山田, 佐藤"
}
```

**レスポンス (summary/minutes):**
```json
{
  "result": "要約または議事録テキスト"
}
```

**レスポンス (actions):**
```json
{
  "actions": [
    {"title": "アクション内容", "assignee": "担当者"},
    ...
  ]
}
```

### POST /api/transcribe

音声ファイルの書き起こし（Whisper API）

**リクエスト:** `multipart/form-data`
- `audio`: 音声ファイル (webm, mp3, wav, m4a)

**レスポンス:**
```json
{
  "text": "書き起こされたテキスト",
  "success": true
}
```

---

## 📁 ファイル構成

```
task_management_dashboard/
├── index.html          # ダッシュボード
├── projects.html       # プロジェクト管理
├── planner.html        # プランナー
├── meetings.html       # 会議メモ・Teams連携
├── offline.html        # オフラインページ
├── manifest.json       # PWAマニフェスト
├── sw.js               # Service Worker
├── server.py           # Pythonバックエンド (API)
├── requirements.txt    # Python依存関係
├── generate_icons.py   # PWAアイコン生成
├── README.md           # このファイル
│
├── css/
│   ├── style.css       # メインスタイル
│   ├── projects.css    # プロジェクトページ用
│   ├── planner.css     # プランナーページ用
│   └── meetings.css    # 会議ページ用
│
├── js/
│   ├── data.js         # データ管理 (TaskManager, ProjectsManager, MemoManager)
│   ├── app.js          # ダッシュボードUI
│   ├── projects.js     # プロジェクトUI
│   ├── planner.js      # プランナーUI
│   ├── meetings.js     # 会議メモUI + 録音 + Teams連携
│   ├── calendar.js     # カレンダーウィジェット
│   ├── stats.js        # 統計・チャート (Chart.js)
│   ├── ai_planner.js   # AI計画機能
│   └── memos.js        # メモ管理
│
└── icons/              # PWAアイコン
    ├── icon.svg        # ベースアイコン
    └── generator.html  # アイコン生成ツール
```

---

## 🎨 カスタマイズ

### テーマカラーの変更

`css/style.css` の CSS 変数を編集:

```css
:root {
    /* メインカラー */
    --accent-primary: #6366f1;    /* 紫 */
    --accent-secondary: #8b5cf6;  /* 明るい紫 */
    
    /* グラデーション */
    --gradient-hero: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
    
    /* 背景色 */
    --bg-primary: #0f0f12;
    --bg-secondary: #16161d;
    --bg-card: #1a1a23;
    
    /* テキスト */
    --text-primary: #f4f4f5;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;
}
```

### カテゴリの追加

`js/data.js` の `CATEGORIES` を編集:

```javascript
const CATEGORIES = {
    work: { name: '仕事', icon: '💼', color: '#3b82f6' },
    research: { name: '研究', icon: '🔬', color: '#10b981' },
    certification: { name: '資格試験', icon: '📚', color: '#f59e0b' },
    private: { name: 'プライベート', icon: '🏠', color: '#ec4899' },
    // 新しいカテゴリを追加
    hobby: { name: '趣味', icon: '🎨', color: '#8b5cf6' }
};
```

---

## 🔧 トラブルシューティング

### ポートが使用中

```bash
# ポート8009を使用しているプロセスを確認
lsof -i:8009

# 強制終了
lsof -ti:8009 | xargs kill -9

# または別のポートを使用
TASK_DASHBOARD_PORT=8010 python server.py
```

### APIキーエラー

```
⚠️ WARNING: OPENAI_API_KEY not set in .env file!
```

1. `.env`ファイルが正しい場所にあるか確認
2. APIキーが正しいか確認（`sk-`で始まる）
3. OpenAIアカウントに残高があるか確認

### マイクへのアクセス拒否

1. ブラウザのURLバーの鍵アイコンをクリック
2. 「サイトの設定」→「マイク」→「許可」

### システム音声が録音されない

1. **Chromeタブを共有**する場合は、録音したい音声が流れているタブを選択
2. **「タブの音声も共有する」にチェック**を忘れずに
3. 一部のサイト（DRM保護されたコンテンツ）は録音できません

### Service Workerのキャッシュ問題

ファイルを更新しても反映されない場合:

1. DevTools (F12) → Application → Service Workers
2. 「Unregister」をクリック
3. ページをリロード

---

## 🔒 セキュリティ

### OpenAI APIキーの保護

- ✅ APIキーは **サーバー側 (`server.py`)** でのみ使用
- ✅ ブラウザ（JavaScript）には **一切露出しない**
- ✅ `.env`ファイルは `.gitignore` に含まれている

**通信フロー:**
```
ブラウザ → localhost:8009/api/... → server.py → OpenAI API
              (APIキーなし)         (APIキーあり)
```

### 本番環境にデプロイする場合

1. **HTTPS必須**: Let's Encryptなどで証明書を取得
2. **CORS設定**: 許可するオリジンを制限
3. **レート制限**: APIの過剰使用を防ぐ
4. **認証追加**: ユーザー認証を実装

---

## 📄 ライセンス

MIT License

---

## 🙏 謝辞

- [OpenAI](https://openai.com/) - GPT-4o-mini / Whisper API
- [Chart.js](https://www.chartjs.org/) - グラフ描画
- [Outfit Font](https://fonts.google.com/specimen/Outfit) - フォント
