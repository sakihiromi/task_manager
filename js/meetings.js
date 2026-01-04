// ===================================
// Meetings Management - Teams Integration
// ===================================

const MeetingsManager = {
    STORAGE_KEY: 'meetings_data_v1',
    meetings: [],
    _saveDebounceTimer: null,

    async init() {
        // サーバーから読み込みを試みる
        const serverLoaded = await this.loadFromServer();
        
        if (!serverLoaded) {
            console.log('📦 会議データ: サーバー接続失敗 - ローカルストレージを使用');
        this.loadFromStorage();
        }
    },

    async loadFromServer() {
        try {
            const response = await fetch('/api/data/meetings');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            
            if (data && data.length > 0) {
                this.meetings = data;
                console.log(`✅ サーバーから会議を読み込み: ${this.meetings.length}件`);
            } else {
                // サーバーにデータがない場合、ローカルから移行
                this.loadFromStorage();
                if (this.meetings.length > 0) {
                    console.log(`📤 ローカルの会議をサーバーに移行: ${this.meetings.length}件`);
                    this.saveToServer();
                }
            }
            return true;
        } catch (error) {
            console.warn('⚠️ 会議のサーバー読み込みに失敗:', error.message);
            return false;
        }
    },

    saveToServer() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        
        this._saveDebounceTimer = setTimeout(async () => {
            try {
                const response = await fetch('/api/data/meetings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.meetings)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                console.log('💾 会議をサーバーに保存しました');
            } catch (error) {
                console.warn('⚠️ 会議のサーバー保存に失敗:', error.message);
            }
        }, 300);
        
        // ローカルにも即座に保存（バックアップ）
        this._saveToLocalStorage();
    },

    _saveToLocalStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.meetings));
        } catch (error) {
            console.error('会議のローカル保存に失敗:', error);
        }
    },

    loadFromStorage() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            try {
                this.meetings = JSON.parse(data);
            } catch (error) {
                console.error('会議データの読み込みに失敗:', error);
                this.meetings = [];
            }
        } else {
            this.meetings = [];
        }
    },

    saveToStorage() {
        this._saveToLocalStorage();
        this.saveToServer();
    },

    generateId() {
        return 'meeting_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    addMeeting(data) {
        const meeting = {
            id: this.generateId(),
            title: data.title,
            datetime: data.datetime || new Date().toISOString(),
            project: data.project || '',
            participants: data.participants || '',
            transcript: data.transcript || '',
            summary: data.summary || '',
            minutes: data.minutes || '',
            actionItems: data.actionItems || [],
            teamsId: data.teamsId || null,
            teamsRecordingUrl: data.teamsRecordingUrl || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.meetings.unshift(meeting);
        this.saveToStorage();
        return meeting;
    },

    updateMeeting(id, updates) {
        const index = this.meetings.findIndex(m => m.id === id);
        if (index !== -1) {
            this.meetings[index] = {
                ...this.meetings[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveToStorage();
            return this.meetings[index];
        }
        return null;
    },

    deleteMeeting(id) {
        const index = this.meetings.findIndex(m => m.id === id);
        if (index !== -1) {
            this.meetings.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    },

    getMeeting(id) {
        return this.meetings.find(m => m.id === id);
    },

    getAllMeetings() {
        return this.meetings;
    },

    getRecentMeetings(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return this.meetings.filter(m => new Date(m.datetime) >= cutoff);
    },

    getMeetingsWithActions() {
        return this.meetings.filter(m => m.actionItems && m.actionItems.length > 0);
    },

    searchMeetings(query) {
        const q = query.toLowerCase();
        return this.meetings.filter(m =>
            m.title.toLowerCase().includes(q) ||
            m.project.toLowerCase().includes(q) ||
            m.participants.toLowerCase().includes(q) ||
            (m.transcript && m.transcript.toLowerCase().includes(q))
        );
    }
};

// ===================================
// Teams Integration
// ===================================

const TeamsIntegration = {
    isConnected: false,
    accessToken: null,

    // Microsoft Graph API endpoints
    GRAPH_BASE: 'https://graph.microsoft.com/v1.0',
    
    // Check connection status on load
    init() {
        const token = localStorage.getItem('teams_access_token');
        if (token) {
            this.accessToken = token;
            this.isConnected = true;
            this.updateUI();
        }
    },

    async connect() {
        // In a real implementation, this would use MSAL for OAuth
        // For demo purposes, we'll show a configuration modal
        
        const clientId = prompt('Microsoft Azure App Client ID を入力してください:\n\n(Azure AD でアプリ登録が必要です)');
        if (!clientId) return;

        // Show instructions
        alert(`Teams連携を設定するには以下が必要です:

1. Azure AD でアプリを登録
2. Microsoft Graph API の権限を追加:
   - OnlineMeetings.Read
   - Calendars.Read
   - User.Read

3. リダイレクト URI を設定

詳細は Microsoft の開発者ドキュメントをご確認ください。

現在はデモモードで動作します。`);

        // Demo mode - simulate connection
        this.isConnected = true;
        localStorage.setItem('teams_connected', 'true');
        this.updateUI();
    },

    disconnect() {
        this.isConnected = false;
        this.accessToken = null;
        localStorage.removeItem('teams_access_token');
        localStorage.removeItem('teams_connected');
        this.updateUI();
    },

    updateUI() {
        const statusEl = document.getElementById('teams-status');
        const bannerEl = document.getElementById('teams-banner');
        const connectBtn = document.getElementById('teams-connect-btn');

        if (statusEl) {
            if (this.isConnected) {
                statusEl.innerHTML = `
                    <div class="status-indicator connected"></div>
                    <span>Teams接続済み</span>
                `;
            } else {
                statusEl.innerHTML = `
                    <div class="status-indicator disconnected"></div>
                    <span>Teams未接続</span>
                `;
            }
        }

        if (bannerEl) {
            bannerEl.classList.toggle('connected', this.isConnected);
        }

        if (connectBtn) {
            connectBtn.innerHTML = this.isConnected 
                ? '<span class="icon">✅</span><span>接続済み</span>'
                : '<span class="icon">🔗</span><span>Teamsに接続</span>';
        }
    },

    async syncMeetings() {
        if (!this.isConnected) {
            alert('Teamsに接続してください');
            return;
        }

        // In a real implementation, this would fetch meetings from Microsoft Graph
        alert('Teams会議を同期中...\n\nデモモードでは、手動で会議を追加してください。');
    },

    async getTranscript(meetingId) {
        // In a real implementation, this would fetch transcript from Teams
        return null;
    }
};

// ===================================
// Meetings UI
// ===================================

const MeetingsUI = {
    currentFilter: 'all',
    currentEditingId: null,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],

    async init() {
        await MeetingsManager.init();
        TeamsIntegration.init();
        this.renderMeetings();
        this.updateCounts();
        this.attachEvents();
    },

    attachEvents() {
        // Form submission
        document.getElementById('meeting-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMeeting();
        });

        // Modal close on backdrop click
        document.getElementById('meeting-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'meeting-modal') this.closeModal();
        });

        // Drag and drop for audio files
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) this.handleAudioFile(file);
            });
        }

        // File input
        document.getElementById('audio-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleAudioFile(file);
        });
    },

    setFilter(filter) {
        this.currentFilter = filter;

        document.querySelectorAll('.filter-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === filter);
        });

        this.renderMeetings();
    },

    search(query) {
        this.renderMeetings(query);
    },

    renderMeetings(searchQuery = '') {
        const container = document.getElementById('meetings-list');
        if (!container) return;

        let meetings = MeetingsManager.getAllMeetings();

        // Apply filter
        switch (this.currentFilter) {
            case 'recent':
                meetings = MeetingsManager.getRecentMeetings(7);
                break;
            case 'action':
                meetings = MeetingsManager.getMeetingsWithActions();
                break;
        }

        // Apply search
        if (searchQuery) {
            meetings = meetings.filter(m =>
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.project.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (meetings.length === 0) {
            container.innerHTML = `
                <div class="empty-meetings">
                    <span class="icon">🎙️</span>
                    <p class="message">会議がありません</p>
                    <button class="btn btn-primary" onclick="MeetingsUI.openNewMeetingModal()">+ 新規会議メモ</button>
                </div>
            `;
            return;
        }

        container.innerHTML = meetings.map(m => this.createMeetingCardHTML(m)).join('');
    },

    createMeetingCardHTML(meeting) {
        const datetime = new Date(meeting.datetime);
        const dateStr = datetime.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
        const timeStr = datetime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        const hasActions = meeting.actionItems && meeting.actionItems.length > 0;
        const hasSummary = meeting.summary && meeting.summary.length > 0;
        const isTeams = meeting.teamsId !== null;

        return `
            <div class="meeting-card" onclick="MeetingsUI.openMeeting('${meeting.id}')">
                <div class="meeting-icon">🎙️</div>
                <div class="meeting-info">
                    <div class="meeting-title">${this.escapeHTML(meeting.title)}</div>
                    <div class="meeting-meta">
                        <span>📅 ${dateStr} ${timeStr}</span>
                        ${meeting.project ? `<span>📂 ${this.escapeHTML(meeting.project)}</span>` : ''}
                        ${meeting.participants ? `<span>👥 ${this.escapeHTML(meeting.participants)}</span>` : ''}
                    </div>
                    <div class="meeting-tags">
                        ${hasSummary ? '<span class="meeting-tag">✨ 要約済み</span>' : ''}
                        ${hasActions ? `<span class="meeting-tag has-actions">⚡ ${meeting.actionItems.length} アクション</span>` : ''}
                        ${isTeams ? '<span class="meeting-tag teams">Teams</span>' : ''}
                    </div>
                </div>
                <div class="meeting-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); MeetingsUI.deleteMeeting('${meeting.id}')" title="削除">🗑️</button>
                </div>
            </div>
        `;
    },

    updateCounts() {
        const all = MeetingsManager.getAllMeetings().length;
        document.getElementById('filter-all').textContent = all;
    },

    openNewMeetingModal() {
        this.currentEditingId = null;
        document.getElementById('meeting-form').reset();
        document.getElementById('meeting-modal-title').textContent = '🎙️ 新規会議メモ';
        document.getElementById('btn-delete-meeting').style.display = 'none';
        document.getElementById('action-items-list').innerHTML = '';
        document.getElementById('meeting-summary').textContent = '';
        document.getElementById('meeting-minutes').textContent = '';
        
        // Set default datetime to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('meeting-datetime').value = now.toISOString().slice(0, 16);
        
        document.getElementById('meeting-modal').classList.add('active');
    },

    openMeeting(id) {
        const meeting = MeetingsManager.getMeeting(id);
        if (!meeting) return;

        this.currentEditingId = id;
        
        document.getElementById('meeting-title').value = meeting.title;
        document.getElementById('meeting-datetime').value = meeting.datetime.slice(0, 16);
        document.getElementById('meeting-project').value = meeting.project || '';
        document.getElementById('meeting-participants').value = meeting.participants || '';
        document.getElementById('meeting-transcript').value = meeting.transcript || '';
        document.getElementById('meeting-summary').textContent = meeting.summary || '';
        document.getElementById('meeting-minutes').textContent = meeting.minutes || '';
        
        // Render action items
        this.renderActionItems(meeting.actionItems || []);
        
        document.getElementById('meeting-modal-title').textContent = '🎙️ 会議メモを編集';
        document.getElementById('btn-delete-meeting').style.display = 'block';
        document.getElementById('meeting-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('meeting-modal').classList.remove('active');
        this.currentEditingId = null;
    },

    saveMeeting() {
        const actionItems = this.collectActionItems();
        
        const data = {
            title: document.getElementById('meeting-title').value.trim(),
            datetime: document.getElementById('meeting-datetime').value,
            project: document.getElementById('meeting-project').value.trim(),
            participants: document.getElementById('meeting-participants').value.trim(),
            transcript: document.getElementById('meeting-transcript').value.trim(),
            summary: document.getElementById('meeting-summary').textContent.trim(),
            minutes: document.getElementById('meeting-minutes').textContent.trim(),
            actionItems: actionItems
        };

        if (this.currentEditingId) {
            MeetingsManager.updateMeeting(this.currentEditingId, data);
        } else {
            MeetingsManager.addMeeting(data);
        }

        this.closeModal();
        this.renderMeetings();
        this.updateCounts();
    },

    deleteMeeting(id = null) {
        const meetingId = id || this.currentEditingId;
        if (!meetingId) return;

        if (!confirm('この会議メモを削除しますか？')) return;

        MeetingsManager.deleteMeeting(meetingId);
        this.closeModal();
        this.renderMeetings();
        this.updateCounts();
    },

    // ===================================
    // Action Items
    // ===================================

    addActionItem(title = '', assignee = '', dueDate = '') {
        const container = document.getElementById('action-items-list');
        const id = Date.now();
        
        const html = `
            <div class="action-item-row" data-id="${id}">
                <span>⚡</span>
                <input type="text" placeholder="アクション内容" value="${this.escapeHTML(title)}" class="action-title">
                <input type="text" placeholder="担当者" value="${this.escapeHTML(assignee)}" class="assignee">
                <input type="date" value="${dueDate}" class="due-date">
                <button type="button" class="btn-icon" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
    },

    renderActionItems(items) {
        const container = document.getElementById('action-items-list');
        container.innerHTML = '';
        
        items.forEach(item => {
            this.addActionItem(item.title, item.assignee, item.dueDate);
        });
    },

    collectActionItems() {
        const items = [];
        document.querySelectorAll('.action-item-row').forEach(row => {
            const title = row.querySelector('.action-title').value.trim();
            if (title) {
                items.push({
                    title: title,
                    assignee: row.querySelector('.assignee').value.trim(),
                    dueDate: row.querySelector('.due-date').value,
                    completed: false
                });
            }
        });
        return items;
    },

    // ===================================
    // AI Features
    // ===================================

    async generateSummary() {
        const transcript = document.getElementById('meeting-transcript').value.trim();
        if (!transcript) {
            alert('会議メモ/書き起こしを入力してください');
            return;
        }

        const summaryEl = document.getElementById('meeting-summary');
        summaryEl.textContent = '✨ 要約を生成中...';
        document.getElementById('summary-section').style.display = 'block';

        try {
            const response = await fetch('http://localhost:8009/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: transcript, type: 'summary' })
            });

            if (!response.ok) throw new Error('API error');

            const data = await response.json();
            summaryEl.textContent = data.result || '要約を生成できませんでした';
        } catch (error) {
            console.error('Summary error:', error);
            summaryEl.textContent = '要約の生成に失敗しました。サーバーが起動しているか確認してください。';
        }
    },

    async generateMinutes() {
        const transcript = document.getElementById('meeting-transcript').value.trim();
        const title = document.getElementById('meeting-title').value.trim();
        const participants = document.getElementById('meeting-participants').value.trim();

        if (!transcript) {
            alert('会議メモ/書き起こしを入力してください');
            return;
        }

        const minutesEl = document.getElementById('meeting-minutes');
        minutesEl.textContent = '📋 議事録を生成中...';
        document.getElementById('minutes-section').style.display = 'block';

        try {
            const response = await fetch('http://localhost:8009/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: transcript,
                    type: 'minutes',
                    title: title,
                    participants: participants
                })
            });

            if (!response.ok) throw new Error('API error');

            const data = await response.json();
            minutesEl.textContent = data.result || '議事録を生成できませんでした';
        } catch (error) {
            console.error('Minutes error:', error);
            minutesEl.textContent = '議事録の生成に失敗しました。サーバーが起動しているか確認してください。';
        }
    },

    async extractActions() {
        const transcript = document.getElementById('meeting-transcript').value.trim();
        if (!transcript) {
            alert('会議メモ/書き起こしを入力してください');
            return;
        }

        try {
            const response = await fetch('http://localhost:8009/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: transcript, type: 'actions' })
            });

            if (!response.ok) throw new Error('API error');

            const data = await response.json();
            
            if (data.actions && Array.isArray(data.actions)) {
                document.getElementById('action-items-list').innerHTML = '';
                data.actions.forEach(action => {
                    this.addActionItem(action.title, action.assignee || '', '');
                });
            }
        } catch (error) {
            console.error('Actions error:', error);
            alert('アクション抽出に失敗しました。サーバーが起動しているか確認してください。');
        }
    },

    // ===================================
    // Recording
    // ===================================
    
    recordingStartTime: null,
    recordingTimer: null,
    recordingType: null, // 'mic' or 'system'

    async startRecording() {
        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupRecorder(stream, 'mic');
        } catch (error) {
            console.error('Recording error:', error);
            alert('マイクへのアクセスが拒否されました。\n\nブラウザの設定でマイクへのアクセスを許可してください。');
        }
    },
    
    async startSystemAudioRecording() {
        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        try {
            // Request display media with audio (screen share + system audio)
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true, // Required for getDisplayMedia
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Check if audio track is available
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                stream.getTracks().forEach(track => track.stop());
                alert('システム音声を共有してください。\n\n画面共有ダイアログで「タブの音声を共有」または「システム音声を共有」にチェックを入れてください。\n\n※ Chromeタブを共有すると、そのタブの音声を録音できます。');
                return;
            }
            
            // Create audio-only stream
            const audioStream = new MediaStream(audioTracks);
            
            // Stop video tracks (we only need audio)
            stream.getVideoTracks().forEach(track => track.stop());
            
            this.setupRecorder(audioStream, 'system');
            
        } catch (error) {
            console.error('System audio recording error:', error);
            if (error.name === 'NotAllowedError') {
                alert('画面共有がキャンセルされました。');
            } else {
                alert('システム音声の録音に失敗しました。\n\nChrome/Edgeの最新版をお使いください。');
            }
        }
    },
    
    setupRecorder(stream, type) {
        this.recordingType = type;
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.handleAudioFile(audioBlob);
        };

        this.mediaRecorder.start(1000);
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        
        // Start timer
        this.recordingTimer = setInterval(() => {
            this.updateRecordingTime();
        }, 1000);
        
        // Update UI
        this.showRecordingUI(type);
    },
    
    showRecordingUI(type) {
        const banner = document.getElementById('live-recording-banner');
        const standaloneBanner = document.getElementById('standalone-banner');
        
        if (banner) {
            banner.classList.add('active');
            const typeEl = banner.querySelector('.recording-type');
            if (typeEl) {
                typeEl.textContent = type === 'system' 
                    ? '🖥️ システム音声を録音中' 
                    : '🎤 マイクで録音中';
            }
        }
        if (standaloneBanner) standaloneBanner.style.display = 'none';
        
        // Update buttons
        const micBtn = document.getElementById('record-btn');
        const sysBtn = document.getElementById('system-record-btn');
        
        if (type === 'mic' && micBtn) {
            micBtn.innerHTML = '⏹️ 録音停止';
            micBtn.classList.add('recording');
        }
        if (type === 'system' && sysBtn) {
            sysBtn.innerHTML = '⏹️ 録音停止';
            sysBtn.classList.add('recording');
        }
    },
    
    updateRecordingTime() {
        if (!this.recordingStartTime) return;
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        const timeEl = document.getElementById('recording-time');
        if (timeEl) timeEl.textContent = `${minutes}:${seconds}`;
    },

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            // Stop timer
            if (this.recordingTimer) {
                clearInterval(this.recordingTimer);
                this.recordingTimer = null;
            }
            this.recordingStartTime = null;
            
            // Hide recording banner
            const banner = document.getElementById('live-recording-banner');
            const standaloneBanner = document.getElementById('standalone-banner');
            if (banner) banner.classList.remove('active');
            if (standaloneBanner) standaloneBanner.style.display = 'flex';

            // Update buttons
            const micBtn = document.getElementById('record-btn');
            const sysBtn = document.getElementById('system-record-btn');
            if (micBtn) {
                micBtn.innerHTML = '🎤 マイク録音';
                micBtn.classList.remove('recording');
            }
            if (sysBtn) {
                sysBtn.innerHTML = '🖥️ システム音声';
                sysBtn.classList.remove('recording');
            }
            
            this.recordingType = null;
        }
    },

    // ===================================
    // Transcription
    // ===================================

    openTranscriptionModal() {
        document.getElementById('transcription-modal').classList.add('active');
        document.getElementById('transcription-result').style.display = 'none';
        document.getElementById('transcription-progress').style.display = 'none';
        document.getElementById('upload-area').style.display = 'flex';
    },

    async handleAudioFile(file) {
        const uploadArea = document.getElementById('upload-area');
        const progressEl = document.getElementById('transcription-progress');
        const progressBar = document.getElementById('transcription-progress-bar');
        const resultEl = document.getElementById('transcription-result');
        const textEl = document.getElementById('transcription-text');
        const progressText = document.getElementById('transcription-progress-text');
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (progressEl) progressEl.style.display = 'block';
        if (progressBar) progressBar.style.width = '10%';
        if (progressText) progressText.textContent = '音声を処理中...';

        try {
            // Create FormData with audio file
            const formData = new FormData();
            formData.append('audio', file, 'recording.webm');
            
            if (progressBar) progressBar.style.width = '30%';
            if (progressText) progressText.textContent = 'Whisper APIで書き起こし中...';
            
            const response = await fetch('http://localhost:8009/api/transcribe', {
                method: 'POST',
                body: formData
            });
            
            if (progressBar) progressBar.style.width = '80%';
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (progressBar) progressBar.style.width = '100%';
            
            setTimeout(() => {
                if (progressEl) progressEl.style.display = 'none';
                if (resultEl) resultEl.style.display = 'block';
                
                if (data.text && data.text.trim()) {
                    textEl.value = data.text;
                } else {
                    textEl.value = '（音声が検出されませんでした）';
                }
            }, 300);
            
        } catch (error) {
            console.error('Transcription error:', error);
            
            if (progressEl) progressEl.style.display = 'none';
            if (resultEl) resultEl.style.display = 'block';
            
            if (error.message.includes('API Key')) {
                textEl.value = '❌ エラー: OpenAI API Keyが設定されていません。\n\n.envファイルにOPENAI_API_KEYを設定してください。';
            } else {
                textEl.value = `❌ 書き起こしエラー: ${error.message}\n\nサーバーが起動しているか確認してください。\n(python server.py)`;
            }
        }
    },

    copyTranscription() {
        const text = document.getElementById('transcription-text').value;
        navigator.clipboard.writeText(text);
        alert('コピーしました');
    },

    createMeetingFromTranscription() {
        const transcript = document.getElementById('transcription-text').value;
        document.getElementById('transcription-modal').classList.remove('active');
        
        this.openNewMeetingModal();
        document.getElementById('meeting-transcript').value = transcript;
    },

    // ===================================
    // Utility
    // ===================================

    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await MeetingsUI.init();
});
