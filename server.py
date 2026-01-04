import http.server
import socketserver
import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# データ保存先ディレクトリ
DATA_DIR = Path(__file__).resolve().parent / 'data'
DATA_DIR.mkdir(exist_ok=True)

# データファイルのパス
TASKS_FILE = DATA_DIR / 'tasks.json'
MEMOS_FILE = DATA_DIR / 'memos.json'
PROJECTS_FILE = DATA_DIR / 'projects.json'
MEETINGS_FILE = DATA_DIR / 'meetings.json'
PLANNER_FILE = DATA_DIR / 'planner.json'

# .envファイルを読み込む (anken/.env を優先)
# 優先順位: 1. anken/.env  2. task_management_dashboard/.env  3. 環境変数
ENV_LOADED = False
try:
    # anken/.env を優先
    anken_env = Path(__file__).resolve().parents[1] / '.env'
    local_env = Path(__file__).resolve().parent / '.env'
    
    if anken_env.exists():
        load_dotenv(anken_env)
        print(f"📁 Loaded .env from: {anken_env}")
        ENV_LOADED = True
    elif local_env.exists():
        load_dotenv(local_env)
        print(f"📁 Loaded .env from: {local_env}")
        ENV_LOADED = True
    else:
        print("📁 No .env file found")
        print(f"   推奨: {anken_env} を作成してください")
        print("   内容例:")
        print("   OPENAI_API_KEY=sk-your-api-key-here")
except Exception as e:
    print(f"⚠️ Could not load .env file: {e}")

PORT = int(os.environ.get('TASK_DASHBOARD_PORT', 8009))

def load_json_file(filepath):
    """JSONファイルを読み込む"""
    if filepath.exists():
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"⚠️ Error loading {filepath}: {e}")
    return None

def save_json_file(filepath, data):
    """JSONファイルに保存する"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except IOError as e:
        print(f"⚠️ Error saving {filepath}: {e}")
        return False


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # データ読み込みAPI
        if self.path == '/api/data':
            try:
                data = {
                    'tasks': load_json_file(TASKS_FILE) or [],
                    'memos': load_json_file(MEMOS_FILE) or [],
                    'projects': load_json_file(PROJECTS_FILE) or []
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path == '/api/data/tasks':
            try:
                tasks = load_json_file(TASKS_FILE) or []
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(json.dumps(tasks, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path == '/api/data/memos':
            try:
                memos = load_json_file(MEMOS_FILE) or []
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(json.dumps(memos, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path == '/api/data/projects':
            try:
                projects = load_json_file(PROJECTS_FILE) or []
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(json.dumps(projects, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path == '/api/data/meetings':
            try:
                meetings = load_json_file(MEETINGS_FILE) or []
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(json.dumps(meetings, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_error_response(500, str(e))
        elif self.path == '/api/data/planner':
            try:
                planner = load_json_file(PLANNER_FILE) or {}
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(json.dumps(planner, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_error_response(500, str(e))
        else:
            # 静的ファイルを提供
            super().do_GET()
    
    def do_POST(self):
        # APIエンドポイント: /api/generate
        if self.path == '/api/generate':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                user_goal = data.get('goal')
                user_deadline = data.get('deadline')
                goal_type = data.get('goalType', '一般')
                category = data.get('category', 'private')
                level = data.get('level', 'intermediate')
                hours_per_week = data.get('hoursPerWeek', '10')
                
                api_key = os.environ.get('OPENAI_API_KEY')
                if not api_key or api_key == 'your-api-key-here':
                    self.send_error_response(500, "OpenAI API Key is missing in .env file. Please set OPENAI_API_KEY=your-key")
                    return

                # 日付計算
                today = datetime.now()
                deadline_date = datetime.strptime(user_deadline, '%Y-%m-%d')
                days_remaining = (deadline_date - today).days
                weeks_remaining = max(1, days_remaining // 7)

                # レベルに応じた説明
                level_desc = {
                    'beginner': '初心者向け: 基礎から丁寧にステップを分ける',
                    'intermediate': '中級者向け: 効率的に要点を押さえた計画',
                    'advanced': '上級者向け: 発展的な内容も含める'
                }.get(level, '中級者向け')

                # OpenAI APIへのリクエスト作成
                openai_url = "https://api.openai.com/v1/chat/completions"
                system_prompt = f"""
