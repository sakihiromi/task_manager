// ===================================
// Productivity App - Main Logic (Enhanced)
// ===================================

let currentEditingTaskId = null;
let currentFilter = 'all';
let currentSort = 'priority';
let hideCompleted = false;
let focusModeActive = false;

// 定数
const PRIORITY_CONFIG = {
    high: { name: '高', class: 'badge-high', icon: '🔴' },
    medium: { name: '中', class: 'badge-medium', icon: '🟡' },
    low: { name: '低', class: 'badge-low', icon: '🟢' }
};

const SUBCATEGORY_OPTIONS = {
    research: [
        { value: 'experiment', label: '🧪 実験' },
        { value: 'paper', label: '📄 論文' },
        { value: 'survey', label: '🔍 調査' }
    ],
    certification: [
        { value: 'study', label: '📖 学習' },
        { value: 'practice', label: '✏️ 演習' },
        { value: 'mock', label: '📝 模試' }
    ],
    work: [],
    private: []
};

// ユーティリティ
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

const escapeHTML = (str) => {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // データ初期化
    TaskManager.init();
    
    // ProjectsManager初期化（data.jsで定義）
    if (typeof ProjectsManager !== 'undefined') {
        ProjectsManager.init();
    }
    
    StatsManager.updateStatsUI();

    if (typeof CalendarManager !== 'undefined') {
        CalendarManager.init();
    }

    // AI Planner 初期化
    if (typeof AIPlanner !== 'undefined') {
        AIPlanner.init();
    }

    renderAllTasks();
    renderMeetingMemos();
    renderProjectsSummary();

    // Event Listeners
    document.getElementById('task-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('task-category').addEventListener('change', handleCategoryChange);
    
    const memoForm = document.getElementById('memo-form');
    if (memoForm) {
        memoForm.addEventListener('submit', handleMemoFormSubmit);
    }

    // Close modal on overlay click
    document.getElementById('task-modal').addEventListener('click', (e) => {
        if (e.target.id === 'task-modal') closeModal();
    });
    
    const memoModal = document.getElementById('memo-modal');
    if (memoModal) {
        memoModal.addEventListener('click', (e) => {
            if (e.target.id === 'memo-modal') closeMemoModal();
        });
    }

    // Initial subcategory setup
    handleCategoryChange();
});

// ===================================
// UI Rendering
// ===================================

function renderAllTasks() {
    ['work', 'research', 'certification', 'private'].forEach(renderCategoryTasks);
}

