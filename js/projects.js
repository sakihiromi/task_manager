// ===================================
// Projects UI - Uses ProjectsManager from data.js
// ===================================

const ProjectsUI = {
    currentView: 'category', // Default to category view
    currentFilter: 'all',
    currentStatusFilter: null,
    currentProjectId: null,
    editingProjectId: null,
    selectedIcon: '📂',
    collapsedCategories: {},

    CATEGORY_CONFIG: {
        work: { label: '仕事', icon: '💼', color: '#60a5fa' },
        research: { label: '研究', icon: '🔬', color: '#c084fc' },
        study: { label: '学習', icon: '📚', color: '#4ade80' },
        private: { label: 'プライベート', icon: '🏠', color: '#fb923c' }
    },

    STATUS_CONFIG: {
        planning: { label: '📝 企画中', color: '#fbbf24' },
        in_progress: { label: '🚀 進行中', color: '#60a5fa' },
        review: { label: '👀 レビュー中', color: '#c084fc' },
        completed: { label: '✅ 完了', color: '#4ade80' },
        archived: { label: '📦 アーカイブ', color: '#9ca3af' }
    },

    async init() {
        await ProjectsManager.init();
        this.attachEventListeners();
        this.renderAll();
        this.updateCounts();
    },

    attachEventListeners() {
        // Form submission
        document.getElementById('project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProjectFormSubmit();
        });

        // Icon picker
        document.querySelectorAll('.icon-option').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.icon-option').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                this.selectedIcon = el.dataset.icon;
            });
        });

        // New task input enter key
        document.getElementById('new-project-task').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTaskToProject();
            }
        });

        // Modal close on backdrop click
        document.getElementById('project-modal').addEventListener('click', (e) => {
            if (e.target.id === 'project-modal') this.closeProjectModal();
        });

        document.getElementById('project-detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'project-detail-modal') this.closeDetailModal();
        });
    },

    setView(view) {
        this.currentView = view;

        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Show/hide views
        document.querySelectorAll('.projects-view').forEach(v => {
            v.classList.remove('active');
        });
        
        const viewEl = document.getElementById(`${view}-view`);
        if (viewEl) {
            viewEl.classList.add('active');
        }

        this.renderAll();
    },

    toggleCategory(category) {
        this.collapsedCategories[category] = !this.collapsedCategories[category];
        this.renderAll();
    },

    setFilter(category) {
        this.currentFilter = category;
        this.currentStatusFilter = null;

        // Update filter items
        document.querySelectorAll('.filter-item[data-filter]').forEach(item => {
            item.classList.toggle('active', item.dataset.filter === category);
        });
        document.querySelectorAll('.filter-item[data-status]').forEach(item => {
            item.classList.remove('active');
        });

        // Update page title
        const titles = {
            all: '📂 すべてのプロジェクト',
            work: '💼 仕事のプロジェクト',
            research: '🔬 研究プロジェクト',
            study: '📚 学習プロジェクト',
            private: '🏠 プライベートプロジェクト'
        };
        document.getElementById('page-title').textContent = titles[category] || titles.all;

        this.renderAll();
        
        // Show/hide category sections based on filter
        if (this.currentView === 'board') {
            const categories = ['work', 'research', 'study', 'private'];
            categories.forEach(cat => {
                const section = document.getElementById(`category-section-${cat}`);
                if (section) {
                    if (category === 'all' || category === cat) {
                        section.style.display = 'block';
                    } else {
                        section.style.display = 'none';
                    }
                }
            });
        }
    },

    setStatusFilter(status) {
        this.currentStatusFilter = status;
        this.currentFilter = 'all';

        // Update filter items
        document.querySelectorAll('.filter-item[data-filter]').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.filter-item[data-status]').forEach(item => {
            item.classList.toggle('active', item.dataset.status === status);
        });

        const titles = {
            active: '🚀 進行中のプロジェクト',
            completed: '✅ 完了したプロジェクト',
            archived: '📦 アーカイブされたプロジェクト'
        };
        document.getElementById('page-title').textContent = titles[status] || '📂 すべてのプロジェクト';

        this.renderAll();
    },

    getFilteredProjects() {
        let projects = ProjectsManager.getAllProjects();

        if (this.currentStatusFilter) {
            projects = ProjectsManager.getProjectsByStatus(this.currentStatusFilter);
        } else if (this.currentFilter !== 'all') {
            projects = ProjectsManager.getProjectsByCategory(this.currentFilter);
        }

        return projects;
    },

    renderAll() {
        const projects = this.getFilteredProjects();

        // Update project count
        document.getElementById('project-count').textContent = `${projects.length} 件のプロジェクト`;

        // Render based on current view
        switch (this.currentView) {
            case 'category':
                this.renderCategoryView(projects);
                break;
            case 'board':
                this.renderBoardView(projects);
                break;
            case 'list':
                this.renderListView(projects);
                break;
            case 'table':
                this.renderTableView(projects);
                break;
        }
    },

    renderCategoryView(projects) {
        const container = document.getElementById('category-view-content');
        if (!container) return;

        const categories = ['work', 'research', 'study', 'private'];
        let html = '';

        categories.forEach(cat => {
            const catConfig = this.CATEGORY_CONFIG[cat];
            const catProjects = projects.filter(p => p.category === cat);
            const isCollapsed = this.collapsedCategories[cat];
            
            // Count by status
            const planningCount = catProjects.filter(p => p.status === 'planning').length;
            const inProgressCount = catProjects.filter(p => p.status === 'in_progress').length;
            const reviewCount = catProjects.filter(p => p.status === 'review').length;
            const completedCount = catProjects.filter(p => p.status === 'completed').length;

            // Create status sections
            const statusSections = this.createStatusSections(catProjects, cat);

            html += `
                <div class="category-group ${isCollapsed ? 'collapsed' : ''}" data-category="${cat}">
                    <div class="category-group-header" onclick="ProjectsUI.toggleCategory('${cat}')">
                        <div class="category-group-title">
                            <span class="category-group-icon">${catConfig.icon}</span>
                            <span class="category-group-name">${catConfig.label}</span>
                        </div>
                        <div class="category-group-stats">
                            <div class="category-stat">
                                <span>📝</span>
                                <span class="category-stat-value">${planningCount}</span>
                            </div>
                            <div class="category-stat">
                                <span>🚀</span>
                                <span class="category-stat-value">${inProgressCount}</span>
                            </div>
                            <div class="category-stat">
                                <span>👀</span>
                                <span class="category-stat-value">${reviewCount}</span>
                            </div>
                            <div class="category-stat">
                                <span>✅</span>
                                <span class="category-stat-value">${completedCount}</span>
                            </div>
                            <span class="category-toggle">▼</span>
                        </div>
                    </div>
                    <div class="category-group-content">
                        ${statusSections}
                        <button class="add-card-btn" onclick="ProjectsUI.openProjectModal(null, '${cat}')">
                            + ${catConfig.label}にプロジェクトを追加
                        </button>
                    </div>
                </div>
            `;
        });

        if (html === '') {
            container.innerHTML = `<div class="empty-projects">
                <span class="icon">📂</span>
                <p class="message">プロジェクトがありません</p>
                <button class="btn btn-primary" onclick="ProjectsUI.openProjectModal()">+ 新規プロジェクト</button>
            </div>`;
        } else {
            container.innerHTML = html;
        }
    },

    createStatusSections(projects, category) {
        const statuses = ['in_progress', 'planning', 'review', 'completed'];
        let html = '';

        statuses.forEach(status => {
            const statusProjects = projects.filter(p => p.status === status);
            if (statusProjects.length === 0) return;

            const statusConfig = this.STATUS_CONFIG[status];

            html += `
                <div class="status-section">
                    <div class="status-header">
                        <span class="status-title">${statusConfig.label}</span>
                        <span class="status-count">${statusProjects.length}</span>
                    </div>
                    <div class="status-projects">
                        ${statusProjects.map(p => this.createProjectCardHTML(p)).join('')}
                    </div>
                </div>
            `;
        });

        return html;
    },

    renderBoardView(projects) {
        const container = document.getElementById('board-view');
        const categories = ['work', 'research', 'study', 'private'];
        
        let html = '';
        
        categories.forEach(category => {
            const categoryProjects = projects.filter(p => p.category === category);
            const config = this.CATEGORY_CONFIG[category];
            
            // Group by status within category
            const statusGroups = {
                planning: categoryProjects.filter(p => p.status === 'planning'),
                in_progress: categoryProjects.filter(p => p.status === 'in_progress'),
                review: categoryProjects.filter(p => p.status === 'review'),
                completed: categoryProjects.filter(p => p.status === 'completed')
            };
            
            html += `
                <div class="category-section" id="category-section-${category}">
                    <div class="category-section-header">
                        <div class="category-section-title">
                            <span class="icon">${config.label.split(' ')[0]}</span>
                            <span>${config.label.split(' ').slice(1).join(' ')}</span>
                        </div>
                        <span class="category-section-count">${categoryProjects.length} 件</span>
                    </div>
                    
                    ${categoryProjects.length === 0 ? `
                        <div class="category-projects-grid">
                            <div class="add-project-card" onclick="ProjectsUI.openProjectModal(null, '${category}')">
                                + 新しいプロジェクトを追加
                            </div>
                        </div>
                    ` : `
                        ${this.renderStatusSubsections(statusGroups, category)}
                    `}
                </div>
            `;
        });
        
        container.innerHTML = html;
    },

    renderStatusSubsections(statusGroups, category) {
        const statuses = [
            { key: 'planning', label: '📝 企画中' },
            { key: 'in_progress', label: '🚀 進行中' },
            { key: 'review', label: '👀 レビュー中' },
            { key: 'completed', label: '✅ 完了' }
        ];
        
        let html = '';
        
        statuses.forEach(status => {
            const projects = statusGroups[status.key];
            if (projects.length > 0) {
                html += `
                    <div class="status-subsection">
                        <div class="status-subsection-header">
                            <span class="status-label">${status.label}</span>
                            <span class="status-count">${projects.length}</span>
                        </div>
                        <div class="category-projects-grid">
                            ${projects.map(p => this.createProjectCardHTML(p)).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        // Add button
        html += `
            <div class="category-projects-grid" style="margin-top: 16px;">
                <div class="add-project-card" onclick="ProjectsUI.openProjectModal(null, '${category}')">
                    + 新しいプロジェクトを追加
                </div>
            </div>
        `;
        
        return html;
    },

    renderListView(projects) {
        const container = document.getElementById('projects-list');

        if (projects.length === 0) {
            container.innerHTML = `<div class="empty-projects">
                <span class="icon">📂</span>
                <p class="message">プロジェクトがありません</p>
                <button class="btn btn-primary" onclick="ProjectsUI.openProjectModal()">+ 新規プロジェクト</button>
            </div>`;
            return;
        }

        container.innerHTML = projects.map(p => this.createProjectListItemHTML(p)).join('');
    },

    renderTableView(projects) {
        const tbody = document.getElementById('projects-table-body');

        if (projects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                プロジェクトがありません
            </td></tr>`;
            return;
        }

        tbody.innerHTML = projects.map(p => this.createProjectTableRowHTML(p)).join('');
    },

    // 展開されたプロジェクトを追跡
    expandedProjects: {},

    createProjectCardHTML(project) {
        const progress = ProjectsManager.getProjectProgress(project.id);
        const category = this.CATEGORY_CONFIG[project.category];
        const isExpanded = this.expandedProjects[project.id];
        const completedTasks = project.tasks.filter(t => t.completed).length;

        let tasksHtml = '';
        if (isExpanded && project.tasks.length > 0) {
            const statusLabels = {
                completed: { label: '完了', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.2)' },
                in_progress: { label: '進行中', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)' },
                not_started: { label: '未着手', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.2)' }
            };
            const priorityConfig = {
                high: { label: '高', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' },
                medium: { label: '中', color: '#eab308', bg: 'rgba(234, 179, 8, 0.2)' },
                low: { label: '低', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)' }
            };

            tasksHtml = `
                <div class="project-card-tasks-table" onclick="event.stopPropagation();">
                    <div class="tasks-table-header">
                        <div class="tasks-col tasks-col-name">タスク名</div>
                        <div class="tasks-col tasks-col-status">ステータス</div>
                        <div class="tasks-col tasks-col-deadline">期限</div>
                        <div class="tasks-col tasks-col-priority">優先度</div>
                        <div class="tasks-col tasks-col-actions"></div>
                    </div>
                    <div class="tasks-table-body">
                        ${project.tasks.map(task => {
                            const status = task.completed ? 'completed' : 'not_started';
                            const statusInfo = statusLabels[status];
                            const priority = priorityConfig[task.priority] || priorityConfig.medium;
                            const deadlineDisplay = this.formatTaskDeadlineShort(task);
                            
                            return `
                                <div class="tasks-table-row ${task.completed ? 'completed' : ''}">
                                    <div class="tasks-col tasks-col-name">
                                        <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                                             onclick="ProjectsUI.toggleTaskFromCard('${project.id}', '${task.id}')">
                                            ${task.completed ? '✓' : ''}
                                        </div>
                                        <span class="task-title-text">${this.escapeHTML(task.title)}</span>
                                    </div>
                                    <div class="tasks-col tasks-col-status">
                                        <span class="status-pill" style="background: ${statusInfo.bg}; color: ${statusInfo.color};">
                                            ${statusInfo.label}
                                        </span>
                                    </div>
                                    <div class="tasks-col tasks-col-deadline">
                                        ${deadlineDisplay || '-'}
                                    </div>
                                    <div class="tasks-col tasks-col-priority">
                                        <span class="priority-pill" style="background: ${priority.bg}; color: ${priority.color};">
                                            ${priority.label}
                                        </span>
                                    </div>
                                    <div class="tasks-col tasks-col-actions">
                                        <button class="btn-icon-sm" onclick="ProjectsUI.openTaskEditor('${project.id}', '${task.id}')" title="編集">✏️</button>
                                        <button class="btn-icon-sm" onclick="ProjectsUI.deleteTaskFromCard('${project.id}', '${task.id}')" title="削除">🗑️</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="tasks-table-footer">
                        <span class="complete-count">COMPLETE ${completedTasks}/${project.tasks.length}</span>
                    </div>
                    <div class="project-card-add-task">
                        <input type="text" class="quick-task-input" id="quick-task-${project.id}" 
                               placeholder="+ 新しいタスク..."
                               onkeypress="if(event.key==='Enter'){ProjectsUI.addTaskFromCard('${project.id}'); event.preventDefault();}">
                    </div>
                </div>
            `;
        }

        return `
            <div class="project-card ${isExpanded ? 'expanded' : ''}" data-project-id="${project.id}">
                <div class="project-card-header" onclick="ProjectsUI.toggleProjectExpand('${project.id}')">
                    <span class="project-toggle-icon">${isExpanded ? '▼' : '▶'}</span>
                    <span class="project-card-icon">${project.icon}</span>
                    <span class="project-card-title">${this.escapeHTML(project.name)}</span>
                    <button class="btn-icon-sm project-edit-btn" onclick="event.stopPropagation(); ProjectsUI.openDetailModal('${project.id}')" title="詳細">⚙️</button>
                </div>
                <div class="project-card-meta">
                    <span class="project-card-tag category-${project.category}">${category.label}</span>
                    ${project.deadline ? `<span class="project-card-tag">📅 ${project.deadline}</span>` : ''}
                    ${project.tasks.length > 0 ? `<span class="project-card-tag">📋 ${project.tasks.length}</span>` : ''}
                </div>
                ${project.tasks.length > 0 ? `
                    <div class="project-card-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">${progress}%</div>
                    </div>
                ` : ''}
                ${tasksHtml}
            </div>
        `;
    },

    toggleProjectExpand(projectId) {
        this.expandedProjects[projectId] = !this.expandedProjects[projectId];
        this.renderAll();
    },

    toggleTaskFromCard(projectId, taskId) {
        ProjectsManager.toggleTaskInProject(projectId, taskId);
        this.renderAll();
    },

    addTaskFromCard(projectId) {
        const input = document.getElementById(`quick-task-${projectId}`);
        if (!input) return;
        
        const title = input.value.trim();
        if (!title) return;
        
        ProjectsManager.addTaskToProject(projectId, { title, priority: 'medium' });
        input.value = '';
        this.renderAll();
    },

    deleteTaskFromCard(projectId, taskId) {
        if (!confirm('このタスクを削除しますか？')) return;
        ProjectsManager.deleteTaskFromProject(projectId, taskId);
        this.renderAll();
    },

    createProjectListItemHTML(project) {
        const progress = ProjectsManager.getProjectProgress(project.id);
        const status = this.STATUS_CONFIG[project.status];
        const category = this.CATEGORY_CONFIG[project.category];

        return `
            <div class="project-list-item" onclick="ProjectsUI.openDetailModal('${project.id}')">
                <span class="project-list-icon">${project.icon}</span>
                <div class="project-list-info">
                    <div class="project-list-name">${this.escapeHTML(project.name)}</div>
                    <div class="project-list-description">${this.escapeHTML(project.description) || '説明なし'}</div>
                </div>
                <div class="project-list-meta">
                    <span class="project-card-tag category-${project.category}">${category.label}</span>
                    <span class="project-list-status ${project.status}">${status.label}</span>
                    <div class="project-list-progress">
                        <div class="progress-bar" style="width: 60px;">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">${progress}%</span>
                    </div>
                    <span class="project-list-deadline">${project.deadline || '-'}</span>
                </div>
            </div>
        `;
    },

    createProjectTableRowHTML(project) {
        const progress = ProjectsManager.getProjectProgress(project.id);
        const status = this.STATUS_CONFIG[project.status];
        const category = this.CATEGORY_CONFIG[project.category];

        return `
            <tr onclick="ProjectsUI.openDetailModal('${project.id}')">
                <td>
                    <div class="table-project-name">
                        <span class="table-project-icon">${project.icon}</span>
                        ${this.escapeHTML(project.name)}
                    </div>
                </td>
                <td><span class="project-card-tag category-${project.category}">${category.label}</span></td>
                <td><span class="project-list-status ${project.status}">${status.label}</span></td>
                <td>
                    <div class="table-progress">
                        <div class="progress-bar" style="width: 60px;">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span>${progress}%</span>
                    </div>
                </td>
                <td>${project.deadline || '-'}</td>
                <td>${project.tasks.length} 件</td>
            </tr>
        `;
    },

    updateCounts() {
        const all = ProjectsManager.getAllProjects().length;
        const work = ProjectsManager.getCategoryCount('work');
        const research = ProjectsManager.getCategoryCount('research');
        const study = ProjectsManager.getCategoryCount('study');
        const privateCount = ProjectsManager.getCategoryCount('private');

        document.getElementById('count-all').textContent = all;
        document.getElementById('count-work').textContent = work;
        document.getElementById('count-research').textContent = research;
        document.getElementById('count-study').textContent = study;
        document.getElementById('count-private').textContent = privateCount;
    },

    openProjectModal(defaultStatus = null, defaultCategory = null) {
        const modal = document.getElementById('project-modal');
        const form = document.getElementById('project-form');
        const title = document.getElementById('project-modal-title');

        form.reset();
        this.editingProjectId = null;
        this.selectedIcon = '📂';

        // Reset icon selection
        document.querySelectorAll('.icon-option').forEach(i => i.classList.remove('selected'));
        document.querySelector('.icon-option[data-icon="📂"]').classList.add('selected');

        if (defaultStatus) {
            document.getElementById('project-status').value = defaultStatus;
        }
        
        if (defaultCategory) {
            document.getElementById('project-category').value = defaultCategory;
        }

        title.textContent = '📂 新規プロジェクト';
        modal.classList.add('active');
    },

    closeProjectModal() {
        document.getElementById('project-modal').classList.remove('active');
        this.editingProjectId = null;
    },

    handleProjectFormSubmit() {
        const data = {
            name: document.getElementById('project-name').value.trim(),
            icon: this.selectedIcon,
            category: document.getElementById('project-category').value,
            status: document.getElementById('project-status').value,
            deadline: document.getElementById('project-deadline').value || null,
            description: document.getElementById('project-description').value.trim()
        };

        if (this.editingProjectId) {
            ProjectsManager.updateProject(this.editingProjectId, data);
        } else {
            ProjectsManager.addProject(data);
        }

        this.closeProjectModal();
        this.renderAll();
        this.updateCounts();
    },

    openDetailModal(projectId) {
        const project = ProjectsManager.getProject(projectId);
        if (!project) return;

        this.currentProjectId = projectId;

        const progress = ProjectsManager.getProjectProgress(projectId);
        const status = this.STATUS_CONFIG[project.status];
        const category = this.CATEGORY_CONFIG[project.category];

        document.getElementById('detail-icon').textContent = project.icon;
        document.getElementById('detail-name').textContent = project.name;
        document.getElementById('detail-status').textContent = status.label;
        document.getElementById('detail-category').textContent = category.label;
        document.getElementById('detail-deadline').textContent = project.deadline || '-';
        document.getElementById('detail-progress-bar').style.width = `${progress}%`;
        document.getElementById('detail-progress-text').textContent = `${progress}%`;
        document.getElementById('detail-created').textContent = new Date(project.createdAt).toLocaleDateString('ja-JP');
        document.getElementById('detail-description').textContent = project.description || '説明なし';
        document.getElementById('detail-task-count').textContent = `${project.tasks.length}件`;

        // Render tasks
        this.renderDetailTasks(project);

        document.getElementById('project-detail-modal').classList.add('active');
    },

    closeDetailModal() {
        document.getElementById('project-detail-modal').classList.remove('active');
        this.currentProjectId = null;
    },

    renderDetailTasks(project) {
        const container = document.getElementById('detail-tasks');

        if (project.tasks.length === 0) {
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">
                タスクがありません
            </div>`;
            return;
        }

        const statusLabels = { 
            completed: { label: '完了', color: '#4ade80' },
            in_progress: { label: '進行中', color: '#60a5fa' },
            not_started: { label: '未着手', color: '#9ca3af' }
        };
        const priorityLabels = { high: '高', medium: '中', low: '低' };
        const priorityColors = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };

        // Notion風テーブルヘッダー
        let html = `
            <div class="task-table">
                <div class="task-table-header">
                    <div class="task-col task-col-name">タスク名</div>
                    <div class="task-col task-col-status">ステータス</div>
                    <div class="task-col task-col-deadline">期限</div>
                    <div class="task-col task-col-priority">優先度</div>
                    <div class="task-col task-col-actions"></div>
            </div>
                <div class="task-table-body" id="task-table-body-${project.id}">
        `;

        project.tasks.forEach((task, index) => {
            const deadlineDisplay = this.formatTaskDeadlineShort(task);
            const status = task.completed ? 'completed' : 'not_started';
            const statusInfo = statusLabels[status];
            
            html += `
                <div class="task-table-row ${task.completed ? 'completed' : ''}" 
                     data-task-id="${task.id}" 
                     data-index="${index}"
                     draggable="true"
                     ondragstart="ProjectsUI.handleTaskDragStart(event, '${project.id}', ${index})"
                     ondragover="ProjectsUI.handleTaskDragOver(event)"
                     ondragleave="ProjectsUI.handleTaskDragLeave(event)"
                     ondrop="ProjectsUI.handleTaskDrop(event, '${project.id}', ${index})"
                     ondragend="ProjectsUI.handleTaskDragEnd(event)">
                    <div class="task-col task-col-name">
                        <span class="drag-handle" title="ドラッグで並び替え">⠿</span>
                        <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                             onclick="ProjectsUI.toggleTask('${project.id}', '${task.id}')">
                            ${task.completed ? '✓' : ''}
                        </div>
                        <span class="task-title ${task.completed ? 'completed' : ''}">${this.escapeHTML(task.title)}</span>
                    </div>
                    <div class="task-col task-col-status">
                        <span class="status-badge" style="background: ${statusInfo.color}20; color: ${statusInfo.color};">
                            ${statusInfo.label}
                        </span>
                    </div>
                    <div class="task-col task-col-deadline">
                        ${deadlineDisplay || '-'}
                    </div>
                    <div class="task-col task-col-priority">
                        <span class="priority-badge" style="background: ${priorityColors[task.priority]}20; color: ${priorityColors[task.priority]};">
                            ${priorityLabels[task.priority] || '中'}
                        </span>
                    </div>
                    <div class="task-col task-col-actions">
                        <button class="btn-icon-sm" onclick="ProjectsUI.openTaskEditor('${project.id}', '${task.id}')" title="編集">✏️</button>
                        <button class="btn-icon-sm" onclick="ProjectsUI.deleteTask('${project.id}', '${task.id}')" title="削除">🗑️</button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        // 完了数表示
        const completedCount = project.tasks.filter(t => t.completed).length;
        html += `
            <div class="task-table-footer">
                <span class="complete-label">COMPLETE</span>
                <span class="complete-count">${completedCount}/${project.tasks.length}</span>
            </div>
        `;

        container.innerHTML = html;
    },

    // ドラッグ＆ドロップ用の状態
    _draggedTaskIndex: null,
    _draggedProjectId: null,

    handleTaskDragStart(event, projectId, index) {
        this._draggedTaskIndex = index;
        this._draggedProjectId = projectId;
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
    },

    handleTaskDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const row = event.target.closest('.task-table-row');
        if (row) {
            row.classList.add('drag-over');
        }
    },

    handleTaskDragLeave(event) {
        const row = event.target.closest('.task-table-row');
        if (row) {
            row.classList.remove('drag-over');
        }
    },

    handleTaskDrop(event, projectId, targetIndex) {
        event.preventDefault();
        const row = event.target.closest('.task-table-row');
        if (row) {
            row.classList.remove('drag-over');
        }

        if (this._draggedProjectId !== projectId || this._draggedTaskIndex === null) return;
        if (this._draggedTaskIndex === targetIndex) return;

        // タスクの順序を変更
        const project = ProjectsManager.getProject(projectId);
        if (project) {
            const [removed] = project.tasks.splice(this._draggedTaskIndex, 1);
            project.tasks.splice(targetIndex, 0, removed);
            ProjectsManager.saveToStorage();
            this.renderDetailTasks(project);
            this.renderAll();
        }
    },

    handleTaskDragEnd(event) {
        event.target.classList.remove('dragging');
        document.querySelectorAll('.task-table-row.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        this._draggedTaskIndex = null;
        this._draggedProjectId = null;
    },

    formatTaskDeadlineShort(task) {
        if (!task.deadline) return '';
        
        if (task.deadlineType === 'text') {
            return task.deadline;
        } else if (task.deadlineType === 'month') {
            const [year, month] = task.deadline.split('-');
            return `${year}/${month}`;
        } else {
            return task.deadline;
        }
    },

    formatTaskDeadline(task) {
        if (!task.deadline) return '';
        
        if (task.deadlineType === 'text') {
            return `📅 ${task.deadline}`;
        } else if (task.deadlineType === 'month') {
            const [year, month] = task.deadline.split('-');
            return `📅 ${year}年${parseInt(month)}月中`;
        } else {
            // date type
            const date = new Date(task.deadline);
            return `📅 ${date.getMonth() + 1}/${date.getDate()}`;
        }
    },

    toggleTask(projectId, taskId) {
        ProjectsManager.toggleTaskInProject(projectId, taskId);
        const project = ProjectsManager.getProject(projectId);
        this.renderDetailTasks(project);

        const progress = ProjectsManager.getProjectProgress(projectId);
        document.getElementById('detail-progress-bar').style.width = `${progress}%`;
        document.getElementById('detail-progress-text').textContent = `${progress}%`;

        this.renderAll();
        
        // ダッシュボード連携：更新をトリガー
        if (typeof renderAllTasks === 'function') {
            renderAllTasks();
        }
    },

    deleteTask(projectId, taskId) {
        if (!confirm('このタスクを削除しますか？')) return;
        
        ProjectsManager.deleteTaskFromProject(projectId, taskId);
        const project = ProjectsManager.getProject(projectId);
        this.renderDetailTasks(project);
        document.getElementById('detail-task-count').textContent = `${project.tasks.length}件`;
        
        const progress = ProjectsManager.getProjectProgress(projectId);
        document.getElementById('detail-progress-bar').style.width = `${progress}%`;
        document.getElementById('detail-progress-text').textContent = `${progress}%`;
        
        this.renderAll();
    },

    // タスク編集モーダル
    currentEditingTaskId: null,

    openTaskEditor(projectId, taskId = null) {
        const project = ProjectsManager.getProject(projectId);
        if (!project) return;

        // カード表示からの編集の場合もプロジェクトIDを設定
        this.currentProjectId = projectId;
        this.currentEditingTaskId = taskId;
        const modal = document.getElementById('task-edit-modal');
        const form = document.getElementById('task-edit-form');
        
        if (taskId) {
            // 編集モード
            const task = project.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            document.getElementById('task-edit-title').value = task.title;
            document.getElementById('task-edit-priority').value = task.priority || 'medium';
            document.getElementById('task-edit-deadline-type').value = task.deadlineType || 'none';
            this.updateDeadlineInput(task.deadlineType || 'none', task.deadline);
            document.getElementById('task-edit-modal-title').textContent = '✏️ タスクを編集';
        } else {
            // 新規作成モード
            form.reset();
            document.getElementById('task-edit-deadline-type').value = 'none';
            this.updateDeadlineInput('none', '');
            document.getElementById('task-edit-modal-title').textContent = '➕ 新規タスク';
        }

        modal.classList.add('active');
    },

    closeTaskEditor() {
        document.getElementById('task-edit-modal').classList.remove('active');
        this.currentEditingTaskId = null;
    },

    updateDeadlineInput(type, value = '') {
        const container = document.getElementById('deadline-input-container');
        
        switch (type) {
            case 'date':
                container.innerHTML = `<input type="date" id="task-edit-deadline" class="form-control" value="${value || ''}">`;
                break;
            case 'month':
                container.innerHTML = `<input type="month" id="task-edit-deadline" class="form-control" value="${value || ''}">`;
                break;
            case 'text':
                container.innerHTML = `<input type="text" id="task-edit-deadline" class="form-control" placeholder="例: 1月中, 来週まで" value="${value || ''}">`;
                break;
            default:
                container.innerHTML = `<span style="color: var(--text-muted);">期限なし</span>`;
        }
    },

    saveTaskEdit() {
        if (!this.currentProjectId) return;

        const title = document.getElementById('task-edit-title').value.trim();
        if (!title) {
            alert('タイトルを入力してください');
            return;
        }

        const priority = document.getElementById('task-edit-priority').value;
        const deadlineType = document.getElementById('task-edit-deadline-type').value;
        const deadlineInput = document.getElementById('task-edit-deadline');
        const deadline = deadlineInput ? deadlineInput.value : null;

        const taskData = {
            title,
            priority,
            deadlineType,
            deadline: deadlineType !== 'none' ? deadline : null
        };

        if (this.currentEditingTaskId) {
            // 更新
            ProjectsManager.updateTaskInProject(this.currentProjectId, this.currentEditingTaskId, taskData);
        } else {
            // 新規作成
            ProjectsManager.addTaskToProject(this.currentProjectId, taskData);
        }

        const project = ProjectsManager.getProject(this.currentProjectId);
        this.renderDetailTasks(project);
        document.getElementById('detail-task-count').textContent = `${project.tasks.length}件`;
        
        this.closeTaskEditor();
        this.renderAll();
    },

    addTaskToProject() {
        if (!this.currentProjectId) return;

        const input = document.getElementById('new-project-task');
        const title = input.value.trim();

        if (title) {
            // 簡易追加（詳細設定なし）
            ProjectsManager.addTaskToProject(this.currentProjectId, { title });
            const project = ProjectsManager.getProject(this.currentProjectId);
            this.renderDetailTasks(project);
            document.getElementById('detail-task-count').textContent = `${project.tasks.length}件`;
            input.value = '';
            this.renderAll();
        }
    },

    editProject() {
        if (!this.currentProjectId) return;

        const project = ProjectsManager.getProject(this.currentProjectId);
        if (!project) return;

        this.closeDetailModal();

        // Populate edit form
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-category').value = project.category;
        document.getElementById('project-status').value = project.status;
        document.getElementById('project-deadline').value = project.deadline || '';
        document.getElementById('project-description').value = project.description || '';

        // Set icon
        this.selectedIcon = project.icon;
        document.querySelectorAll('.icon-option').forEach(i => {
            i.classList.toggle('selected', i.dataset.icon === project.icon);
        });

        this.editingProjectId = this.currentProjectId;
        document.getElementById('project-modal-title').textContent = '✏️ プロジェクトを編集';
        document.getElementById('project-modal').classList.add('active');
    },

    deleteProject() {
        if (!this.currentProjectId) return;

        if (confirm('このプロジェクトを削除しますか？関連するタスクもすべて削除されます。')) {
            ProjectsManager.deleteProject(this.currentProjectId);
            this.closeDetailModal();
            this.renderAll();
            this.updateCounts();
        }
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    await ProjectsUI.init();
});