あなたは経験豊富な学習コンサルタント兼タスクプランナーです。
ユーザーの目標を達成するための**非常に具体的で実践的な**タスク計画を作成してください。

## 計画の条件
- 目標タイプ: {goal_type}
- ユーザーのレベル: {level_desc}
- 週あたりの使用可能時間: 約{hours_per_week}時間
- 目標達成までの日数: {days_remaining}日 ({weeks_remaining}週間)
- 今日の日付: {today.strftime('%Y-%m-%d')}
- 締め切り: {user_deadline}

## 重要: 具体性を重視すること

### 資格試験・学習系の場合は必ず含めること：
1. **おすすめの参考書・教材**を具体的な書籍名で提案（「〇〇の教科書」「合格○○」など実在する書籍名）
2. **学習の進め方**（インプット→アウトプットの比率、復習タイミングなど）
3. **週ごとの学習計画**（第1週: 基礎固め、第2週: 応用問題など）
4. **過去問・模試の活用法**と推奨回数
5. **苦手分野の克服方法**

### 研究・論文系の場合は必ず含めること：
1. **文献調査の具体的な方法**（どのデータベースを使うか等）
2. **執筆スケジュール**（章ごとの締め切り）
3. **レビューと修正のサイクル**

### 仕事プロジェクト系の場合は必ず含めること：
1. **マイルストーンの明確化**
2. **リスク管理タスク**
3. **レビュー・フィードバックポイント**

## 出力ルール
1. タスクは時系列順に並べ、具体的な日付を設定
2. **各タスクには5-8個の詳細なサブタスク**を含める
3. サブタスクには具体的なアクション（「〇〇を読む」「△△を解く」「□□をまとめる」など）を書く
4. 参考書や教材は**具体的な名前**で記載
5. 学習時間の目安も記載（例: 「2時間」「30分×3日」）
6. 優先度は締め切りに近いものや基礎となるものをhigh
7. **全体で10-15個**のタスクを作成

## 出力形式（JSON）
{{
  "tasks": [
    {{
      "title": "【Week 1】基礎知識のインプット - 参考書「〇〇」を読破",
      "priority": "high" | "medium" | "low",
      "deadline": "YYYY-MM-DD",
      "subtasks": [
        {{"title": "参考書「〇〇」第1章を精読（2時間）", "completed": false}},
        {{"title": "第1章の要点をノートにまとめる（1時間）", "completed": false}},
        {{"title": "確認問題を解く（30分）", "completed": false}},
        {{"title": "間違えた箇所を復習（30分）", "completed": false}},
        {{"title": "第2章を精読（2時間）", "completed": false}},
        {{"title": "第2章の重要用語を暗記カード化（1時間）", "completed": false}}
      ]
    }}
  ]
}}

**必ず日本語で**、具体的で実行可能なタスク名をつけてください。
曖昧な表現（「勉強する」「準備する」）は避け、具体的なアクション（「〇〇の第3章を読んで要約する」）を使ってください。
"""
                
                user_prompt = f"目標: {user_goal}"
                
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.7
                }
                
                req = urllib.request.Request(
                    openai_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}"
                    }
                )
                
                with urllib.request.urlopen(req, timeout=60) as response:
                    response_body = response.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_body)
                    
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8') if e.fp else str(e.reason)
                self.send_error_response(e.code, f"OpenAI API Error: {error_body}")
            except urllib.error.URLError as e:
                self.send_error_response(500, f"Network Error: {str(e.reason)}")
            except json.JSONDecodeError as e:
                self.send_error_response(400, f"Invalid JSON: {str(e)}")
            except Exception as e:
                self.send_error_response(500, str(e))
        # APIエンドポイント: /api/summarize (会議要約・議事録生成)
        elif self.path == '/api/summarize':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                text = data.get('text', '')
                summary_type = data.get('type', 'summary')  # summary, minutes, actions
                title = data.get('title', '会議')
                participants = data.get('participants', '')
                
                api_key = os.environ.get('OPENAI_API_KEY')
                if not api_key or api_key == 'your-api-key-here':
                    self.send_error_response(500, "OpenAI API Key is missing")
                    return

                openai_url = "https://api.openai.com/v1/chat/completions"
                
                if summary_type == 'summary':
                    system_prompt = """あなたは会議の内容を要約するアシスタントです。
