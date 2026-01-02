// ===================================
// Planner UI - Notion-style Goal & Plan Management
// ===================================

const PlannerUI = {
    STORAGE_KEY: 'planner_data_v1',
    
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

    init() {
        this.loadData();
        this.setCurrentWeek();
        this.showView('year');
        this.attachEvents();
    },

    loadData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to load planner data:', e);
            }
        }
    },

    saveData() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
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

    getMonthPlan() {
        const key = this.getMonthKey();
        if (!this.data.monthPlans[key]) {
            this.data.monthPlans[key] = {
                quote: '',
                todos: [],
                categories: { work: [], study: [], lifestyle: [] }
            };
        }
        return this.data.monthPlans[key];
    },

    renderMonthView() {
        const plan = this.getMonthPlan();

        // Quote
        document.getElementById('month-quote-input').value = plan.quote || '';

        // Todos
        this.renderMonthTodos();

        // Categories
        ['work', 'study', 'lifestyle'].forEach(cat => {
            this.renderMonthCategory(cat);
        });

        // Weeks
        this.renderMonthWeeks();
    },

    renderMonthTodos() {
        const plan = this.getMonthPlan();
        const container = document.getElementById('month-todos');
        
        if (plan.todos.length === 0) {
            container.innerHTML = '<div class="empty-todos">今月やることを追加してください</div>';
            return;
        }

        container.innerHTML = plan.todos.map((todo, idx) => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <div class="todo-checkbox" onclick="PlannerUI.toggleMonthTodo(${idx})">
                    ${todo.completed ? '✓' : ''}
                </div>
                <div class="todo-text">${this.escapeHTML(todo.text)}</div>
                <button class="btn-icon delete-btn" onclick="PlannerUI.deleteMonthTodo(${idx})">×</button>
            </div>
        `).join('');
    },

    addMonthTodo() {
        const input = document.getElementById('new-month-todo');
        const text = input.value.trim();
        if (!text) return;

        const plan = this.getMonthPlan();
        plan.todos.push({ text, completed: false });
        this.saveData();
        input.value = '';
        this.renderMonthTodos();
    },

    toggleMonthTodo(index) {
        const plan = this.getMonthPlan();
        plan.todos[index].completed = !plan.todos[index].completed;
        this.saveData();
        this.renderMonthTodos();
    },

    deleteMonthTodo(index) {
        const plan = this.getMonthPlan();
        plan.todos.splice(index, 1);
        this.saveData();
        this.renderMonthTodos();
    },

    saveMonthQuote(quote) {
        const plan = this.getMonthPlan();
        plan.quote = quote;
        this.saveData();
    },

    renderMonthCategory(category) {
        const plan = this.getMonthPlan();
        const items = plan.categories[category] || [];
        const container = document.getElementById(`month-${category}-items`);
        
        if (items.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = items.map((item, idx) => `
            <div class="category-item ${item.completed ? 'completed' : ''}">
                <div class="item-checkbox" onclick="PlannerUI.toggleMonthItem('${category}', ${idx})">
                    ${item.completed ? '✓' : ''}
                </div>
                <div class="item-text">${this.escapeHTML(item.text)}</div>
                <button class="btn-icon delete-btn" onclick="PlannerUI.deleteMonthItem('${category}', ${idx})">×</button>
            </div>
        `).join('');
    },

    addMonthItem(category) {
        const text = prompt('追加する項目を入力:');
        if (!text || !text.trim()) return;

        const plan = this.getMonthPlan();
        if (!plan.categories[category]) plan.categories[category] = [];
        plan.categories[category].push({ text: text.trim(), completed: false });
        this.saveData();
        this.renderMonthCategory(category);
    },

    toggleMonthItem(category, index) {
        const plan = this.getMonthPlan();
        plan.categories[category][index].completed = !plan.categories[category][index].completed;
        this.saveData();
        this.renderMonthCategory(category);
    },

    deleteMonthItem(category, index) {
        const plan = this.getMonthPlan();
        plan.categories[category].splice(index, 1);
        this.saveData();
        this.renderMonthCategory(category);
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
                <div class="week-todo-item ${t.completed ? 'completed' : ''}">
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
                    <div class="day-tasks" id="day-tasks-${dateStr}">
                        ${tasks.map((t, idx) => `
                            <div class="day-task ${t.completed ? 'completed' : ''}">
                                <span class="task-check" onclick="PlannerUI.toggleDailyTask('${dateStr}', ${idx})">
                                    ${t.completed ? '✓' : '○'}
                                </span>
                                <span class="task-text">${this.escapeHTML(t.text)}</span>
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
        plan.todos[index].completed = !plan.todos[index].completed;
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
                        ` : ''}
                        ${plannerTasks.map((t, idx) => `
                            <div class="task-row ${t.completed ? 'completed' : ''}">
                                <span class="task-checkbox" onclick="PlannerUI.toggleDailyTask('${dateStr}', ${idx})">
                                    ${t.completed ? '✓' : ''}
                                </span>
                                <span class="task-label">${this.escapeHTML(t.text)}</span>
                                <button class="btn-icon mini-delete" onclick="PlannerUI.deleteDailyTask('${dateStr}', ${idx})">×</button>
                            </div>
                        `).join('')}
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
            certification: '📚',
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
        tasks[index].completed = !tasks[index].completed;
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
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    PlannerUI.init();
});