function renderCategoryTasks(category) {
    const container = document.getElementById(`${category}-tasks`);
    if (!container) return;

    const allTasks = TaskManager.getTasksByCategory(category);
    
    if (allTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <div class="message">タスクがありません</div>
            </div>
        `;
        return;
    }

    // プロジェクトごとにグループ化
    const projects = TaskManager.getProjectsByCategory(category);
    const tasksWithoutProject = TaskManager.getTasksWithoutProject(category);
    
    let html = '';

    // プロジェクトごとに表示
    projects.forEach(projectName => {
        const projectTasks = TaskManager.getTasksByProject(category, projectName);
        const sortedTasks = sortTasks(projectTasks);
        const completedCount = projectTasks.filter(t => t.completed).length;
        const totalCount = projectTasks.length;
        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        html += `
            <div class="project-group" data-project="${escapeHTML(projectName)}">
                <div class="project-header" onclick="toggleProject(this)">
                    <div class="project-toggle">▼</div>
                    <div class="project-info">
                        <div class="project-name">${escapeHTML(projectName)}</div>
                        <div class="project-progress">
                            <span class="project-count">${completedCount}/${totalCount}</span>
                            <div class="project-progress-bar">
                                <div class="project-progress-fill" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                    <button class="btn-icon project-add" onclick="event.stopPropagation(); openModal('${category}', null, '${escapeHTML(projectName)}')" title="タスクを追加">+</button>
                </div>
                <div class="project-tasks">
                    ${sortedTasks.map(createTaskHTML).join('')}
                </div>
            </div>
        `;
    });

    // プロジェクトに属さないタスク
    if (tasksWithoutProject.length > 0) {
        const sortedTasks = sortTasks(tasksWithoutProject);
        if (projects.length > 0) {
            html += `
                <div class="project-group uncategorized">
                    <div class="project-header" onclick="toggleProject(this)">
                        <div class="project-toggle">▼</div>
                        <div class="project-info">
                            <div class="project-name" style="color: var(--text-muted);">📌 その他</div>
                        </div>
                    </div>
                    <div class="project-tasks">
                        ${sortedTasks.map(createTaskHTML).join('')}
                    </div>
                </div>
            `;
        } else {
            html += sortedTasks.map(createTaskHTML).join('');
        }
    }

    container.innerHTML = html;
}

function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pOrder = { high: 0, medium: 1, low: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) {
            return pOrder[a.priority] - pOrder[b.priority];
        }
        if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
        }
        return a.deadline ? -1 : 1;
    });
}

function toggleProject(header) {
    const group = header.closest('.project-group');
    group.classList.toggle('collapsed');
    const toggle = header.querySelector('.project-toggle');
    toggle.textContent = group.classList.contains('collapsed') ? '▶' : '▼';
}

function createTaskHTML(task) {
    const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const deadlineText = task.deadline ? formatDate(task.deadline) : '';
    
    // Check if deadline is overdue
    let deadlineClass = '';
    if (task.deadline && !task.completed) {
        const deadline = new Date(task.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadline < today) {
            deadlineClass = 'style="color: var(--accent-danger);"';
        }
    }

    let subtaskStatus = '';
    if (task.subtasks && task.subtasks.length > 0) {
        const completedSub = task.subtasks.filter(s => s.completed).length;
        const percent = Math.round((completedSub / task.subtasks.length) * 100);
        subtaskStatus = `
            <span style="display: flex; align-items: center; gap: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-muted);">${completedSub}/${task.subtasks.length}</span>
                <div style="width: 40px; height: 4px; background: var(--border-subtle); border-radius: 2px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: var(--accent-success); transition: width 0.3s;"></div>
                </div>
            </span>
        `;
    }

    const aiTag = task.aiGenerated ? '<span style="font-size: 0.65rem; background: rgba(99,102,241,0.2); color: var(--text-accent); padding: 2px 6px; border-radius: 4px;">AI</span>' : '';

    // Determine special classes
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.deadline && !task.completed && task.deadline < today;
    const isDueToday = task.deadline === today;
    const isHighPriority = task.priority === 'high' && !task.completed;
    
    const specialClasses = [
        task.completed ? 'completed' : '',
        isOverdue ? 'overdue' : '',
        isDueToday ? 'due-today' : '',
        isHighPriority ? 'high-priority' : ''
    ].filter(Boolean).join(' ');

    return `
        <div class="task-item-pro ${specialClasses}" data-task-id="${task.id}" onclick="openModal(null, '${task.id}')">
            <div class="task-check-custom" onclick="event.stopPropagation(); toggleTask('${task.id}')">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="task-content-wrapper">
                <div class="task-title-text">
                    ${escapeHTML(task.title)} ${aiTag}
                </div>
                <div class="task-meta-info">
                    <span class="badge ${priorityInfo.class}">${priorityInfo.name}</span>
                    ${deadlineText ? `<span ${deadlineClass}>📅 ${deadlineText}</span>` : ''}
                    ${subtaskStatus}
                </div>
            </div>
        </div>
    `;
}

// ===================================
// Actions
// ===================================

function toggleTask(taskId) {
    const task = TaskManager.getTaskById(taskId);
    if (task) {
        const isCompleted = !task.completed;

        TaskManager.updateTask(taskId, {
            completed: isCompleted,
            completedAt: isCompleted ? new Date().toISOString() : null
        });

        // Celebration effect for completed tasks
        if (isCompleted) {
            showCelebration();
        }

        renderAllTasks();
        StatsManager.updateStatsUI();
        if (typeof CalendarManager !== 'undefined') CalendarManager.renderCalendar();
    }
}

function showCelebration() {
    const celebration = document.createElement('div');
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 4rem;
        z-index: 9999;
        pointer-events: none;
        animation: celebrate 0.5s ease-out forwards;
    `;
    celebration.textContent = '🎉';
    document.body.appendChild(celebration);
    setTimeout(() => celebration.remove(), 600);
}

function deleteCurrentTask() {
    if (!currentEditingTaskId) return;
    
    if (confirm('このタスクを削除しますか？')) {
        TaskManager.deleteTask(currentEditingTaskId);
        renderAllTasks();
        StatsManager.updateStatsUI();
        if (typeof CalendarManager !== 'undefined') CalendarManager.renderCalendar();
        closeModal();
    }
}

function scrollToCategory(category) {
    const element = document.getElementById(`category-${category}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===================================
// Modal & Form Handling
// ===================================

function addSubtaskInput(value = '', completed = false) {
    const container = document.getElementById('subtask-list-container');
    const div = document.createElement('div');
    div.className = 'subtask-item';

    div.innerHTML = `
        <input type="checkbox" class="subtask-check-input" ${completed ? 'checked' : ''}>
        <input type="text" value="${escapeHTML(value)}" class="subtask-text-input form-control" placeholder="サブタスク...">
        <button type="button" class="btn-icon" onclick="this.parentElement.remove()" style="color: var(--accent-danger); flex-shrink: 0;">×</button>
    `;
    container.appendChild(div);
}

function openModal(category = null, taskId = null, projectName = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const subtaskContainer = document.getElementById('subtask-list-container');
    const deleteBtn = document.getElementById('btn-delete-task');

    form.reset();
    subtaskContainer.innerHTML = '';
    currentEditingTaskId = taskId;

    if (taskId) {
        // Editing existing task
        const task = TaskManager.getTaskById(taskId);
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-deadline').value = task.deadline || '';
        document.getElementById('task-project').value = task.projectName || '';

        handleCategoryChange(); // Update subcategory options first
        
        if (task.subcategory) {
            document.getElementById('task-subcategory').value = task.subcategory;
        }

        if (task.subtasks) {
            task.subtasks.forEach(st => addSubtaskInput(st.title, st.completed));
        }

        deleteBtn.style.display = 'block';
    } else {
        // Creating new task
        if (category) {
            document.getElementById('task-category').value = category;
        }
        if (projectName) {
            document.getElementById('task-project').value = projectName;
        }
        handleCategoryChange();
        deleteBtn.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('task-modal').classList.remove('active');
    currentEditingTaskId = null;
}

function handleCategoryChange() {
    const category = document.getElementById('task-category').value;
    const subcategoryGroup = document.getElementById('subcategory-group');
    const subcategorySelect = document.getElementById('task-subcategory');
    
    const options = SUBCATEGORY_OPTIONS[category] || [];
    
    if (options.length === 0) {
        subcategoryGroup.style.display = 'none';
        subcategorySelect.innerHTML = '<option value="">なし</option>';
    } else {
        subcategoryGroup.style.display = 'block';
        subcategorySelect.innerHTML = '<option value="">なし</option>' + 
            options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    const subtaskEls = document.querySelectorAll('#subtask-list-container > div');
    const subtasks = Array.from(subtaskEls).map(el => ({
        title: el.querySelector('.subtask-text-input').value.trim(),
        completed: el.querySelector('.subtask-check-input').checked
    })).filter(st => st.title);

    const data = {
        title: document.getElementById('task-title').value.trim(),
        category: document.getElementById('task-category').value,
        subcategory: document.getElementById('task-subcategory').value,
        projectName: document.getElementById('task-project').value.trim(),
        priority: document.getElementById('task-priority').value,
        deadline: document.getElementById('task-deadline').value,
        subtasks: subtasks
    };

    if (currentEditingTaskId) {
        TaskManager.updateTask(currentEditingTaskId, data);
    } else {
        TaskManager.addTask(data);
    }

    renderAllTasks();
    StatsManager.updateStatsUI();
    if (typeof CalendarManager !== 'undefined') CalendarManager.renderCalendar();

    closeModal();
}

// ===================================
// Meeting Memo Functions
// ===================================

let currentEditingMemoId = null;

function renderMeetingMemos() {
    const container = document.getElementById('meeting-memos-list');
    if (!container) return;

    const allMemos = TaskManager.getAllMemos();
    
    if (allMemos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📝</div>
                <div class="message">ミーティングメモがありません</div>
            </div>
        `;
        return;
    }

    // プロジェクトごとにグループ化
    const projects = TaskManager.getMemoProjects();
    const memosWithoutProject = TaskManager.getMemosWithoutProject();
    
    let html = '';

    // プロジェクトごとに表示
    projects.forEach(projectName => {
        const projectMemos = TaskManager.getMemosByProject(projectName);
        // 日付順にソート（新しい順）
        projectMemos.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        html += `
            <div class="project-group memo-project" data-project="${escapeHTML(projectName)}">
                <div class="project-header" onclick="toggleProject(this)">
                    <div class="project-toggle">▼</div>
                    <div class="project-info">
                        <div class="project-name">${escapeHTML(projectName)}</div>
                        <div class="project-count" style="font-size: 0.8rem; color: var(--text-muted);">${projectMemos.length}件</div>
                    </div>
                    <button class="btn-icon project-add" onclick="event.stopPropagation(); openMemoModal(null, '${escapeHTML(projectName)}')" title="メモを追加">+</button>
                </div>
                <div class="project-tasks">
                    ${projectMemos.map(createMemoHTML).join('')}
                </div>
            </div>
        `;
    });

    // プロジェクトに属さないメモ
    if (memosWithoutProject.length > 0) {
        memosWithoutProject.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (projects.length > 0) {
            html += `
                <div class="project-group memo-project uncategorized">
                    <div class="project-header" onclick="toggleProject(this)">
                        <div class="project-toggle">▼</div>
                        <div class="project-info">
                            <div class="project-name" style="color: var(--text-muted);">📌 その他</div>
                        </div>
                    </div>
                    <div class="project-tasks">
                        ${memosWithoutProject.map(createMemoHTML).join('')}
                    </div>
                </div>
            `;
        } else {
            html += memosWithoutProject.map(createMemoHTML).join('');
        }
    }

    container.innerHTML = html;
}

function createMemoHTML(memo) {
    const dateFormatted = formatDate(memo.date);
    const contentPreview = memo.content ? memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : '') : '';
    const actionCount = memo.actionItems ? memo.actionItems.length : 0;
    
    return `
        <div class="task-item-pro memo-item" onclick="openMemoModal('${memo.id}')">
            <div style="margin-right: 12px; font-size: 1.2rem;">📝</div>
            <div class="task-content-wrapper">
                <div class="task-title-text">${escapeHTML(memo.title)}</div>
                <div class="task-meta-info">
                    <span>📅 ${dateFormatted}</span>
                    ${memo.participants ? `<span>👥 ${escapeHTML(memo.participants)}</span>` : ''}
                    ${actionCount > 0 ? `<span style="color: var(--accent-warning);">⚡ ${actionCount}件のアクション</span>` : ''}
                </div>
                ${contentPreview ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${escapeHTML(contentPreview)}</div>` : ''}
            </div>
        </div>
    `;
}

function addActionItem(value = '') {
    const container = document.getElementById('action-items-container');
    const div = document.createElement('div');
    div.className = 'subtask-item';

    div.innerHTML = `
        <span style="color: var(--accent-warning); margin-right: 8px;">⚡</span>
        <input type="text" value="${escapeHTML(value)}" class="action-item-input form-control" placeholder="アクションアイテム...">
        <button type="button" class="btn-icon" onclick="this.parentElement.remove()" style="color: var(--accent-danger); flex-shrink: 0;">×</button>
    `;
    container.appendChild(div);
}

function openMemoModal(memoId = null, projectName = null) {
    const modal = document.getElementById('memo-modal');
    const form = document.getElementById('memo-form');
    const actionContainer = document.getElementById('action-items-container');
    const deleteBtn = document.getElementById('btn-delete-memo');

    form.reset();
    actionContainer.innerHTML = '';
    currentEditingMemoId = memoId;

    // 今日の日付をデフォルトに
    document.getElementById('memo-date').value = new Date().toISOString().split('T')[0];

    if (memoId && typeof memoId === 'string' && memoId.startsWith('memo_')) {
        // 編集モード
        const memo = TaskManager.getMemoById(memoId);
        if (memo) {
            document.getElementById('memo-title').value = memo.title;
            document.getElementById('memo-project').value = memo.projectName || '';
            document.getElementById('memo-date').value = memo.date || '';
            document.getElementById('memo-participants').value = memo.participants || '';
            document.getElementById('memo-content').value = memo.content || '';

            if (memo.actionItems) {
                memo.actionItems.forEach(item => addActionItem(item));
            }

            deleteBtn.style.display = 'block';
        }
    } else {
        // 新規作成モード
        if (projectName) {
            document.getElementById('memo-project').value = projectName;
        }
        deleteBtn.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeMemoModal() {
    document.getElementById('memo-modal').classList.remove('active');
    currentEditingMemoId = null;
}

function deleteCurrentMemo() {
    if (!currentEditingMemoId) return;
    
    if (confirm('このメモを削除しますか？')) {
        TaskManager.deleteMemo(currentEditingMemoId);
        renderMeetingMemos();
        closeMemoModal();
    }
}

function handleMemoFormSubmit(e) {
    e.preventDefault();

    const actionItemEls = document.querySelectorAll('#action-items-container .action-item-input');
    const actionItems = Array.from(actionItemEls)
        .map(el => el.value.trim())
        .filter(item => item);

    const data = {
        title: document.getElementById('memo-title').value.trim(),
        projectName: document.getElementById('memo-project').value.trim(),
        date: document.getElementById('memo-date').value,
        participants: document.getElementById('memo-participants').value.trim(),
        content: document.getElementById('memo-content').value.trim(),
        actionItems: actionItems
    };

    if (currentEditingMemoId) {
        TaskManager.updateMemo(currentEditingMemoId, data);
    } else {
        TaskManager.addMemo(data);
    }

    renderMeetingMemos();
    closeMemoModal();
}

// ===================================
// プロジェクト連携
// ===================================

function renderProjectsSummary() {
    // ダッシュボードにプロジェクトサマリーを表示
    if (typeof ProjectsManager === 'undefined') return;
    
    const projects = ProjectsManager.getAllProjects();
    const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'archived');
    
    // 今週締め切りのプロジェクトをチェック
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    
    const upcomingDeadlines = projects.filter(p => {
        if (!p.deadline || p.status === 'completed') return false;
        const deadline = new Date(p.deadline);
        return deadline >= today && deadline <= weekEnd;
    });
    
    // 統計更新（プロジェクト数を含める）
    updateProjectStats(projects, activeProjects, upcomingDeadlines);
}

function updateProjectStats(allProjects, activeProjects, upcomingDeadlines) {
    // プロジェクト関連の情報を表示（オプション）
    const statStreak = document.getElementById('stat-streak');
    if (statStreak && activeProjects.length > 0) {
        // 連続達成日数の横にプロジェクト数を表示
        const streakTrend = statStreak.closest('.stat-box')?.querySelector('.stat-trend');
        if (streakTrend) {
            streakTrend.innerHTML = `<span>🔥</span> 日 / 📂 ${activeProjects.length} プロジェクト`;
        }
    }
}

// プロジェクトにタスクを追加（ダッシュボードから）
function linkTaskToProject(taskId) {
    if (typeof ProjectsManager === 'undefined') return;
    
    const task = TaskManager.getTaskById(taskId);
    if (!task) return;
    
    const projects = ProjectsManager.getProjectsByCategory(task.category);
    if (projects.length === 0) {
        alert('このカテゴリにはプロジェクトがありません。\nプロジェクトページで作成してください。');
        return;
    }
    
    const projectNames = projects.map(p => p.name);
    const selected = prompt(`タスクをリンクするプロジェクトを選択:\n\n${projectNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n番号を入力:`);
    
    if (selected && !isNaN(selected)) {
        const idx = parseInt(selected) - 1;
        if (idx >= 0 && idx < projectNames.length) {
            TaskManager.updateTask(taskId, { projectName: projectNames[idx] });
            renderAllTasks();
        }
    }
}

// ===================================
// タスク管理ツールバー機能
// ===================================

function updateFilterCounts() {
    const allTasks = TaskManager.getAllTasks();
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate counts
    const counts = {
        all: allTasks.length,
        active: allTasks.filter(t => !t.completed).length,
        overdue: allTasks.filter(t => !t.completed && t.deadline && t.deadline < today).length,
        today: allTasks.filter(t => t.deadline === today).length,
        high: allTasks.filter(t => !t.completed && t.priority === 'high').length
    };
    
    // Update filter button counts
    Object.keys(counts).forEach(key => {
        const el = document.getElementById(`filter-${key}-count`);
        if (el) el.textContent = counts[key];
    });
    
    // Update quick stats
    const overdueEl = document.getElementById('overdue-count');
    const todayEl = document.getElementById('today-count');
    const weekEl = document.getElementById('week-count');
    const quickOverdue = document.getElementById('quick-stat-overdue');
    
    if (overdueEl) overdueEl.textContent = counts.overdue;
    if (todayEl) todayEl.textContent = counts.today;
    
    // Show/hide overdue warning
    if (quickOverdue) {
        quickOverdue.style.display = counts.overdue > 0 ? 'flex' : 'none';
    }
    
    // Week count
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const weekCount = allTasks.filter(t => !t.completed && t.deadline && t.deadline >= today && t.deadline <= weekEndStr).length;
    if (weekEl) weekEl.textContent = weekCount;
}

function setTaskFilter(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    applyFiltersAndSort();
}

function filterTasks() {
    applyFiltersAndSort();
}

function setSortOrder(sortBy) {
    currentSort = sortBy;
    applyFiltersAndSort();
}

function toggleCompletedTasks() {
    hideCompleted = !hideCompleted;
    const btn = document.getElementById('toggle-completed-btn');
    if (btn) {
        btn.textContent = hideCompleted ? '✅ 完了を表示' : '✅ 完了を隠す';
        btn.classList.toggle('active', hideCompleted);
    }
    applyFiltersAndSort();
}

function toggleFocusMode() {
    focusModeActive = !focusModeActive;
    document.body.classList.toggle('focus-mode', focusModeActive);
    
    const btn = document.getElementById('focus-mode-btn');
    if (btn) {
        btn.classList.toggle('active', focusModeActive);
        btn.innerHTML = focusModeActive ? '🔥 フォーカス中' : '🎯 フォーカスモード';
    }
    
    // In focus mode, only show high priority and overdue tasks
    if (focusModeActive) {
        setTaskFilter('high');
    } else {
        setTaskFilter('all');
    }
}

function applyFiltersAndSort() {
    const allTasks = TaskManager.getAllTasks();
    const searchQuery = document.getElementById('task-search')?.value.toLowerCase() || '';
    const today = new Date().toISOString().split('T')[0];
    
    // Apply filters to each task item
    document.querySelectorAll('.task-item-pro').forEach(item => {
        const taskId = item.dataset.taskId;
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;
        
        let show = true;
        
        // Search filter
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery)) {
            show = false;
        }
        
        // Status filter
        switch (currentFilter) {
            case 'active':
                if (task.completed) show = false;
                break;
            case 'overdue':
                if (task.completed || !task.deadline || task.deadline >= today) show = false;
                break;
            case 'today':
                if (task.deadline !== today) show = false;
                break;
            case 'high':
                if (task.completed || task.priority !== 'high') show = false;
                break;
        }
        
        // Hide completed filter
        if (hideCompleted && task.completed) {
            show = false;
        }
        
        // Apply visibility
        item.classList.toggle('hidden', !show);
        
        // Add visual indicators
        item.classList.toggle('overdue', !task.completed && task.deadline && task.deadline < today);
        item.classList.toggle('due-today', task.deadline === today);
        item.classList.toggle('high-priority', task.priority === 'high' && !task.completed);
    });
    
    // Sort tasks within each category
    ['work', 'research', 'certification', 'private'].forEach(category => {
        const container = document.getElementById(`${category}-tasks`);
        if (!container) return;
        
        const items = Array.from(container.querySelectorAll('.task-item-pro'));
        
        items.sort((a, b) => {
            const taskA = allTasks.find(t => t.id === a.dataset.taskId);
            const taskB = allTasks.find(t => t.id === b.dataset.taskId);
            if (!taskA || !taskB) return 0;
            
            // Always put completed at the bottom
            if (taskA.completed !== taskB.completed) {
                return taskA.completed ? 1 : -1;
            }
            
            switch (currentSort) {
                case 'priority':
                    const pOrder = { high: 0, medium: 1, low: 2 };
                    return pOrder[taskA.priority] - pOrder[taskB.priority];
                case 'deadline':
                    if (!taskA.deadline && !taskB.deadline) return 0;
                    if (!taskA.deadline) return 1;
                    if (!taskB.deadline) return -1;
                    return taskA.deadline.localeCompare(taskB.deadline);
                case 'created':
                    return new Date(taskB.createdAt) - new Date(taskA.createdAt);
                case 'name':
                    return taskA.title.localeCompare(taskB.title);
                default:
                    return 0;
            }
        });
        
        // Re-append in sorted order
        items.forEach(item => container.appendChild(item));
    });
    
    updateFilterCounts();
}

// Update renderAllTasks to add data attributes and call filter update
const originalRenderAllTasks = renderAllTasks;
renderAllTasks = function() {
    originalRenderAllTasks();
    updateFilterCounts();
};

// ===================================
// キーボードショートカット
// ===================================

document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }
    
    // Ctrl/Cmd + K: Search focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('task-search')?.focus();
    }
    
    // Ctrl/Cmd + N: New task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal('work');
    }
    
    // F: Toggle focus mode
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        toggleFocusMode();
    }
    
    // 1-5: Quick filters
    if (e.key === '1') setTaskFilter('all');
    if (e.key === '2') setTaskFilter('active');
    if (e.key === '3') setTaskFilter('overdue');
    if (e.key === '4') setTaskFilter('today');
    if (e.key === '5') setTaskFilter('high');
    
    // Escape: Close modals
    if (e.key === 'Escape') {
        closeModal();
        closeMemoModal();
        document.getElementById('day-modal')?.classList.remove('active');
        
        // Clear search if focus mode is active
        if (focusModeActive) {
            toggleFocusMode();
        }
    }
});

// ===================================
// 一括操作
// ===================================

function completeAllVisible() {
    const visibleTasks = document.querySelectorAll('.task-item-pro:not(.hidden):not(.completed)');
    if (visibleTasks.length === 0) {
        alert('完了するタスクがありません');
        return;
    }
    
    if (!confirm(`${visibleTasks.length} 件のタスクをすべて完了にしますか？`)) {
        return;
    }
    
    visibleTasks.forEach(item => {
        const taskId = item.dataset.taskId;
        if (taskId) {
            TaskManager.toggleTaskCompletion(taskId);
        }
    });
    
    renderAllTasks();
    StatsManager.updateStatsUI();
}

function deleteCompletedTasks() {
    const completedTasks = TaskManager.getAllTasks().filter(t => t.completed);
    if (completedTasks.length === 0) {
        alert('削除する完了タスクがありません');
        return;
    }
    
    if (!confirm(`${completedTasks.length} 件の完了タスクを削除しますか？`)) {
        return;
    }
    
    completedTasks.forEach(task => {
        TaskManager.deleteTask(task.id);
    });
    
    renderAllTasks();
    StatsManager.updateStatsUI();
}

// Show keyboard shortcut hint
function showKeyboardHints() {
    const hints = `
キーボードショートカット:
━━━━━━━━━━━━━━━━━━━━
Ctrl/Cmd + K : 検索にフォーカス
Ctrl/Cmd + N : 新しいタスクを追加
F : フォーカスモード切替
1-5 : フィルター切替
Escape : モーダルを閉じる
    `;
    alert(hints);
}
