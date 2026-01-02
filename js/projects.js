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
        certification: { label: '資格試験', icon: '📚', color: '#4ade80' },
        private: { label: 'プライベート', icon: '🏠', color: '#fb923c' }
    },

    STATUS_CONFIG: {
        planning: { label: '📝 企画中', color: '#fbbf24' },
        in_progress: { label: '🚀 進行中', color: '#60a5fa' },
        review: { label: '👀 レビュー中', color: '#c084fc' },
        completed: { label: '✅ 完了', color: '#4ade80' },
        archived: { label: '📦 アーカイブ', color: '#9ca3af' }
    },

    init() {
        ProjectsManager.init();
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
            certification: '📚 資格試験プロジェクト',
            private: '🏠 プライベートプロジェクト'
        };
        document.getElementById('page-title').textContent = titles[category] || titles.all;

        this.renderAll();
        
        // Show/hide category sections based on filter
        if (this.currentView === 'board') {
            const categories = ['work', 'research', 'certification', 'private'];
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

        const categories = ['work', 'research', 'certification', 'private'];
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
        const categories = ['work', 'research', 'certification', 'private'];
        
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

    createProjectCardHTML(project) {
        const progress = ProjectsManager.getProjectProgress(project.id);
        const category = this.CATEGORY_CONFIG[project.category];

        return `
            <div class="project-card" onclick="ProjectsUI.openDetailModal('${project.id}')">
                <div class="project-card-header">
                    <span class="project-card-icon">${project.icon}</span>
                    <span class="project-card-title">${this.escapeHTML(project.name)}</span>
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
            </div>
        `;
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
        const certification = ProjectsManager.getCategoryCount('certification');
        const privateCount = ProjectsManager.getCategoryCount('private');

        document.getElementById('count-all').textContent = all;
        document.getElementById('count-work').textContent = work;
        document.getElementById('count-research').textContent = research;
        document.getElementById('count-certification').textContent = certification;
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

        container.innerHTML = project.tasks.map(task => `
            <div class="detail-task-item">
                <div class="detail-task-checkbox ${task.completed ? 'completed' : ''}" 
                     onclick="ProjectsUI.toggleTask('${project.id}', '${task.id}')"></div>
                <span class="detail-task-name ${task.completed ? 'completed' : ''}">${this.escapeHTML(task.title)}</span>
                <span class="detail-task-priority ${task.priority}">${task.priority === 'high' ? '重要' : task.priority === 'medium' ? '通常' : '低'}</span>
            </div>
        `).join('');
    },

    toggleTask(projectId, taskId) {
        ProjectsManager.toggleTaskInProject(projectId, taskId);
        const project = ProjectsManager.getProject(projectId);
        this.renderDetailTasks(project);

        const progress = ProjectsManager.getProjectProgress(projectId);
        document.getElementById('detail-progress-bar').style.width = `${progress}%`;
        document.getElementById('detail-progress-text').textContent = `${progress}%`;

        this.renderAll();
    },

    addTaskToProject() {
        if (!this.currentProjectId) return;

        const input = document.getElementById('new-project-task');
        const title = input.value.trim();

        if (title) {
            ProjectsManager.addTaskToProject(this.currentProjectId, title);
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
document.addEventListener('DOMContentLoaded', () => {
    ProjectsUI.init();
});
