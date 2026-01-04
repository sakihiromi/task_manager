// ===================================
// Planner UI - Notion-style Goal & Plan Management
// ===================================

const PlannerUI = {
    STORAGE_KEY: 'planner_data_v1',
    _saveDebounceTimer: null,
    
    currentView: 'year',
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    currentWeekStart: null,
    
    data: {
        yearGoals: {},      // { year: { category: [goals] } }
        monthPlans: {},     // { "2026-01": { quote, todos, categories } }
        weekPlans: {},      // { "2026-W01": { message, todos, ongoingTasks, deadlineTasks } }
        dailyTasks: {}      // { "2026-01-01": [tasks] }
    },

    currentEditingGoal: null,

    // プロジェクトグループの折りたたみ状態
    collapsedProjects: new Set(
        JSON.parse(localStorage.getItem('planner_collapsed_projects') || '[]')
    ),
    
    // プロジェクトグループの折りたたみ状態を保存
    saveCollapsedProjects() {
        localStorage.setItem('planner_collapsed_projects', JSON.stringify([...this.collapsedProjects]));
    },
    
    // プロジェクトグループのトグル
    toggleProjectGroup(projectId) {
        if (this.collapsedProjects.has(projectId)) {
            this.collapsedProjects.delete(projectId);
        } else {
            this.collapsedProjects.add(projectId);
        }
        this.saveCollapsedProjects();
        this.renderMonthTodos();
    },

    // ドラッグ＆ドロップ用の状態
    dragState: {
        dragging: null,      // ドラッグ中のDOM要素
        dragType: null,      // 'month-todo', 'week-todo', 'daily-task'
        dragData: null,      // ドラッグ中のデータ（index, weekKey, dateStr等）
        placeholder: null    // プレースホルダー要素
    },

    async init() {
        await this.loadData();
        this.setCurrentWeek();
        this.showView('year');
        this.attachEvents();
    },

    async loadData() {
        // まずサーバーから読み込みを試みる
        try {
            const response = await fetch('/api/data/planner');
            if (response.ok) {
                const serverData = await response.json();
                if (serverData && Object.keys(serverData).length > 0) {
                    this.data = serverData;
                    console.log('✅ サーバーからプランナーデータを読み込み');
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ プランナーのサーバー読み込みに失敗:', error.message);
        }
        
        // サーバーから取得できない場合はローカルストレージから
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
                console.log('📦 ローカルからプランナーデータを読み込み');
                // ローカルにデータがあればサーバーに移行
                this.saveToServer();
            } catch (e) {
                console.error('Failed to load planner data:', e);
            }
        }
    },

    saveData() {
        // ローカルに即座に保存
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        // サーバーにもデバウンス付きで保存
        this.saveToServer();
    },

    saveToServer() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        
        this._saveDebounceTimer = setTimeout(async () => {
            try {
                const response = await fetch('/api/data/planner', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.data)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                console.log('💾 プランナーをサーバーに保存しました');
            } catch (error) {
                console.warn('⚠️ プランナーのサーバー保存に失敗:', error.message);
            }
        }, 300);
    },

    setCurrentWeek() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);
        this.currentWeekStart = monday;
    },

    attachEvents() {
        document.getElementById('goal-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGoal();
        });

        document.getElementById('goal-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'goal-modal') this.closeGoalModal();
        });

        // Month quote auto-save
        document.getElementById('month-quote-input')?.addEventListener('change', (e) => {
            this.saveMonthQuote(e.target.value);
        });

        // Week message auto-save
        document.getElementById('week-message-input')?.addEventListener('change', (e) => {
            this.saveWeekMessage(e.target.value);
        });

        // New month todo on Enter
        document.getElementById('new-month-todo')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addMonthTodo();
            }
        });
    },

    // ===================================
    // View Management
    // ===================================

    showView(view) {
        this.currentView = view;

        // Update tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        // Hide all views
        document.querySelectorAll('.planner-view').forEach(v => {
            v.classList.remove('active');
        });

        // Show selected view
        document.getElementById(`${view}-view`)?.classList.add('active');

        // Update period title
        this.updatePeriodTitle();

        // Render the view
        if (view === 'year') this.renderYearView();
        else if (view === 'month') this.renderMonthView();
        else if (view === 'week') this.renderWeekView();
    },

    updatePeriodTitle() {
        const titleEl = document.getElementById('period-title');
        if (!titleEl) return;

        if (this.currentView === 'year') {
            titleEl.textContent = `${this.currentYear}年`;
        } else if (this.currentView === 'month') {
            titleEl.textContent = `${this.currentYear}年${this.currentMonth}月`;
        } else if (this.currentView === 'week') {
            const weekNum = this.getWeekNumber(this.currentWeekStart);
            const endDate = new Date(this.currentWeekStart);
            endDate.setDate(endDate.getDate() + 6);
            titleEl.textContent = `${this.currentWeekStart.getMonth() + 1}/${this.currentWeekStart.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
        }
    },

    prevPeriod() {
        if (this.currentView === 'year') {
            this.currentYear--;
        } else if (this.currentView === 'month') {
            this.currentMonth--;
            if (this.currentMonth < 1) {
                this.currentMonth = 12;
                this.currentYear--;
            }
        } else if (this.currentView === 'week') {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        }
        this.showView(this.currentView);
    },

    nextPeriod() {
        if (this.currentView === 'year') {
            this.currentYear++;
        } else if (this.currentView === 'month') {
            this.currentMonth++;
            if (this.currentMonth > 12) {
                this.currentMonth = 1;
                this.currentYear++;
            }
        } else if (this.currentView === 'week') {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        }
        this.showView(this.currentView);
    },

    // ===================================
    // Year View
    // ===================================

    renderYearView() {
        const categories = ['work', 'study', 'health', 'money', 'relationship', 'other'];
        
        categories.forEach(cat => {
            const container = document.getElementById(`year-goals-${cat}`);
            if (!container) return;

            const goals = this.getYearGoals(cat);
            
            if (goals.length === 0) {
                container.innerHTML = '<div class="empty-goals">まだ目標がありません</div>';
            } else {
                container.innerHTML = goals.map((goal, idx) => `
                    <div class="goal-item ${goal.completed ? 'completed' : ''}" onclick="PlannerUI.editGoal('${cat}', ${idx})">
                        <div class="goal-checkbox" onclick="event.stopPropagation(); PlannerUI.toggleGoal('${cat}', ${idx})">
                            ${goal.completed ? '✓' : ''}
                        </div>
                        <div class="goal-text">${this.escapeHTML(goal.text)}</div>
                    </div>
                `).join('');
            }
        });

        // Render month overview grid
        this.renderMonthOverviewGrid();
    },

    renderMonthOverviewGrid() {
        const container = document.getElementById('year-months-grid');
        if (!container) return;

        const months = [];
        for (let m = 1; m <= 12; m++) {
            const key = `${this.currentYear}-${String(m).padStart(2, '0')}`;
            const monthData = this.data.monthPlans[key] || {};
            const todoCount = (monthData.todos || []).length;
            const completedCount = (monthData.todos || []).filter(t => t.completed).length;

            months.push(`
                <div class="month-card" onclick="PlannerUI.currentMonth = ${m}; PlannerUI.showView('month')">
                    <div class="month-card-header">${m}月</div>
                    <div class="month-card-stats">
                        ${todoCount > 0 ? `<span>${completedCount}/${todoCount} 完了</span>` : '<span class="empty">未設定</span>'}
                    </div>
                </div>
            `);
        }

        container.innerHTML = months.join('');
    },

    getYearGoals(category) {
        const yearKey = String(this.currentYear);
        if (!this.data.yearGoals[yearKey]) {
            this.data.yearGoals[yearKey] = {};
        }
        if (!this.data.yearGoals[yearKey][category]) {
            this.data.yearGoals[yearKey][category] = [];
        }
        return this.data.yearGoals[yearKey][category];
    },

    addGoal(category) {
        this.currentEditingGoal = { category, index: -1 };
        document.getElementById('goal-text').value = '';
        document.getElementById('goal-notes').value = '';
        document.getElementById('btn-delete-goal').style.display = 'none';
        document.getElementById('goal-modal-title').textContent = '🎯 新しい目標を追加';
        document.getElementById('goal-modal').classList.add('active');
    },

    editGoal(category, index) {
        const goals = this.getYearGoals(category);
        const goal = goals[index];
        
        this.currentEditingGoal = { category, index };
        document.getElementById('goal-text').value = goal.text;
        document.getElementById('goal-notes').value = goal.notes || '';
        document.getElementById('btn-delete-goal').style.display = 'block';
        document.getElementById('goal-modal-title').textContent = '🎯 目標を編集';
        document.getElementById('goal-modal').classList.add('active');
    },

    saveGoal() {
        const text = document.getElementById('goal-text').value.trim();
        const notes = document.getElementById('goal-notes').value.trim();

        if (!text || !this.currentEditingGoal) return;

        const { category, index } = this.currentEditingGoal;
        const goals = this.getYearGoals(category);

        if (index === -1) {
            // New goal
            goals.push({ text, notes, completed: false });
        } else {
            // Update existing
            goals[index].text = text;
            goals[index].notes = notes;
        }

        this.saveData();
        this.closeGoalModal();
        this.renderYearView();
    },

    toggleGoal(category, index) {
        const goals = this.getYearGoals(category);
        goals[index].completed = !goals[index].completed;
        this.saveData();
        this.renderYearView();
    },

    deleteGoal() {
        if (!this.currentEditingGoal || this.currentEditingGoal.index === -1) return;

        if (confirm('この目標を削除しますか？')) {
            const { category, index } = this.currentEditingGoal;
            const goals = this.getYearGoals(category);
            goals.splice(index, 1);
            this.saveData();
            this.closeGoalModal();
            this.renderYearView();
        }
    },

    closeGoalModal() {
        document.getElementById('goal-modal').classList.remove('active');
        this.currentEditingGoal = null;
    },

    // ===================================
    // Month View
    // ===================================

    getMonthKey() {
        return `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
    },

    // カテゴリの折りたたみ状態（localStorageから復元）
    collapsedCategories: JSON.parse(localStorage.getItem('planner_collapsed_categories') || '{}'),
    
    // カテゴリの折りたたみ状態を保存
    saveCollapsedCategories() {
        localStorage.setItem('planner_collapsed_categories', JSON.stringify(this.collapsedCategories));
    },

    // ラベル設定
    LABELS: {
        work: { name: '仕事', icon: '💼', color: '#60a5fa' },
        research: { name: '研究', icon: '🔬', color: '#10b981' },
        study: { name: '学習', icon: '📚', color: '#c084fc' },
        private: { name: 'プライベート', icon: '🏠', color: '#4ade80' }
    },

    getMonthPlan() {
        const key = this.getMonthKey();
        if (!this.data.monthPlans[key]) {
            this.data.monthPlans[key] = {
                quote: '',
                todos: []  // todos now have { text, completed, label }
            };
        }
        // 旧データ形式からの移行: categoriesがあれば統合
        const plan = this.data.monthPlans[key];
        if (plan.categories) {
            // 古いcategoriesからtodosに移行
            ['work', 'study', 'lifestyle'].forEach(cat => {
                if (plan.categories[cat]) {
                    plan.categories[cat].forEach(item => {
                        const label = cat === 'lifestyle' ? 'private' : cat;
                        plan.todos.push({
                            text: item.text,
                            completed: item.completed,
                            label: label
                        });
                    });
                }
            });
            delete plan.categories;
            this.saveData();
        }
        return plan;
    },

    renderMonthView() {
        const plan = this.getMonthPlan();

        // Quote
        document.getElementById('month-quote-input').value = plan.quote || '';

        // Todos
        this.renderMonthTodos();

        // Categories (auto-filtered from todos)
        this.renderMonthCategories();

        // Weeks
        this.renderMonthWeeks();
    },

    renderMonthTodos() {
        const plan = this.getMonthPlan();
        const container = document.getElementById('month-todos');
        const projectTodos = this.getProjectTodosForMonth();
        
        let html = '';
        
        // プロジェクトからのタスク（自動連携）
        if (projectTodos.length > 0) {
            html += '<div class="project-todos-section">';
            html += '<div class="project-todos-header">📂 プロジェクトから</div>';
            
            // プロジェクトごとにグループ化
            const projectGroups = {};
            projectTodos.forEach(task => {
                if (!projectGroups[task.projectId]) {
                    projectGroups[task.projectId] = {
                        name: task.projectName,
                        icon: task.projectIcon,
                        category: task.category,
                        tasks: []
                    };
                }
                projectGroups[task.projectId].tasks.push(task);
            });
            
            Object.entries(projectGroups).forEach(([projectId, group]) => {
                const labelInfo = this.LABELS[group.category];
                const completedCount = group.tasks.filter(t => t.completed).length;
                const isCollapsed = this.collapsedProjects.has(projectId);
                
                html += `
                    <div class="project-todo-group ${isCollapsed ? 'collapsed' : ''}" data-project-id="${projectId}">
                        <div class="project-todo-header" onclick="PlannerUI.toggleProjectGroup('${projectId}')">
                            <span class="project-toggle">${isCollapsed ? '▶' : '▼'}</span>
                            <span class="project-icon">${group.icon}</span>
                            <span class="project-name">${this.escapeHTML(group.name)}</span>
                            ${labelInfo ? `<span class="todo-label-badge" style="background: ${labelInfo.color}20; color: ${labelInfo.color};">${labelInfo.icon} ${labelInfo.name}</span>` : ''}
                            <button class="btn-add-task" onclick="event.stopPropagation(); PlannerUI.openQuickAddTask('${projectId}')" title="タスクを追加">+</button>
                            <span class="project-progress">${completedCount}/${group.tasks.length}</span>
                        </div>
                        <div class="project-todo-tasks" style="${isCollapsed ? 'display: none;' : ''}">
                `;
                
                group.tasks.forEach(task => {
                    const deadlineDisplay = this.formatDeadline(task);
                    const priorityColors = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };
                    const priorityLabels = { high: '高', medium: '中', low: '低' };
                    
                    html += `
                        <div class="project-todo-item ${task.completed ? 'completed' : ''}">
                            <div class="todo-checkbox" onclick="PlannerUI.toggleProjectTask('${task.projectId}', '${task.id}')">
                                ${task.completed ? '✓' : ''}
                            </div>
                            <span class="todo-text">${this.escapeHTML(task.title)}</span>
                            <span class="priority-badge" style="background: ${priorityColors[task.priority]}20; color: ${priorityColors[task.priority]};">
                                ${priorityLabels[task.priority] || '中'}
                            </span>
                            ${deadlineDisplay ? `<span class="deadline-text">${deadlineDisplay}</span>` : ''}
                            <div class="task-actions">
                                <button class="btn-icon-sm" onclick="PlannerUI.openTaskModal('${task.projectId}', '${task.id}')" title="編集">✏️</button>
                                <button class="btn-icon-sm" onclick="PlannerUI.deleteProjectTask('${task.projectId}', '${task.id}')" title="削除">🗑️</button>
                            </div>
                        </div>
                    `;
                });
                
                // クイック追加フォーム
                html += `
                        <div class="quick-add-task-form" id="quick-add-${projectId}" style="display: none;">
                            <input type="text" class="form-control" id="quick-add-input-${projectId}" 
                                   placeholder="新しいタスクを追加..."
                                   onkeypress="if(event.key==='Enter'){PlannerUI.addQuickTask('${projectId}'); event.preventDefault();}">
                            <button class="btn btn-primary btn-sm" onclick="PlannerUI.addQuickTask('${projectId}')">追加</button>
                            <button class="btn btn-secondary btn-sm" onclick="PlannerUI.openTaskModal('${projectId}')" title="詳細設定">➕ 詳細</button>
                        </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        // 手動で追加したTODO
        if (plan.todos.length > 0) {
            html += '<div class="manual-todos-section">';
            if (projectTodos.length > 0) {
                html += '<div class="manual-todos-header">📝 追加のTODO</div>';
            }
            
            html += plan.todos.map((todo, idx) => {
                const labelInfo = todo.label ? this.LABELS[todo.label] : null;
                const labelBadge = labelInfo 
                    ? `<span class="todo-label-badge" style="background: ${labelInfo.color}20; color: ${labelInfo.color};">${labelInfo.icon} ${labelInfo.name}</span>` 
                    : '';
                
                return `
                    <div class="todo-item draggable-item ${todo.completed ? 'completed' : ''}" data-index="${idx}">
                        <div class="drag-handle" title="ドラッグで並び替え">⠿</div>
                <div class="todo-checkbox" onclick="PlannerUI.toggleMonthTodo(${idx})">
                    ${todo.completed ? '✓' : ''}
                </div>
                <div class="todo-text">${this.escapeHTML(todo.text)}</div>
                        ${labelBadge}
                        <select class="todo-label-change" onchange="PlannerUI.changeMonthTodoLabel(${idx}, this.value)" onclick="event.stopPropagation()">
                            <option value="" ${!todo.label ? 'selected' : ''}>ラベルなし</option>
                            <option value="work" ${todo.label === 'work' ? 'selected' : ''}>💼 仕事</option>
                            <option value="research" ${todo.label === 'research' ? 'selected' : ''}>🔬 研究</option>
                            <option value="study" ${todo.label === 'study' ? 'selected' : ''}>📚 学習</option>
                            <option value="private" ${todo.label === 'private' ? 'selected' : ''}>🏠 プライベート</option>
                        </select>
                <button class="btn-icon delete-btn" onclick="PlannerUI.deleteMonthTodo(${idx})">×</button>
            </div>
                `;
            }).join('');
            
            html += '</div>';
        }
        
        if (html === '') {
            html = '<div class="empty-todos">今月やることを追加してください（プロジェクトで計画を立てると自動反映されます）</div>';
        }
        
        container.innerHTML = html;
        
        // ドラッグ＆ドロップ初期化（手動TODOのみ）
        const manualSection = container.querySelector('.manual-todos-section');
        if (manualSection) {
            this.initDragAndDrop(manualSection, 'month-todo');
        }
    },

    // プロジェクトから今月のタスクを取得
    getProjectTodosForMonth() {
        if (typeof ProjectsManager === 'undefined') return [];
        
        const year = this.currentYear;
        const month = this.currentMonth;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        const tasks = [];
        ProjectsManager.projects.forEach(project => {
            // プロジェクト自体の期限が今月の場合、全タスクを含める
            const projectDeadlineInMonth = project.deadline && project.deadline.startsWith(monthStr);
            
            project.tasks.forEach(task => {
                // タスクの期限が今月、またはプロジェクトの期限が今月
                const taskDeadlineInMonth = task.deadline && task.deadline.startsWith(monthStr);
                
                if (taskDeadlineInMonth || projectDeadlineInMonth) {
                    tasks.push({
                        ...task,
                        projectId: project.id,
                        projectName: project.name,
                        projectIcon: project.icon,
                        category: project.category,
                        source: 'project'
                    });
                }
            });
        });
        
        return tasks;
    },

    addMonthTodo() {
        const input = document.getElementById('new-month-todo');
        const labelSelect = document.getElementById('new-month-todo-label');
        const text = input.value.trim();
        if (!text) return;

        const label = labelSelect.value || null;
        const plan = this.getMonthPlan();
        plan.todos.push({ text, completed: false, label });
        this.saveData();
        input.value = '';
        this.renderMonthTodos();
        this.renderMonthCategories();
    },

    toggleMonthTodo(index) {
        const plan = this.getMonthPlan();
        const todo = plan.todos[index];
        todo.completed = !todo.completed;
        
        // 完了時にcompletedAtを記録
        if (todo.completed) {
            todo.completedAt = new Date().toISOString();
        } else {
            delete todo.completedAt;
        }
        
        this.saveData();
        this.renderMonthTodos();
        this.renderMonthCategories(); // カテゴリ側も連動更新
    },

    changeMonthTodoLabel(index, newLabel) {
        const plan = this.getMonthPlan();
        plan.todos[index].label = newLabel || null;
        this.saveData();
        this.renderMonthTodos();
        this.renderMonthCategories();
    },

    deleteMonthTodo(index) {
        const plan = this.getMonthPlan();
        plan.todos.splice(index, 1);
        this.saveData();
        this.renderMonthTodos();
        this.renderMonthCategories();
    },

    saveMonthQuote(quote) {
        const plan = this.getMonthPlan();
        plan.quote = quote;
        this.saveData();
    },

    // カテゴリ別に自動振り分け表示（プランナーTODO + プロジェクトタスク）
    renderMonthCategories() {
        const plan = this.getMonthPlan();
        const projectTasks = this.getProjectTasksForMonth();
        
        ['work', 'research', 'study', 'private'].forEach(category => {
        const container = document.getElementById(`month-${category}-items`);
            const countEl = document.getElementById(`count-${category}`);
            const categoryEl = document.getElementById(`category-${category}`);
            
            if (!container) return;
            
            // このカテゴリのプランナーTODOをフィルタ
            const plannerItems = plan.todos
                .map((todo, idx) => ({ ...todo, originalIndex: idx, source: 'planner' }))
                .filter(todo => todo.label === category);
            
            // このカテゴリのプロジェクトタスクをフィルタ
            const projectItems = projectTasks.filter(task => task.category === category);
            
            const totalCount = plannerItems.length + projectItems.length;
            
            // カウント更新
            if (countEl) {
                countEl.textContent = totalCount;
            }
            
            // 折りたたみ状態を反映
            if (categoryEl) {
                categoryEl.classList.toggle('collapsed', this.collapsedCategories[category] === true);
            }
            
            if (totalCount === 0) {
                container.innerHTML = '<div class="empty-category">該当なし</div>';
            return;
        }

            let html = '';
            
            // プランナーTODO
            html += plannerItems.map(item => `
            <div class="category-item ${item.completed ? 'completed' : ''}">
                    <div class="item-checkbox" onclick="PlannerUI.toggleMonthTodo(${item.originalIndex})">
                    ${item.completed ? '✓' : ''}
                </div>
                <div class="item-text">${this.escapeHTML(item.text)}</div>
            </div>
        `).join('');
            
            // プロジェクトタスク
            html += projectItems.map(item => `
                <div class="category-item project-task ${item.completed ? 'completed' : ''}">
                    <div class="item-checkbox" onclick="PlannerUI.toggleProjectTask('${item.projectId}', '${item.id}')">
                        ${item.completed ? '✓' : ''}
                    </div>
                    <div class="item-text">
                        ${this.escapeHTML(item.title)}
                        <span class="project-badge">${item.projectIcon} ${this.escapeHTML(item.projectName)}</span>
                    </div>
                    ${item.deadline ? `<span class="deadline-badge">${this.formatDeadline(item)}</span>` : ''}
                </div>
            `).join('');
            
            container.innerHTML = html;
        });
    },

    formatDeadline(task) {
        if (!task.deadline) return '';
        
        if (task.deadlineType === 'text') {
            return `📅 ${task.deadline}`;
        } else if (task.deadlineType === 'month') {
            const [year, month] = task.deadline.split('-');
            return `📅 ${parseInt(month)}月中`;
        } else {
            const date = new Date(task.deadline);
            return `📅 ${date.getMonth() + 1}/${date.getDate()}`;
        }
    },

    toggleCategoryCollapse(category) {
        this.collapsedCategories[category] = !this.collapsedCategories[category];
        this.saveCollapsedCategories();
        const categoryEl = document.getElementById(`category-${category}`);
        if (categoryEl) {
            categoryEl.classList.toggle('collapsed', this.collapsedCategories[category]);
        }
    },

    renderMonthWeeks() {
        const container = document.getElementById('month-weeks-container');
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth, 0);
        
        // Find first Monday of the month or last Monday of previous month
        let weekStart = new Date(firstDay);
        const dayOfWeek = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        let weeksHtml = '';
        let weekNum = 1;

        while (weekStart <= lastDay || weekStart.getMonth() + 1 === this.currentMonth) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            if (weekStart.getMonth() + 1 !== this.currentMonth && weekEnd.getMonth() + 1 !== this.currentMonth) {
                weekStart.setDate(weekStart.getDate() + 7);
                continue;
            }

            weeksHtml += this.renderWeekSection(weekNum, new Date(weekStart));
            weekNum++;
            weekStart.setDate(weekStart.getDate() + 7);

            if (weekNum > 6) break; // Safety limit
        }

        container.innerHTML = weeksHtml;
        
        // 週のTODOにドラッグ初期化
        container.querySelectorAll('.week-todos-list').forEach(list => {
            const weekKey = list.id.replace('week-todos-', '');
            this.initDragAndDrop(list, 'week-todo', { weekKey });
        });
        
        // 日ごとのタスクにドラッグ初期化
        container.querySelectorAll('.day-tasks-container').forEach(list => {
            const dateStr = list.dataset.date;
            this.initDragAndDrop(list, 'daily-task', { dateStr });
        });
    },

    getWeekSectionKey(weekStart) {
        const y = weekStart.getFullYear();
        const m = String(weekStart.getMonth() + 1).padStart(2, '0');
        const d = String(weekStart.getDate()).padStart(2, '0');
        return `week-${y}-${m}-${d}`;
    },

    getWeekSectionPlan(weekKey) {
        if (!this.data.weekPlans[weekKey]) {
            this.data.weekPlans[weekKey] = {
                message: '',
                todos: [],
                ongoingNotes: '',
                deadlineNotes: ''
            };
        }
        return this.data.weekPlans[weekKey];
    },

    renderWeekSection(weekNum, weekStart) {
        const days = ['月', '火', '水', '木', '金', '土', '日'];
        const weekKey = this.getWeekSectionKey(weekStart);
        const weekPlan = this.getWeekSectionPlan(weekKey);
        
        // Weekly todos HTML
        const weekTodosHtml = weekPlan.todos.length > 0 
            ? weekPlan.todos.map((t, idx) => `
                <div class="week-todo-item draggable-item ${t.completed ? 'completed' : ''}" data-index="${idx}" data-week-key="${weekKey}">
                    <div class="drag-handle" title="ドラッグで並び替え">⠿</div>
                    <div class="week-todo-checkbox" onclick="PlannerUI.toggleWeekSectionTodo('${weekKey}', ${idx})">
                        ${t.completed ? '✓' : ''}
                    </div>
                    <div class="week-todo-text">${this.escapeHTML(t.text)}</div>
                    <button class="btn-icon delete-btn" onclick="PlannerUI.deleteWeekSectionTodo('${weekKey}', ${idx})">×</button>
                </div>
            `).join('')
            : '<div class="empty-week-todos">今週のTODOを追加してください</div>';

        // Days HTML
        let daysHtml = '';
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatDateKey(date);
            const tasks = this.getDailyTasks(dateStr);
            const isWeekend = i >= 5;
            const isToday = this.isToday(date);

            daysHtml += `
                <div class="week-day ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}">
                    <div class="day-header">
                        <span class="day-name">${days[i]}曜日</span>
                        <span class="day-date">${date.getMonth() + 1}/${date.getDate()}</span>
                    </div>
                    <div class="day-tasks day-tasks-container" id="day-tasks-${dateStr}" data-date="${dateStr}">
                        ${tasks.map((t, idx) => `
                            <div class="day-task draggable-item ${t.completed ? 'completed' : ''}" data-index="${idx}" data-date="${dateStr}">
                                <span class="drag-handle-small" title="ドラッグ">⋮</span>
                                <span class="task-check" onclick="PlannerUI.toggleDailyTask('${dateStr}', ${idx})">
                                    ${t.completed ? '✓' : '○'}
                                </span>
                                <span class="task-text">${this.escapeHTML(t.text)}</span>
                                <button class="btn-icon-delete" onclick="PlannerUI.deleteDailyTask('${dateStr}', ${idx})" title="削除">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="add-task-inline">
                        <input type="text" placeholder="+ タスクを追加" 
                            onkeypress="if(event.key==='Enter'){PlannerUI.addDailyTask('${dateStr}', this.value); this.value='';}"
                            class="inline-task-input">
                    </div>
                </div>
            `;
        }

        // Weekend section
        const weekendStart = new Date(weekStart);
        weekendStart.setDate(weekendStart.getDate() + 5);
        const weekendEnd = new Date(weekStart);
        weekendEnd.setDate(weekendEnd.getDate() + 6);
        
        const satDateStr = this.formatDateKey(weekendStart);
        const sunDateStr = this.formatDateKey(weekendEnd);
        const satTasks = this.getDailyTasks(satDateStr);
        const sunTasks = this.getDailyTasks(sunDateStr);

        return `
            <div class="week-section" data-week-key="${weekKey}">
                <div class="week-section-header">
                    <h3>● 第${weekNum}週目</h3>
                    <div class="week-message-input-wrapper">
                        <span class="week-message-icon">💌</span>
                        <input type="text" class="week-message-inline" 
                            placeholder="今週の一言メッセージ..."
                            value="${this.escapeHTML(weekPlan.message || '')}"
                            onchange="PlannerUI.saveWeekSectionMessage('${weekKey}', this.value)">
                    </div>
                </div>
                
                <div class="week-todos-section">
                    <h4>📋 今週のTODO</h4>
                    <div class="week-todos-list" id="week-todos-${weekKey}">
                        ${weekTodosHtml}
                    </div>
                    <div class="add-week-todo-row">
                        <input type="text" class="form-control" placeholder="今週やることを追加..."
                            id="new-week-todo-${weekKey}"
                            onkeypress="if(event.key==='Enter'){PlannerUI.addWeekSectionTodo('${weekKey}', this.value); this.value='';}">
                        <button class="btn btn-primary btn-sm" onclick="PlannerUI.addWeekSectionTodo('${weekKey}', document.getElementById('new-week-todo-${weekKey}').value); document.getElementById('new-week-todo-${weekKey}').value='';">追加</button>
                    </div>
                </div>

                <div class="week-days-row">
                    ${daysHtml}
                </div>

                <div class="week-section-footer">
                    <div class="footer-section">
                        <div class="footer-label">📌 進行中のタスク</div>
                        <textarea class="footer-notes" placeholder="進行中のタスクをメモ..."
                            onchange="PlannerUI.saveWeekSectionNotes('${weekKey}', 'ongoing', this.value)">${this.escapeHTML(weekPlan.ongoingNotes || '')}</textarea>
                    </div>
                    <div class="footer-section">
                        <div class="footer-label">⚠️ 今週〆切のタスク</div>
                        <textarea class="footer-notes" placeholder="今週〆切のタスクをメモ..."
                            onchange="PlannerUI.saveWeekSectionNotes('${weekKey}', 'deadline', this.value)">${this.escapeHTML(weekPlan.deadlineNotes || '')}</textarea>
                    </div>
                </div>
            </div>
        `;
    },

    // Week Section TODO Management
    addWeekSectionTodo(weekKey, text) {
        if (!text || !text.trim()) return;
        const plan = this.getWeekSectionPlan(weekKey);
        plan.todos.push({ text: text.trim(), completed: false });
        this.saveData();
        this.renderMonthWeeks();
    },

    toggleWeekSectionTodo(weekKey, index) {
        const plan = this.getWeekSectionPlan(weekKey);
        const todo = plan.todos[index];
        todo.completed = !todo.completed;
        
        // 完了時にcompletedAtを記録
        if (todo.completed) {
            todo.completedAt = new Date().toISOString();
        } else {
            delete todo.completedAt;
        }
        
        this.saveData();
        this.renderMonthWeeks();
    },

    deleteWeekSectionTodo(weekKey, index) {
        const plan = this.getWeekSectionPlan(weekKey);
        plan.todos.splice(index, 1);
        this.saveData();
        this.renderMonthWeeks();
    },

    saveWeekSectionMessage(weekKey, message) {
        const plan = this.getWeekSectionPlan(weekKey);
        plan.message = message;
        this.saveData();
    },

    saveWeekSectionNotes(weekKey, type, notes) {
        const plan = this.getWeekSectionPlan(weekKey);
        if (type === 'ongoing') {
            plan.ongoingNotes = notes;
        } else {
            plan.deadlineNotes = notes;
        }
        this.saveData();
    },

    // ===================================
    // Week View
    // ===================================

    getWeekKey() {
        const year = this.currentWeekStart.getFullYear();
        const weekNum = this.getWeekNumber(this.currentWeekStart);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
    },

    getWeekPlan() {
        const key = this.getWeekKey();
        if (!this.data.weekPlans[key]) {
            this.data.weekPlans[key] = { message: '' };
        }
        return this.data.weekPlans[key];
    },

    renderWeekView() {
        const plan = this.getWeekPlan();
        document.getElementById('week-message-input').value = plan.message || '';

        this.renderWeekDaysGrid();
        this.renderWeekSummary();
    },

    saveWeekMessage(message) {
        const plan = this.getWeekPlan();
        plan.message = message;
        this.saveData();
    },

    renderWeekDaysGrid() {
        const container = document.getElementById('week-days-grid');
        const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
        
        let html = '';
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatDateKey(date);
            const plannerTasks = this.getDailyTasks(dateStr);
            const isWeekend = i >= 5;
            const isToday = this.isToday(date);

            // ダッシュボードからのタスクを取得
            let dashboardTasks = [];
            if (typeof TaskManager !== 'undefined') {
                dashboardTasks = TaskManager.getAllTasks().filter(t => t.deadline === dateStr);
            }

            html += `
                <div class="week-day-card ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}">
                    <div class="day-card-header">
                        <span class="day-name">${days[i]}</span>
                        <span class="day-date">${date.getMonth() + 1}/${date.getDate()}</span>
                    </div>
                    <div class="day-tasks-list">
                        ${dashboardTasks.length > 0 ? `
                            <div class="synced-tasks-label">📊 ダッシュボード</div>
                            ${dashboardTasks.map(t => `
                                <div class="task-row synced ${t.completed ? 'completed' : ''}" onclick="window.location.href='index.html'">
                                    <span class="task-checkbox ${t.completed ? 'checked' : ''}">
                                        ${t.completed ? '✓' : ''}
                                    </span>
                                    <span class="task-label">${this.escapeHTML(t.title)}</span>
                                </div>
                            `).join('')}
                        ` : ''}
                        ${plannerTasks.length > 0 ? `
                            <div class="synced-tasks-label">📅 プランナー</div>
                            <div class="planner-tasks-container" data-date="${dateStr}">
                        ${plannerTasks.map((t, idx) => `
                                    <div class="task-row draggable-item ${t.completed ? 'completed' : ''}" data-index="${idx}" data-date="${dateStr}">
                                        <span class="drag-handle-small" title="ドラッグ">⋮</span>
                                <span class="task-checkbox" onclick="PlannerUI.toggleDailyTask('${dateStr}', ${idx})">
                                    ${t.completed ? '✓' : ''}
                                </span>
                                <span class="task-label">${this.escapeHTML(t.text)}</span>
                                <button class="btn-icon mini-delete" onclick="PlannerUI.deleteDailyTask('${dateStr}', ${idx})">×</button>
                            </div>
                        `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="add-task-row">
                        <input type="text" placeholder="+ 追加" 
                            onkeypress="if(event.key==='Enter'){PlannerUI.addDailyTask('${dateStr}', this.value); this.value='';}"
                            class="add-task-input">
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        
        // 日ごとのタスクにドラッグ初期化
        container.querySelectorAll('.planner-tasks-container').forEach(list => {
            const dateStr = list.dataset.date;
            this.initDragAndDrop(list, 'daily-task', { dateStr });
        });
    },

    renderWeekSummary() {
        // Get tasks from TaskManager and ProjectsManager that are in progress or have deadline this week
        const ongoing = document.getElementById('week-ongoing-tasks');
        const deadline = document.getElementById('week-deadline-tasks');

        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekStartStr = this.formatDateKey(this.currentWeekStart);
        const weekEndStr = this.formatDateKey(weekEnd);

        let ongoingItems = [];
        let deadlineItems = [];

        // TaskManagerからタスクを取得
        if (typeof TaskManager !== 'undefined') {
            const allTasks = TaskManager.getAllTasks();

            allTasks.filter(t => !t.completed).slice(0, 5).forEach(t => {
                ongoingItems.push({
                    title: t.title,
                    category: t.category,
                    source: 'task'
                });
            });

            allTasks.filter(t => {
                if (t.completed || !t.deadline) return false;
                return t.deadline >= weekStartStr && t.deadline <= weekEndStr;
            }).forEach(t => {
                deadlineItems.push({
                    title: t.title,
                    deadline: t.deadline,
                    category: t.category,
                    source: 'task'
                });
            });
        }

        // ProjectsManagerからプロジェクトを取得
        if (typeof ProjectsManager !== 'undefined') {
            ProjectsManager.getAllProjects().filter(p => p.status !== 'completed').slice(0, 3).forEach(p => {
                ongoingItems.push({
                    title: `📂 ${p.name}`,
                    category: p.category,
                    source: 'project'
                });
            });

            ProjectsManager.getAllProjects().filter(p => {
                if (p.status === 'completed' || !p.deadline) return false;
                return p.deadline >= weekStartStr && p.deadline <= weekEndStr;
            }).forEach(p => {
                deadlineItems.push({
                    title: `📂 ${p.name}`,
                    deadline: p.deadline,
                    category: p.category,
                    source: 'project'
                });
            });
        }

        // レンダリング
        const categoryIcons = {
            work: '💼',
            research: '🔬',
            study: '📚',
            private: '🏠'
        };

        ongoing.innerHTML = ongoingItems.length > 0 
            ? ongoingItems.map(item => `
                <div class="summary-task">
                    <span>${categoryIcons[item.category] || '📋'}</span>
                    ${this.escapeHTML(item.title)}
                </div>
            `).join('')
            : '<div class="empty-summary">なし</div>';

        deadline.innerHTML = deadlineItems.length > 0
            ? deadlineItems.map(item => `
                <div class="summary-task deadline">
                    ⚠️ ${this.escapeHTML(item.title)} (${item.deadline})
                </div>
            `).join('')
            : '<div class="empty-summary">なし</div>';
    },

    // ===================================
    // Daily Tasks
    // ===================================

    formatDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    getDailyTasks(dateStr) {
        if (!this.data.dailyTasks[dateStr]) {
            this.data.dailyTasks[dateStr] = [];
        }
        return this.data.dailyTasks[dateStr];
    },

    addDailyTask(dateStr, text) {
        if (!text || !text.trim()) return;
        const tasks = this.getDailyTasks(dateStr);
        tasks.push({ text: text.trim(), completed: false });
        this.saveData();
        
        // Re-render based on current view
        if (this.currentView === 'week') {
            this.renderWeekDaysGrid();
        } else if (this.currentView === 'month') {
            this.renderMonthWeeks();
        }
    },

    toggleDailyTask(dateStr, index) {
        const tasks = this.getDailyTasks(dateStr);
        const task = tasks[index];
        task.completed = !task.completed;
        
        // 完了時にcompletedAtを記録
        if (task.completed) {
            task.completedAt = new Date().toISOString();
        } else {
            delete task.completedAt;
        }
        
        this.saveData();

        if (this.currentView === 'week') {
            this.renderWeekDaysGrid();
        } else if (this.currentView === 'month') {
            this.renderMonthWeeks();
        }
    },

    deleteDailyTask(dateStr, index) {
        const tasks = this.getDailyTasks(dateStr);
        tasks.splice(index, 1);
        this.saveData();

        if (this.currentView === 'week') {
            this.renderWeekDaysGrid();
        } else if (this.currentView === 'month') {
            this.renderMonthWeeks();
        }
    },

    // ===================================
    // Drag & Drop - ドラッグ＆ドロップ機能
    // ===================================

    initDragAndDrop(container, type, context = {}) {
        if (!container) return;
        
        const items = container.querySelectorAll('.draggable-item');
        items.forEach(item => {
            item.setAttribute('draggable', 'true');
            
            item.addEventListener('dragstart', (e) => this.handleDragStart(e, type, context));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e, type, context));
            item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    },

    handleDragStart(e, type, context) {
        const item = e.target.closest('.draggable-item');
        if (!item) return;
        
        const index = parseInt(item.dataset.index);
        
        this.dragState.dragging = item;
        this.dragState.dragType = type;
        this.dragState.dragData = { index, ...context };
        
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
        
        // ドラッグ画像をカスタマイズ
        setTimeout(() => {
            item.style.opacity = '0.4';
        }, 0);
    },

    handleDragEnd(e) {
        const item = e.target.closest('.draggable-item');
        if (item) {
            item.classList.remove('dragging');
            item.style.opacity = '1';
        }
        
        // すべてのドロップターゲットのスタイルをクリア
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        this.dragState.dragging = null;
        this.dragState.dragType = null;
        this.dragState.dragData = null;
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDragEnter(e) {
        const item = e.target.closest('.draggable-item');
        if (item && item !== this.dragState.dragging) {
            item.classList.add('drag-over');
        }
    },

    handleDragLeave(e) {
        const item = e.target.closest('.draggable-item');
        if (item) {
            item.classList.remove('drag-over');
        }
    },

    handleDrop(e, type, context) {
        e.preventDefault();
        
        const targetItem = e.target.closest('.draggable-item');
        if (!targetItem || !this.dragState.dragging) return;
        
        const fromIndex = this.dragState.dragData.index;
        const toIndex = parseInt(targetItem.dataset.index);
        
        if (fromIndex === toIndex) return;
        
        // タイプに応じて並び替え処理
        switch (type) {
            case 'month-todo':
                this.reorderMonthTodos(fromIndex, toIndex);
                break;
            case 'week-todo':
                this.reorderWeekTodos(this.dragState.dragData.weekKey, fromIndex, toIndex);
                break;
            case 'daily-task':
                this.reorderDailyTasks(this.dragState.dragData.dateStr, fromIndex, toIndex);
                break;
        }
        
        targetItem.classList.remove('drag-over');
    },

    reorderMonthTodos(fromIndex, toIndex) {
        const plan = this.getMonthPlan();
        const [removed] = plan.todos.splice(fromIndex, 1);
        plan.todos.splice(toIndex, 0, removed);
        this.saveData();
        this.renderMonthTodos();
        this.renderMonthCategories();
    },

    reorderWeekTodos(weekKey, fromIndex, toIndex) {
        const plan = this.getWeekSectionPlan(weekKey);
        const [removed] = plan.todos.splice(fromIndex, 1);
        plan.todos.splice(toIndex, 0, removed);
        this.saveData();
        this.renderMonthWeeks();
    },

    reorderDailyTasks(dateStr, fromIndex, toIndex) {
        const tasks = this.getDailyTasks(dateStr);
        const [removed] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, removed);
        this.saveData();

        if (this.currentView === 'week') {
            this.renderWeekDaysGrid();
        } else if (this.currentView === 'month') {
            this.renderMonthWeeks();
        }
    },

    // ===================================
    // Utilities
    // ===================================

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
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
    },

    // ===================================
    // プロジェクト連携機能
    // ===================================

    // プロジェクトからのタスクを取得（カテゴリ表示用 - 完了済みを除く）
    getProjectTasksForMonth() {
        if (typeof ProjectsManager === 'undefined') return [];
        
        const year = this.currentYear;
        const month = this.currentMonth;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        const tasks = [];
        ProjectsManager.projects.forEach(project => {
            // プロジェクト自体の期限が今月の場合も含める
            const projectDeadlineInMonth = project.deadline && project.deadline.startsWith(monthStr);
            
            project.tasks.forEach(task => {
                const taskDeadlineInMonth = task.deadline && task.deadline.startsWith(monthStr);
                
                if ((taskDeadlineInMonth || projectDeadlineInMonth) && !task.completed) {
                    tasks.push({
                        ...task,
                        projectId: project.id,
                        projectName: project.name,
                        projectIcon: project.icon,
                        category: project.category,
                        source: 'project'
                    });
                }
            });
        });
        
        return tasks;
    },

    // プロジェクトタスクをトグル
    toggleProjectTask(projectId, taskId) {
        if (typeof ProjectsManager === 'undefined') return;
        
        ProjectsManager.toggleTaskInProject(projectId, taskId);
        this.renderMonthTodos();
        this.renderMonthCategories();
    },

    // クイック追加フォームを開く
    openQuickAddTask(projectId) {
        const form = document.getElementById(`quick-add-${projectId}`);
        if (form) {
            const isVisible = form.style.display !== 'none';
            form.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                const input = document.getElementById(`quick-add-input-${projectId}`);
                if (input) input.focus();
            }
        }
    },

    // プロジェクトにタスクを追加
    addQuickTask(projectId) {
        if (typeof ProjectsManager === 'undefined') return;
        
        const input = document.getElementById(`quick-add-input-${projectId}`);
        if (!input) return;
        
        const title = input.value.trim();
        if (!title) return;
        
        // 今月の期限を自動設定
        const monthStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
        
        ProjectsManager.addTaskToProject(projectId, {
            title,
            priority: 'medium',
            deadline: monthStr,
            deadlineType: 'month'
        });
        
        input.value = '';
        this.renderMonthTodos();
        this.renderMonthCategories();
        
        // フォームを非表示
        const form = document.getElementById(`quick-add-${projectId}`);
        if (form) form.style.display = 'none';
    },

    // ===================================
    // タスク編集モーダル機能
    // ===================================
    
    currentEditingTask: null, // { projectId, taskId }

    openTaskModal(projectId, taskId = null) {
        if (typeof ProjectsManager === 'undefined') return;
        
        const project = ProjectsManager.getProject(projectId);
        if (!project) return;

        const modal = document.getElementById('planner-task-modal');
        const titleEl = document.getElementById('planner-task-modal-title');
        const deleteBtn = document.getElementById('btn-delete-task');
        
        if (taskId) {
            // 編集モード
            const task = project.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            this.currentEditingTask = { projectId, taskId };
            
            document.getElementById('planner-task-title').value = task.title;
            document.getElementById('planner-task-priority').value = task.priority || 'medium';
            document.getElementById('planner-task-deadline-type').value = task.deadlineType || 'none';
            this.updateTaskDeadlineInput(task.deadlineType || 'none', task.deadline);
            
            titleEl.textContent = '✏️ タスクを編集';
            deleteBtn.style.display = 'block';
        } else {
            // 新規作成モード
            this.currentEditingTask = { projectId, taskId: null };
            
            document.getElementById('planner-task-title').value = '';
            document.getElementById('planner-task-priority').value = 'medium';
            document.getElementById('planner-task-deadline-type').value = 'month';
            
            // 今月をデフォルトに設定
            const monthStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
            this.updateTaskDeadlineInput('month', monthStr);
            
            titleEl.textContent = '➕ 新規タスク';
            deleteBtn.style.display = 'none';
        }

        modal.classList.add('active');
    },

    closeTaskModal() {
        document.getElementById('planner-task-modal').classList.remove('active');
        this.currentEditingTask = null;
    },

    updateTaskDeadlineInput(type, value = '') {
        const container = document.getElementById('planner-deadline-input-container');
        
        switch (type) {
            case 'date':
                container.innerHTML = `
                    <label class="form-label">期限日</label>
                    <input type="date" id="planner-task-deadline" class="form-control" value="${value || ''}">
                `;
                break;
            case 'month':
                container.innerHTML = `
                    <label class="form-label">期限月</label>
                    <input type="month" id="planner-task-deadline" class="form-control" value="${value || ''}">
                `;
                break;
            case 'text':
                container.innerHTML = `
                    <label class="form-label">期限（テキスト）</label>
                    <input type="text" id="planner-task-deadline" class="form-control" placeholder="例: 1月中, 来週まで" value="${value || ''}">
                `;
                break;
            default:
                container.innerHTML = `<span style="color: var(--text-muted);">期限なし</span>`;
        }
    },

    saveTaskEdit() {
        if (!this.currentEditingTask) return;
        
        const { projectId, taskId } = this.currentEditingTask;
        
        const title = document.getElementById('planner-task-title').value.trim();
        if (!title) {
            alert('タスク名を入力してください');
            return;
        }

        const priority = document.getElementById('planner-task-priority').value;
        const deadlineType = document.getElementById('planner-task-deadline-type').value;
        const deadlineInput = document.getElementById('planner-task-deadline');
        const deadline = deadlineInput ? deadlineInput.value : null;

        const taskData = {
            title,
            priority,
            deadlineType,
            deadline: deadlineType !== 'none' ? deadline : null
        };

        if (taskId) {
            // 更新
            ProjectsManager.updateTaskInProject(projectId, taskId, taskData);
        } else {
            // 新規作成
            ProjectsManager.addTaskToProject(projectId, taskData);
        }

        this.closeTaskModal();
        this.renderMonthTodos();
        this.renderMonthCategories();
    },

    deleteTaskFromModal() {
        if (!this.currentEditingTask || !this.currentEditingTask.taskId) return;
        
        if (!confirm('このタスクを削除しますか？')) return;
        
        const { projectId, taskId } = this.currentEditingTask;
        ProjectsManager.deleteTaskFromProject(projectId, taskId);
        
        this.closeTaskModal();
        this.renderMonthTodos();
        this.renderMonthCategories();
    },

    deleteProjectTask(projectId, taskId) {
        if (!confirm('このタスクを削除しますか？')) return;
        
        ProjectsManager.deleteTaskFromProject(projectId, taskId);
        this.renderMonthTodos();
        this.renderMonthCategories();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // ProjectsManagerも読み込む
    if (typeof ProjectsManager !== 'undefined') {
        await ProjectsManager.init();
        console.log('📁 プランナー: ProjectsManager初期化完了');
    }
    
    await PlannerUI.init();
});
