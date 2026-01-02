// ===================================
// Memo UI Manager - Meeting Notes Display
// ===================================

const MemoUI = {
    currentEditingMemoId: null,

    init() {
        MemoManager.init();
        this.renderMemos();
        this.attachEvents();
    },

    attachEvents() {
        // Memo form submit
        const form = document.getElementById('memo-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Modal close on overlay click
        const modal = document.getElementById('memo-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'memo-modal') this.closeModal();
            });
        }
    },

    renderMemos() {
        const container = document.getElementById('memo-list');
        if (!container) return;

        const allMemos = MemoManager.getAllMemos();
        
        if (allMemos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <div class="message">メモがありません</div>
                    <button class="btn btn-primary" onclick="MemoUI.openModal()" style="margin-top: 12px;">
                        + 新規メモ
                    </button>
                </div>
            `;
            return;
        }

        // プロジェクトごとにグループ化
        const projects = MemoManager.getProjects();
        const memosWithoutProject = MemoManager.getMemosWithoutProject();

        let html = '';

        // プロジェクトごとに表示
        projects.forEach(projectName => {
            const projectMemos = MemoManager.getMemosByProject(projectName);
            const sortedMemos = this.sortMemos(projectMemos);

            html += `
                <div class="memo-project-group" data-project="${this.escapeHTML(projectName)}">
                    <div class="memo-project-header" onclick="MemoUI.toggleProject(this)">
                        <div class="project-toggle">▼</div>
                        <div class="project-info">
                            <div class="project-name">📁 ${this.escapeHTML(projectName)}</div>
                            <div class="memo-count">${projectMemos.length}件のメモ</div>
                        </div>
                        <button class="btn-icon project-add" onclick="event.stopPropagation(); MemoUI.openModal(null, '${this.escapeHTML(projectName)}')" title="メモを追加">+</button>
                    </div>
                    <div class="memo-list-items">
                        ${sortedMemos.map(m => this.createMemoHTML(m)).join('')}
                    </div>
                </div>
            `;
        });

        // プロジェクトに属さないメモ
        if (memosWithoutProject.length > 0) {
            const sortedMemos = this.sortMemos(memosWithoutProject);
            html += `
                <div class="memo-project-group uncategorized">
                    <div class="memo-project-header" onclick="MemoUI.toggleProject(this)">
                        <div class="project-toggle">▼</div>
                        <div class="project-info">
                            <div class="project-name" style="color: var(--text-muted);">📌 その他のメモ</div>
                        </div>
                    </div>
                    <div class="memo-list-items">
                        ${sortedMemos.map(m => this.createMemoHTML(m)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    sortMemos(memos) {
        return [...memos].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    },

    createMemoHTML(memo) {
        const typeIcons = {
            meeting: '🗣️',
            note: '📝',
            idea: '💡'
        };
        const typeLabels = {
            meeting: 'Meeting',
            note: 'Note',
            idea: 'Idea'
        };

        const icon = typeIcons[memo.type] || '📝';
        const label = typeLabels[memo.type] || 'Note';
        const dateStr = this.formatDate(memo.date);
        const preview = memo.content ? memo.content.substring(0, 100) + (memo.content.length > 100 ? '...' : '') : '';

        return `
            <div class="memo-item" onclick="MemoUI.openModal('${memo.id}')">
                <div class="memo-icon">${icon}</div>
                <div class="memo-content">
                    <div class="memo-title">${this.escapeHTML(memo.title)}</div>
                    <div class="memo-preview">${this.escapeHTML(preview)}</div>
                    <div class="memo-meta">
                        <span class="memo-type-badge">${label}</span>
                        <span>📅 ${dateStr}</span>
                        ${memo.participants && memo.participants.length > 0 ? 
                            `<span>👥 ${memo.participants.length}人</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    openModal(memoId = null, projectName = null) {
        const modal = document.getElementById('memo-modal');
        const form = document.getElementById('memo-form');
        const deleteBtn = document.getElementById('btn-delete-memo');

        form.reset();
        this.currentEditingMemoId = memoId;

        if (memoId) {
            // 編集モード
            const memo = MemoManager.getMemoById(memoId);
            if (memo) {
                document.getElementById('memo-title').value = memo.title;
                document.getElementById('memo-project').value = memo.projectName || '';
                document.getElementById('memo-type').value = memo.type;
                document.getElementById('memo-date').value = memo.date;
                document.getElementById('memo-participants').value = (memo.participants || []).join(', ');
                document.getElementById('memo-content').value = memo.content;
                deleteBtn.style.display = 'block';
            }
        } else {
            // 新規作成モード
            document.getElementById('memo-date').value = new Date().toISOString().split('T')[0];
            if (projectName) {
                document.getElementById('memo-project').value = projectName;
            }
            deleteBtn.style.display = 'none';
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('memo-modal').classList.remove('active');
        this.currentEditingMemoId = null;
    },

    handleFormSubmit(e) {
        e.preventDefault();

        const participantsStr = document.getElementById('memo-participants').value;
        const participants = participantsStr ? participantsStr.split(',').map(p => p.trim()).filter(p => p) : [];

        const data = {
            title: document.getElementById('memo-title').value.trim(),
            projectName: document.getElementById('memo-project').value.trim(),
            type: document.getElementById('memo-type').value,
            date: document.getElementById('memo-date').value,
            participants: participants,
            content: document.getElementById('memo-content').value.trim()
        };

        if (this.currentEditingMemoId) {
            MemoManager.updateMemo(this.currentEditingMemoId, data);
        } else {
            MemoManager.addMemo(data);
        }

        this.renderMemos();
        this.closeModal();
    },

    deleteMemo() {
        if (!this.currentEditingMemoId) return;

        if (confirm('このメモを削除しますか？')) {
            MemoManager.deleteMemo(this.currentEditingMemoId);
            this.renderMemos();
            this.closeModal();
        }
    },

    toggleProject(header) {
        const group = header.closest('.memo-project-group');
        group.classList.toggle('collapsed');
        const toggle = header.querySelector('.project-toggle');
        toggle.textContent = group.classList.contains('collapsed') ? '▶' : '▼';
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    },

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
