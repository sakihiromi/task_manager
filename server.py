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
        
        # APIエンドポイント: /api/format-transcript (書き起こしテキストの整形)
        elif self.path == '/api/format-transcript':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                text = data.get('text', '')
                
                if not text:
                    self.send_error_response(400, "No text provided")
                    return
                
                api_key = os.environ.get('OPENAI_API_KEY')
                if not api_key or api_key == 'your-api-key-here':
                    self.send_error_response(500, "OpenAI API Key is missing")
                    return

                openai_url = "https://api.openai.com/v1/chat/completions"
                
                system_prompt = """あなたは書き起こしテキストを整形する専門家です。
以下の音声書き起こしテキストを読みやすく整形してください。

## 整形ルール
1. **段落分け**: 話題の変わり目や話者の変更で適切に改行・段落を分ける
2. **句読点**: 適切な位置に句点（。）と読点（、）を追加
3. **話者の識別**: 明らかに話者が変わった場合は、空行を入れて区切る
4. **見出し**: 大きなトピックの変わり目には見出し（■ や ### など）を追加
5. **フィラー除去**: 「えーと」「あのー」などの不要なフィラーは削除
6. **重複削除**: 言い直しや繰り返しは整理
7. **漢字変換**: ひらがなで書かれた一般的な単語は適切に漢字に変換

## 注意
- 内容の意味は変えない
- 専門用語はそのまま維持
- 質疑応答がある場合は Q: A: 形式にする

整形したテキストのみを出力してください。説明は不要です。"""

                # Split long text into chunks (max ~8000 chars per chunk)
                MAX_CHUNK_SIZE = 8000
                text_length = len(text)
                
                print(f"📝 Formatting text: {text_length} chars")
                
                if text_length <= MAX_CHUNK_SIZE:
                    # Short text - process directly
                    chunks = [text]
                else:
                    # Split into chunks at sentence boundaries
                    chunks = []
                    current_pos = 0
                    while current_pos < text_length:
                        end_pos = min(current_pos + MAX_CHUNK_SIZE, text_length)
                        # Try to find a good break point
                        if end_pos < text_length:
                            # Look for sentence endings
                            for sep in ['。', '．', '. ', '\n\n', '\n', ' ']:
                                last_sep = text.rfind(sep, current_pos, end_pos)
                                if last_sep > current_pos + MAX_CHUNK_SIZE // 2:
                                    end_pos = last_sep + len(sep)
                                    break
                        chunks.append(text[current_pos:end_pos])
                        current_pos = end_pos
                    print(f"   Split into {len(chunks)} chunks")
                
                formatted_parts = []
                for i, chunk in enumerate(chunks):
                    print(f"   Processing chunk {i+1}/{len(chunks)} ({len(chunk)} chars)...")
                    
                    chunk_prompt = system_prompt
                    if len(chunks) > 1:
                        chunk_prompt += f"\n\nこれはパート{i+1}/{len(chunks)}です。"
                    
                    payload = {
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": chunk_prompt},
                            {"role": "user", "content": f"以下の書き起こしテキストを整形してください:\n\n{chunk}"}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 8000
                    }
                    
                    req = urllib.request.Request(
                        openai_url,
                        data=json.dumps(payload).encode('utf-8'),
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {api_key}"
                        }
                    )
                    
                    with urllib.request.urlopen(req, timeout=180) as response:
                        response_body = json.loads(response.read())
                        formatted_chunk = response_body['choices'][0]['message']['content']
                        formatted_parts.append(formatted_chunk)
                
                # Combine all parts
                formatted_text = '\n\n'.join(formatted_parts)
                print(f"✅ Formatting complete: {len(formatted_text)} chars")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "text": formatted_text,
                    "success": True
                }).encode('utf-8'))
                    
            except Exception as e:
                print(f"Format error: {e}")
                self.send_error_response(500, str(e))
        
        # APIエンドポイント: /api/transcribe (音声書き起こし - Whisper API)
        elif self.path == '/api/transcribe':
            try:
                content_type = self.headers.get('Content-Type', '')
                
                if 'multipart/form-data' not in content_type:
                    self.send_error_response(400, "Content-Type must be multipart/form-data")
                    return
                
                # Parse multipart form data
                import tempfile
                import re
                
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                print(f"📥 Received audio data: {content_length} bytes")
                
                # Parse boundary (handle quotes and extra params)
                boundary_match = re.search(r'boundary=([^;\s]+)', content_type)
                if not boundary_match:
                    self.send_error_response(400, "Could not find boundary in Content-Type")
                    return
                boundary = boundary_match.group(1).strip('"').encode()
                
                parts = post_data.split(b'--' + boundary)
                
                audio_data = None
                filename = 'audio.webm'
                content_type_audio = 'audio/webm'
                
                for part in parts:
                    if b'name="audio"' in part or b'name="file"' in part:
                        # Find the actual data after headers
                        header_end = part.find(b'\r\n\r\n')
                        if header_end != -1:
                            audio_data = part[header_end + 4:]
                            # Remove trailing boundary markers more carefully
                            # Find the last occurrence of \r\n and remove from there
                            last_newline = audio_data.rfind(b'\r\n')
                            if last_newline > 0:
                                audio_data = audio_data[:last_newline]
                        
                        # Extract filename and content-type if present
                        header_part = part[:header_end].decode('utf-8', errors='ignore')
                        if 'filename="' in header_part:
                            filename = header_part.split('filename="')[1].split('"')[0]
                        if 'Content-Type:' in header_part:
                            ct_match = re.search(r'Content-Type:\s*([^\r\n]+)', header_part)
                            if ct_match:
                                content_type_audio = ct_match.group(1).strip()
                        break
                
                if not audio_data or len(audio_data) < 100:
                    print(f"❌ Audio data too small or empty: {len(audio_data) if audio_data else 0} bytes")
                    self.send_error_response(400, "No valid audio file provided")
                    return
                
                print(f"📝 Parsed audio: {len(audio_data)} bytes, filename={filename}, type={content_type_audio}")
                
                api_key = os.environ.get('OPENAI_API_KEY')
                if not api_key or api_key == 'your-api-key-here':
                    self.send_error_response(500, "OpenAI API Key is missing")
                    return
                
                # Determine file extension from Content-Type (more reliable than filename)
                # Whisper API supported formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
                ext = '.webm'
                needs_conversion = False
                
                # Content-Type takes priority over filename
                if 'quicktime' in content_type_audio or 'mov' in content_type_audio:
                    ext = '.mov'
                    needs_conversion = True  # MOV not supported by Whisper
                elif 'mp3' in content_type_audio:
                    ext = '.mp3'
                elif 'mp4' in content_type_audio:
                    ext = '.mp4'
                elif 'mpeg' in content_type_audio:
                    ext = '.mp3'
                elif 'wav' in content_type_audio:
                    ext = '.wav'
                elif 'm4a' in content_type_audio:
                    ext = '.m4a'
                elif 'ogg' in content_type_audio:
                    ext = '.ogg'
                elif 'flac' in content_type_audio:
                    ext = '.flac'
                elif 'webm' in content_type_audio:
                    ext = '.webm'
                elif filename and '.' in filename:
                    # Fallback to filename extension
                    file_ext = '.' + filename.rsplit('.', 1)[-1].lower()
                    if file_ext in ['.webm', '.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.flac', '.oga', '.mpga']:
                        ext = file_ext
                    elif file_ext in ['.mov', '.avi', '.mkv']:
                        ext = file_ext
                        needs_conversion = True
                
                # Save to temp file
                import subprocess
                
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                    tmp.write(audio_data)
                    tmp_path = tmp.name
                
                print(f"💾 Saved temp file: {tmp_path} ({len(audio_data)} bytes)")
                
                # Whisper API limit is 25MB - compress if needed
                WHISPER_MAX_SIZE = 25 * 1024 * 1024  # 25MB
                upload_path = tmp_path
                compressed_path = None
                
                # Check if file has audio stream using ffprobe
                def has_audio_stream(filepath):
                    try:
                        probe_result = subprocess.run([
                            'ffprobe', '-v', 'error',
                            '-select_streams', 'a',
                            '-show_entries', 'stream=codec_type',
                            '-of', 'csv=p=0',
                            filepath
                        ], capture_output=True, text=True, timeout=30)
                        return 'audio' in probe_result.stdout
                    except Exception:
                        return True  # Assume it has audio if we can't check
                
                # For video files, check if audio exists
                if ext in ['.mov', '.mp4', '.webm', '.mkv', '.avi']:
                    if not has_audio_stream(tmp_path):
                        raise Exception("このファイルには音声トラックが含まれていません。音声付きで録画するか、音声ファイルをアップロードしてください。")
                
                # Convert if format not supported by Whisper API or file too large
                if needs_conversion or len(audio_data) > WHISPER_MAX_SIZE:
                    reason = "非対応形式のため" if needs_conversion else f"サイズが大きいため({len(audio_data) // 1024 // 1024}MB > 25MB)"
                    print(f"⚠️ {reason}、ffmpegで変換中...")
                    
                    # Check if ffmpeg is available
                    ffmpeg_check = subprocess.run(['which', 'ffmpeg'], capture_output=True)
                    if ffmpeg_check.returncode != 0:
                        if needs_conversion:
                            raise Exception(f"この形式（{ext}）はWhisper APIに対応していません。ffmpegをインストールするか、対応形式（mp3, mp4, wav, webm等）に変換してください。")
                        else:
                            raise Exception(f"ファイルサイズが大きすぎます（{len(audio_data) // 1024 // 1024}MB > 25MB）。ffmpegをインストールするか、より短い音声ファイルを使用してください。")
                    
                    # Convert/compress to mp3
                    compressed_path = tmp_path.rsplit('.', 1)[0] + '_converted.mp3'
                    
                    # Get audio duration first to calculate optimal bitrate
                    duration_result = subprocess.run([
                        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'default=noprint_wrappers=1:nokey=1', tmp_path
                    ], capture_output=True, text=True, timeout=60)
                    
                    # Calculate optimal bitrate based on duration
                    # Target: 24MB to have some margin (24 * 1024 * 1024 * 8 bits)
                    target_size_bits = 24 * 1024 * 1024 * 8
                    bitrate = '64k'  # Default
                    
                    if duration_result.returncode == 0 and duration_result.stdout.strip():
                        try:
                            duration_seconds = float(duration_result.stdout.strip())
                            if duration_seconds > 0:
                                # Calculate required bitrate (with 10% safety margin)
                                calculated_bitrate = int(target_size_bits / duration_seconds * 0.9)
                                # Clamp between 16kbps (minimum for speech) and 64kbps
                                calculated_bitrate = max(16000, min(64000, calculated_bitrate))
                                bitrate = f'{calculated_bitrate // 1000}k'
                                print(f"📊 Duration: {duration_seconds:.1f}s, Calculated bitrate: {bitrate}")
                        except ValueError:
                            print("⚠️ Could not parse duration, using default 64k bitrate")
                    
                    compress_result = subprocess.run([
                        'ffmpeg', '-y', '-i', tmp_path,
                        '-vn',  # No video
                        '-ar', '16000',  # 16kHz sample rate (good for speech)
                        '-ac', '1',  # Mono
                        '-b:a', bitrate,  # Dynamic bitrate
                        '-f', 'mp3',
                        compressed_path
                    ], capture_output=True, text=True, timeout=300)
                    
                    if compress_result.returncode != 0:
                        print(f"❌ ffmpeg conversion failed: {compress_result.stderr}")
                        # Check if it's because no audio stream
                        if 'does not contain any stream' in compress_result.stderr or 'Output file #0 does not contain' in compress_result.stderr:
                            raise Exception("このファイルには音声トラックが含まれていません。音声付きで録画するか、音声ファイルをアップロードしてください。")
                        raise Exception(f"音声変換に失敗しました: {compress_result.stderr[-300:]}")
                    
                    # Check converted size
                    converted_size = Path(compressed_path).stat().st_size
                    print(f"✅ Converted: {len(audio_data)} bytes → {converted_size} bytes (bitrate: {bitrate})")
                    
                    # If still too large, try with minimum bitrate
                    if converted_size > WHISPER_MAX_SIZE:
                        print(f"⚠️ Still too large ({converted_size // 1024 // 1024}MB), retrying with minimum bitrate (16k)...")
                        compress_result2 = subprocess.run([
                            'ffmpeg', '-y', '-i', tmp_path,
                            '-vn', '-ar', '16000', '-ac', '1',
                            '-b:a', '16k',  # Minimum bitrate for speech
                            '-f', 'mp3',
                            compressed_path
                        ], capture_output=True, text=True, timeout=300)
                        
                        if compress_result2.returncode == 0:
                            converted_size = Path(compressed_path).stat().st_size
                            print(f"✅ Re-converted with 16k: {converted_size} bytes")
                    
                    if converted_size > WHISPER_MAX_SIZE:
                        raise Exception(f"変換後もファイルが大きすぎます（{converted_size // 1024 // 1024}MB）。音声が長すぎます（最大約3時間まで）。より短い音声ファイルを使用してください。")
                    
                    upload_path = compressed_path
                
                try:
                    # Call OpenAI Whisper API
                    # Use curl for multipart upload (simpler than urllib for files)
                    result = subprocess.run([
                        'curl', '-s',
                        'https://api.openai.com/v1/audio/transcriptions',
                        '-H', f'Authorization: Bearer {api_key}',
                        '-F', f'file=@{upload_path}',
                        '-F', 'model=whisper-1',
                        '-F', 'language=ja',
                        '-F', 'response_format=json'
                    ], capture_output=True, text=True, timeout=300)
                    
                    print(f"🔊 Whisper API response: {result.stdout[:200] if result.stdout else result.stderr}")
                    
                    if result.returncode != 0:
                        raise Exception(f"Whisper API call failed: {result.stderr}")
                    
                    response_data = json.loads(result.stdout)
                    
                    # Check for API errors
                    if 'error' in response_data:
                        raise Exception(f"Whisper API error: {response_data['error'].get('message', response_data['error'])}")
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "text": response_data.get('text', ''),
                        "success": True
                    }).encode('utf-8'))
                    
                finally:
                    # Clean up temp files
                    for path in [tmp_path, compressed_path]:
                        if path and Path(path).exists():
                            Path(path).unlink()
                    
            except Exception as e:
                print(f"❌ Transcription error: {e}")
                import traceback
                traceback.print_exc()
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