以下の会議メモ・書き起こしから、重要なポイントを簡潔にまとめてください。

## 出力形式
- 箇条書きで5-10個のポイントにまとめる
- 重要な決定事項は明確に記載
- 今後の課題やTODOがあれば明記
- 日本語で出力"""

                elif summary_type == 'minutes':
                    system_prompt = f"""あなたは議事録作成のプロフェッショナルです。
以下の会議メモ・書き起こしから、正式な議事録を作成してください。

## 会議情報
- 会議名: {title}
- 参加者: {participants}

## 議事録フォーマット
────────────────────────
【議事録】{title}

■ 会議概要
・日時: [会議日時]
・参加者: {participants or '[参加者]'}
・目的: [会議の目的]

■ 議題と討議内容
1. [議題1]
   - 討議内容
   - 決定事項

2. [議題2]
   - 討議内容
   - 決定事項

■ 決定事項まとめ
・[決定事項1]
・[決定事項2]

■ 次回までのアクション
・[担当者]: [アクション内容] (期限: [日付])

■ 次回会議予定
[次回予定があれば記載]
────────────────────────

日本語で出力してください。"""

                else:  # actions
                    system_prompt = """あなたは会議からアクションアイテムを抽出するアシスタントです。
以下の会議メモ・書き起こしから、具体的なアクションアイテム（やるべきこと）を抽出してください。

## 出力形式（JSON）
{
  "actions": [
    {"title": "アクション内容", "assignee": "担当者名（わかる場合）"},
    {"title": "アクション内容", "assignee": ""}
  ]
}

