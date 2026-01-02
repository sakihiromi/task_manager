// ===================================
// Calendar Widget Manager - Enhanced
// ===================================

const CalendarManager = {
    currentDate: new Date(),

    init() {
        this.renderCalendar();
    },

    renderCalendar() {
        const container = document.getElementById('calendar-widget');
        const titleEl = document.getElementById('calendar-title');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth(); // 0-indexed

        if (titleEl) {
            titleEl.textContent = `${year} / ${String(month + 1).padStart(2, '0')}`;
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Header for days of week
        let html = `
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 8px; text-align: center; font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
                <div style="color: var(--accent-danger);">日</div>
                <div>月</div>
                <div>火</div>
                <div>水</div>
                <div>木</div>
                <div>金</div>
                <div style="color: var(--accent-info);">土</div>
            </div>
            <div class="calendar-grid-pro">
        `;

        // Empty cells for padding
        for (let i = 0; i < firstDay.getDay(); i++) {
            html += `<div class="calendar-cell-pro" style="background: transparent;"></div>`;
        }

        const allTasks = TaskManager.getAllTasks();
        
        // プロジェクト期限も取得
        const allProjects = typeof ProjectsManager !== 'undefined' ? ProjectsManager.getAllProjects() : [];

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = this.isToday(year, month, day);
            const dayOfWeek = new Date(year, month, day).getDay();

            let classes = ['calendar-cell-pro'];
            if (isToday) classes.push('today');

            // Check for events
            const deadlineTasks = allTasks.filter(t => t.deadline === dateStr && !t.completed);
            const completedTasks = allTasks.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(dateStr));
            
            // プロジェクト期限
            const deadlineProjects = allProjects.filter(p => p.deadline === dateStr && p.status !== 'completed');

            let dotsHtml = '';
            let countBadge = '';
            
            if (deadlineProjects.length > 0) {
                // プロジェクト期限は紫のドット
                dotsHtml += `<div class="cal-event-dot project" title="${deadlineProjects.length} projects"></div>`;
            }
            
            if (deadlineTasks.length > 0) {
                dotsHtml += `<div class="cal-event-dot deadline" title="${deadlineTasks.length} deadlines"></div>`;
            } else if (completedTasks.length > 0) {
                dotsHtml += `<div class="cal-event-dot completed" title="${completedTasks.length} done"></div>`;
            }

            if (completedTasks.length > 0) {
                countBadge = `<div style="position:absolute; top:4px; right:4px; font-size:0.65rem; color:var(--accent-success); font-weight: 600;">✓${completedTasks.length}</div>`;
            }

            // Style for weekend
            let dayNumberStyle = '';
            if (dayOfWeek === 0) dayNumberStyle = 'color: var(--accent-danger);';
            if (dayOfWeek === 6) dayNumberStyle = 'color: var(--accent-info);';

            html += `
                <div class="${classes.join(' ')}" onclick="CalendarManager.showDayDetails('${dateStr}')">
                    <div class="day-number" style="${dayNumberStyle}">${day}</div>
                    ${dotsHtml}
                    ${countBadge}
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;
    },

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    },

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    },

    isToday(year, month, day) {
        const today = new Date();
        return today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
    },

    showDayDetails(dateStr) {
        const modal = document.getElementById('day-modal');
        const title = document.getElementById('day-modal-title');
        const container = document.getElementById('day-tasks-list');

        if (!modal) {
            console.error("Day modal not found in DOM");
            return;
        }

        // Format date nicely
        const date = new Date(dateStr);
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        title.textContent = '📅 ' + date.toLocaleDateString('ja-JP', options);

        const allTasks = TaskManager.getAllTasks();
        const tasks = allTasks.filter(t =>
            t.deadline === dateStr ||
            (t.completedAt && t.completedAt.startsWith(dateStr))
        );
        
        // プロジェクトの期限も取得
        const allProjects = typeof ProjectsManager !== 'undefined' ? ProjectsManager.getAllProjects() : [];
        const projects = allProjects.filter(p => p.deadline === dateStr);

        if (tasks.length === 0 && projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px;">
                    <div class="icon">📭</div>
                    <div class="message">この日のアクティビティはありません</div>
                </div>
            `;
        } else {
            let html = '';
            
            // プロジェクトを先に表示
            if (projects.length > 0) {
                html += `<div style="font-size: 0.75rem; color: var(--text-muted); padding: 8px 16px; text-transform: uppercase; border-bottom: 1px solid var(--border-subtle);">📂 プロジェクト</div>`;
                html += projects.map(p => {
                    let statusBadge = '';
                    if (p.status === 'completed') {
                        statusBadge = `<span class="badge" style="background:var(--accent-success); color:white;">完了</span>`;
                    } else {
                        statusBadge = `<span class="badge badge-high">期限</span>`;
                    }

                    return `
                        <div class="task-item-pro" style="cursor: pointer; border-left: 3px solid var(--accent-primary);" onclick="window.location.href='projects.html'">
                            <div style="margin-right: 12px; font-size: 1.2rem;">${p.icon || '📂'}</div>
                            <div style="flex:1">
                                <div style="font-weight:500; margin-bottom: 4px;">${p.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">${statusBadge}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            // タスクを表示
            if (tasks.length > 0) {
                html += `<div style="font-size: 0.75rem; color: var(--text-muted); padding: 8px 16px; text-transform: uppercase; border-bottom: 1px solid var(--border-subtle);">📋 タスク</div>`;
                html += tasks.map(t => {
                    const isCompletedOnDay = t.completedAt && t.completedAt.startsWith(dateStr);
                    const isDeadline = t.deadline === dateStr;
                    const categoryIcon = CATEGORIES[t.category]?.icon || '📋';

                    let statusBadge = '';
                    if (isCompletedOnDay && t.completed) {
                        statusBadge = `<span class="badge" style="background:var(--accent-success); color:white;">完了</span>`;
                    } else if (isDeadline && !t.completed) {
                        statusBadge = `<span class="badge badge-high">期限</span>`;
                    }

                    return `
                        <div class="task-item-pro" style="cursor: pointer;" onclick="document.getElementById('day-modal').classList.remove('active'); openModal(null, '${t.id}');">
                            <div style="margin-right: 12px; font-size: 1.2rem;">${categoryIcon}</div>
                            <div style="flex:1">
                                <div style="font-weight:500; margin-bottom: 4px;">${t.title}</div>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">${statusBadge}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            container.innerHTML = html;
        }

        modal.classList.add('active');
    }
};