- 具体的で実行可能なアクションに分解
- 担当者が明確でない場合は空文字
- 5-10個程度抽出"""

                user_prompt = f"会議内容:\n{text}"
                
                if summary_type == 'actions':
                    payload = {
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.3
                    }
                else:
                    payload = {
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.3
                    }
                
                req = urllib.request.Request(
                    openai_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}"
                    }
                )
                
                with urllib.request.urlopen(req, timeout=60) as response:
                    response_body = json.loads(response.read())
                    content = response_body['choices'][0]['message']['content']
                    
                    if summary_type == 'actions':
                        result = json.loads(content)
                    else:
                        result = {"result": content}
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode('utf-8'))
                    
            except Exception as e:
                self.send_error_response(500, str(e))
        
        # APIエンドポイント: /api/transcribe (音声書き起こし - Whisper API)
        elif self.path == '/api/transcribe':
            try:
                content_type = self.headers.get('Content-Type', '')
                
                if 'multipart/form-data' not in content_type:
                    self.send_error_response(400, "Content-Type must be multipart/form-data")
                    return
                
                # Parse multipart form data
                import cgi
                import io
                import tempfile
                
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Parse boundary
                boundary = content_type.split('boundary=')[1].encode()
                parts = post_data.split(b'--' + boundary)
                
                audio_data = None
                filename = 'audio.webm'
                
                for part in parts:
                    if b'name="audio"' in part or b'name="file"' in part:
                        # Find the actual data after headers
                        header_end = part.find(b'\r\n\r\n')
                        if header_end != -1:
                            audio_data = part[header_end + 4:]
                            # Remove trailing boundary markers
                            if audio_data.endswith(b'\r\n'):
                                audio_data = audio_data[:-2]
                            if audio_data.endswith(b'--'):
                                audio_data = audio_data[:-2]
                            if audio_data.endswith(b'\r\n'):
                                audio_data = audio_data[:-2]
                        
                        # Extract filename if present
                        header_part = part[:header_end].decode('utf-8', errors='ignore')
                        if 'filename="' in header_part:
                            filename = header_part.split('filename="')[1].split('"')[0]
                
                if not audio_data:
                    self.send_error_response(400, "No audio file provided")
                    return
                
                api_key = os.environ.get('OPENAI_API_KEY')
                if not api_key or api_key == 'your-api-key-here':
                    self.send_error_response(500, "OpenAI API Key is missing")
                    return
                
                # Save to temp file
                with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp:
                    tmp.write(audio_data)
                    tmp_path = tmp.name
                
                try:
                    # Call OpenAI Whisper API
                    import subprocess
                    
                    # Use curl for multipart upload (simpler than urllib for files)
                    result = subprocess.run([
                        'curl', '-s',
                        'https://api.openai.com/v1/audio/transcriptions',
                        '-H', f'Authorization: Bearer {api_key}',
                        '-F', f'file=@{tmp_path}',
                        '-F', 'model=whisper-1',
                        '-F', 'language=ja',
                        '-F', 'response_format=json'
                    ], capture_output=True, text=True, timeout=120)
                    
                    if result.returncode != 0:
                        raise Exception(f"Whisper API call failed: {result.stderr}")
                    
                    response_data = json.loads(result.stdout)
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "text": response_data.get('text', ''),
                        "success": True
                    }).encode('utf-8'))
                    
                finally:
                    # Clean up temp file
                    import os as os_module
                    if os_module.path.exists(tmp_path):
                        os_module.unlink(tmp_path)
                    
            except Exception as e:
                print(f"Transcription error: {e}")
                self.send_error_response(500, str(e))
        
        # APIエンドポイント: /api/data (データ保存)
        elif self.path == '/api/data':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                
                # 各データタイプを保存
                if 'tasks' in data:
                    save_json_file(TASKS_FILE, data['tasks'])
                if 'memos' in data:
                    save_json_file(MEMOS_FILE, data['memos'])
                if 'projects' in data:
                    save_json_file(PROJECTS_FILE, data['projects'])
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                
            except json.JSONDecodeError as e:
                self.send_error_response(400, f"Invalid JSON: {str(e)}")
            except Exception as e:
                self.send_error_response(500, str(e))

        # APIエンドポイント: /api/data/tasks (タスク保存)
        elif self.path == '/api/data/tasks':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                tasks = json.loads(post_data)
                save_json_file(TASKS_FILE, tasks)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                
            except Exception as e:
                self.send_error_response(500, str(e))

        # APIエンドポイント: /api/data/memos (メモ保存)
        elif self.path == '/api/data/memos':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                memos = json.loads(post_data)
                save_json_file(MEMOS_FILE, memos)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                
            except Exception as e:
                self.send_error_response(500, str(e))

        # APIエンドポイント: /api/data/projects (プロジェクト保存)
        elif self.path == '/api/data/projects':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                projects = json.loads(post_data)
                save_json_file(PROJECTS_FILE, projects)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                
            except Exception as e:
                self.send_error_response(500, str(e))

        # APIエンドポイント: /api/data/meetings (会議保存)
        elif self.path == '/api/data/meetings':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                meetings = json.loads(post_data)
                save_json_file(MEETINGS_FILE, meetings)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                
            except Exception as e:
                self.send_error_response(500, str(e))

        # APIエンドポイント: /api/data/planner (プランナー保存)
        elif self.path == '/api/data/planner':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                planner = json.loads(post_data)
                save_json_file(PLANNER_FILE, planner)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                
            except Exception as e:
                self.send_error_response(500, str(e))
        
        else:
            self.send_error(404, "Endpoint not found")

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))

    def log_message(self, format, *args):
        # カスタムログ形式
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")

print("=" * 50)
print("🚀 Task Command Center - PWA Server")
print("=" * 50)
print(f"📍 Server running at: http://localhost:{PORT}")
print(f"📍 API Endpoints:")
print(f"   - /api/generate    (AI Task Planning)")
print(f"   - /api/summarize   (Meeting Summarization)")
print(f"   - /api/transcribe  (Whisper Speech-to-Text)")
print(f"   - /api/data        (Data Storage - GET/POST)")
print("")
print(f"💾 Data Storage:")
print(f"   - {DATA_DIR}/")
print(f"   - tasks.json, memos.json, projects.json")
print("")

api_key = os.environ.get('OPENAI_API_KEY', '')
if api_key and api_key != 'your-api-key-here':
    print(f"✅ API Key loaded (ends with: ...{api_key[-4:]})")
else:
    print("⚠️  WARNING: OPENAI_API_KEY not set in .env file!")
    print("   Create a .env file with: OPENAI_API_KEY=your-key-here")

print("")
print("Press Ctrl+C to stop the server")
print("=" * 50)

with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
