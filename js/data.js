// ===================================
// データ管理モジュール - Enhanced with Server Persistence
// ===================================

// データ構造
const TaskManager = {
    // ローカルストレージのキー（フォールバック用）
    STORAGE_KEY: 'task_dashboard_data_v2',
    MEMO_STORAGE_KEY: 'task_dashboard_memos_v1',

    // タスクデータ
    tasks: [],
    // ミーティングメモ
    memos: [],
    
    // サーバー同期フラグ
    _serverSyncEnabled: true,
    _saveDebounceTimer: null,
    _memoSaveDebounceTimer: null,

    // 初期化
    async init() {
        // まずサーバーからデータを読み込み
        const serverLoaded = await this.loadFromServer();
        
        if (!serverLoaded) {
            // サーバーからの読み込みに失敗した場合はローカルストレージを使用
            console.log('📦 サーバー接続失敗 - ローカルストレージを使用');
            this.loadFromStorage();
            this.loadMemosFromStorage();
        }
        
        // 古いカテゴリを新しいカテゴリに移行
        this.migrateTaskCategories();
    },

    // certification -> study への移行
    migrateTaskCategories() {
        let migrated = false;
        this.tasks.forEach(task => {
            if (task.category === 'certification') {
                task.category = 'study';
                migrated = true;
            }
        });
        if (migrated) {
            console.log('📦 タスクカテゴリを移行しました (certification -> study)');
            this.saveToStorage();
        }
    },

    // サーバーからデータを読み込み
    async loadFromServer() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            
            // サーバーにデータがある場合
            if (data.tasks && data.tasks.length > 0) {
                this.tasks = data.tasks;
                console.log(`✅ サーバーからタスクを読み込み: ${this.tasks.length}件`);
            } else {
                // サーバーにデータがない場合、ローカルから移行
                this.loadFromStorage();
                if (this.tasks.length > 0) {
                    console.log(`📤 ローカルのタスクをサーバーに移行: ${this.tasks.length}件`);
                    this.saveToServer();
                }
            }
            
            if (data.memos && data.memos.length > 0) {
                this.memos = data.memos;
                console.log(`✅ サーバーからメモを読み込み: ${this.memos.length}件`);
            } else {
                this.loadMemosFromStorage();
                if (this.memos.length > 0) {
                    console.log(`📤 ローカルのメモをサーバーに移行: ${this.memos.length}件`);
                    this.saveMemosToServer();
                }
            }
            
            return true;
        } catch (error) {
            console.warn('⚠️ サーバーからのデータ読み込みに失敗:', error.message);
            return false;
        }
    },

    // サーバーにタスクを保存（デバウンス付き）
    saveToServer() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        
        this._saveDebounceTimer = setTimeout(async () => {
            try {
                const response = await fetch('/api/data/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.tasks)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                console.log('💾 タスクをサーバーに保存しました');
            } catch (error) {
                console.warn('⚠️ サーバー保存に失敗、ローカルに保存:', error.message);
                // フォールバック: ローカルストレージに保存
                this._saveToLocalStorage();
            }
        }, 300); // 300ms デバウンス
        
        // ローカルにも即座に保存（バックアップ）
        this._saveToLocalStorage();
    },

    // サーバーにメモを保存（デバウンス付き）
    saveMemosToServer() {
        if (this._memoSaveDebounceTimer) {
            clearTimeout(this._memoSaveDebounceTimer);
        }
        
        this._memoSaveDebounceTimer = setTimeout(async () => {
            try {
                const response = await fetch('/api/data/memos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.memos)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                console.log('💾 メモをサーバーに保存しました');
            } catch (error) {
                console.warn('⚠️ メモのサーバー保存に失敗:', error.message);
                this._saveMemosToLocalStorage();
            }
        }, 300);
        
        this._saveMemosToLocalStorage();
    },

    // ローカルストレージへの保存（内部用）
    _saveToLocalStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tasks));
        } catch (error) {
            console.error('ローカル保存に失敗:', error);
        }
    },

    _saveMemosToLocalStorage() {
        try {
            localStorage.setItem(this.MEMO_STORAGE_KEY, JSON.stringify(this.memos));
        } catch (error) {
            console.error('メモのローカル保存に失敗:', error);
        }
    },

    // LocalStorageからデータを読み込み（フォールバック用）
    loadFromStorage() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            try {
                this.tasks = JSON.parse(data);
            } catch (error) {
                console.error('データの読み込みに失敗:', error);
                this.tasks = [];
            }
        } else {
            // Try to migrate from old storage key
            const oldData = localStorage.getItem('task_dashboard_data');
            if (oldData) {
                try {
                    this.tasks = JSON.parse(oldData);
                    this.saveToStorage(); // Save to new key
                } catch (error) {
                this.tasks = [];
            }
        } else {
            this.tasks = [];
            }
        }
    },

    // LocalStorageにデータを保存（サーバー保存も実行）
    saveToStorage() {
        this._saveToLocalStorage();
        this.saveToServer();
    },

    // タスクを追加
    addTask(taskData) {
        const task = {
            id: this.generateId(),
            title: taskData.title,
            description: taskData.description || '',
            category: taskData.category,
            subcategory: taskData.subcategory || '',
            projectName: taskData.projectName || '', // プロジェクト/目標名
            priority: taskData.priority || 'medium',
            deadline: taskData.deadline || null,
            subtasks: taskData.subtasks || [],
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            aiGenerated: taskData.aiGenerated || false
        };

        this.tasks.push(task);
        this.saveToStorage();
        return task;
    },

    // プロジェクト一覧を取得
    getProjectsByCategory(category) {
        const tasks = this.getTasksByCategory(category);
        const projects = new Set();
        tasks.forEach(t => {
            if (t.projectName) {
                projects.add(t.projectName);
            }
        });
        return Array.from(projects);
    },

    // プロジェクト別にタスクを取得
    getTasksByProject(category, projectName) {
        return this.tasks.filter(t => 
            t.category === category && t.projectName === projectName
        );
    },

    // プロジェクトに属さないタスクを取得
    getTasksWithoutProject(category) {
        return this.tasks.filter(t => 
            t.category === category && !t.projectName
        );
    },

    // タスクを更新
    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                ...updates
            };
            this.saveToStorage();
            return this.tasks[taskIndex];
        }
        return null;
    },

    // タスクを削除
    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks.splice(taskIndex, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    },

    // タスクの完了状態を切り替え
    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveToStorage();
            return task;
        }
        return null;
    },

    // カテゴリー別にタスクを取得
    getTasksByCategory(category) {
        return this.tasks.filter(t => t.category === category);
    },

    // すべてのタスクを取得
    getAllTasks() {
        return this.tasks;
    },

    // IDでタスクを取得
    getTaskById(taskId) {
        return this.tasks.find(t => t.id === taskId);
    },

    // 連続達成日数を計算
    getStreak() {
        const completedDates = new Set();
        this.tasks.forEach(task => {
            if (task.completedAt) {
                const date = task.completedAt.split('T')[0];
                completedDates.add(date);
            }
        });

        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            if (completedDates.has(dateStr)) {
                streak++;
            } else if (i > 0) { // 今日以外で途切れたらストップ
                break;
            }
        }
        
        return streak;
    },

    // 今週の完了数
    getWeeklyCompletedCount() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        return this.tasks.filter(t => {
            if (!t.completedAt) return false;
            return new Date(t.completedAt) >= weekAgo;
        }).length;
    },

    // ユニークなIDを生成
    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // データをクリア（開発用）
    clearAll() {
        this.tasks = [];
        this.saveToStorage();
    },

    // ===================================
    // ミーティングメモ管理
    // ===================================
    
    loadMemosFromStorage() {
        const data = localStorage.getItem(this.MEMO_STORAGE_KEY);
        if (data) {
            try {
                this.memos = JSON.parse(data);
            } catch (error) {
                console.error('メモの読み込みに失敗:', error);
                this.memos = [];
            }
        } else {
            this.memos = [];
        }
    },

    saveMemosToStorage() {
        this._saveMemosToLocalStorage();
        this.saveMemosToServer();
    },

    addMemo(memoData) {
        const memo = {
            id: 'memo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: memoData.title,
            content: memoData.content || '',
            projectName: memoData.projectName || '',
            date: memoData.date || new Date().toISOString().split('T')[0],
            participants: memoData.participants || '',
            actionItems: memoData.actionItems || [],
            createdAt: new Date().toISOString()
        };
        this.memos.push(memo);
        this.saveMemosToStorage();
        return memo;
    },

    updateMemo(memoId, updates) {
        const memoIndex = this.memos.findIndex(m => m.id === memoId);
        if (memoIndex !== -1) {
            this.memos[memoIndex] = {
                ...this.memos[memoIndex],
                ...updates
            };
            this.saveMemosToStorage();
            return this.memos[memoIndex];
        }
        return null;
    },

    deleteMemo(memoId) {
        const memoIndex = this.memos.findIndex(m => m.id === memoId);
        if (memoIndex !== -1) {
            this.memos.splice(memoIndex, 1);
            this.saveMemosToStorage();
            return true;
        }
        return false;
    },

    getMemoById(memoId) {
        return this.memos.find(m => m.id === memoId);
    },

    getAllMemos() {
        return this.memos;
    },

    getMemosByProject(projectName) {
        return this.memos.filter(m => m.projectName === projectName);
    },

    getMemoProjects() {
        const projects = new Set();
        this.memos.forEach(m => {
            if (m.projectName) {
                projects.add(m.projectName);
            }
        });
        return Array.from(projects);
    },

    getMemosWithoutProject() {
        return this.memos.filter(m => !m.projectName);
    }
};

// カテゴリー定義 - 統一版
const CATEGORIES = {
    work: {
        id: 'work',
        name: '仕事',
        icon: '💼',
        color: '#3b82f6',
        description: '会社・ビジネス関連のタスク'
    },
    research: {
        id: 'research',
        name: '研究',
        icon: '🔬',
        color: '#10b981',
        description: '研究・論文・実験関連'
    },
    study: {
        id: 'study',
        name: '学習',
        icon: '📚',
        color: '#f59e0b',
        description: '学習・資格試験・スキルアップ'
    },
    private: {
        id: 'private',
        name: 'プライベート',
        icon: '🏠',
        color: '#ec4899',
        description: '個人的なタスク'
    }
};

// サブカテゴリー定義
const SUBCATEGORIES = {
    // Research
    experiment: { id: 'experiment', name: '実験', icon: '🧪' },
    paper: { id: 'paper', name: '論文', icon: '📄' },
    survey: { id: 'survey', name: '調査', icon: '🔍' },
    // Study
    reading: { id: 'reading', name: '読書', icon: '📖' },
    practice: { id: 'practice', name: '演習', icon: '✏️' },
    certification: { id: 'certification', name: '資格試験', icon: '📝' }
};

// 優先度定義
const PRIORITIES = {
    low: { id: 'low', name: '低', class: 'low' },
    medium: { id: 'medium', name: '中', class: 'medium' },
    high: { id: 'high', name: '高', class: 'high' }
};

// ===================================
// プロジェクト管理 - 共通データレイヤー
// ===================================

const ProjectsManager = {
    STORAGE_KEY: 'projects_data_v1',
    projects: [],
    _saveDebounceTimer: null,

    async init() {
        // まずサーバーからデータを読み込み
        const serverLoaded = await this.loadFromServer();
        
        if (!serverLoaded) {
            console.log('📦 プロジェクト: サーバー接続失敗 - ローカルストレージを使用');
            this.loadFromStorage();
        }
        
        // 古いカテゴリを新しいカテゴリに移行
        this.migrateCategories();
    },

    // certification -> study への移行
    migrateCategories() {
        let migrated = false;
        this.projects.forEach(project => {
            if (project.category === 'certification') {
                project.category = 'study';
                migrated = true;
                console.log(`📦 カテゴリ移行: ${project.name} (certification -> study)`);
            }
        });
        if (migrated) {
            this.saveToStorage();
        }
    },

    async loadFromServer() {
        try {
            const response = await fetch('/api/data/projects');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            
            if (data && data.length > 0) {
                this.projects = data;
                console.log(`✅ サーバーからプロジェクトを読み込み: ${this.projects.length}件`);
            } else {
                // サーバーにデータがない場合、ローカルから移行
                this.loadFromStorage();
                if (this.projects.length > 0) {
                    console.log(`📤 ローカルのプロジェクトをサーバーに移行: ${this.projects.length}件`);
                    this.saveToServer();
                }
            }
            
            return true;
        } catch (error) {
            console.warn('⚠️ プロジェクトのサーバー読み込みに失敗:', error.message);
            return false;
        }
    },

    saveToServer() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        
        this._saveDebounceTimer = setTimeout(async () => {
            try {
                const response = await fetch('/api/data/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.projects)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                console.log('💾 プロジェクトをサーバーに保存しました');
            } catch (error) {
                console.warn('⚠️ プロジェクトのサーバー保存に失敗:', error.message);
            }
        }, 300);
        
        // ローカルにも即座に保存（バックアップ）
        this._saveToLocalStorage();
    },

    _saveToLocalStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.projects));
        } catch (error) {
            console.error('プロジェクトのローカル保存に失敗:', error);
        }
    },

    loadFromStorage() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            try {
                this.projects = JSON.parse(data);
            } catch (error) {
                console.error('プロジェクトデータの読み込みに失敗:', error);
                this.projects = [];
            }
        } else {
            this.projects = [];
        }
    },

    saveToStorage() {
        this._saveToLocalStorage();
        this.saveToServer();
    },

    generateId() {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    addProject(data) {
        const project = {
            id: this.generateId(),
            name: data.name,
            icon: data.icon || '📂',
            category: data.category || 'work',
            status: data.status || 'planning',
            deadline: data.deadline || null,
            description: data.description || '',
            tasks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.projects.push(project);
        this.saveToStorage();
        return project;
    },

    updateProject(id, updates) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects[index] = {
                ...this.projects[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveToStorage();
            return this.projects[index];
        }
        return null;
    },

    deleteProject(id) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    },

    getProject(id) {
        return this.projects.find(p => p.id === id);
    },

    getProjectByName(name) {
        return this.projects.find(p => p.name === name);
    },

    getProjectsByCategory(category) {
        if (category === 'all') return this.projects;
        return this.projects.filter(p => p.category === category);
    },

    getProjectsByStatus(status) {
        if (status === 'active') {
            return this.projects.filter(p => ['planning', 'in_progress', 'review'].includes(p.status));
        }
        return this.projects.filter(p => p.status === status);
    },

    addTaskToProject(projectId, taskData) {
        const project = this.getProject(projectId);
        if (project) {
            const task = {
                id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                title: typeof taskData === 'string' ? taskData : taskData.title,
                completed: false,
                priority: (typeof taskData === 'object' && taskData.priority) || 'medium',
                deadline: (typeof taskData === 'object' && taskData.deadline) || null,
                deadlineType: (typeof taskData === 'object' && taskData.deadlineType) || 'none', // 'none', 'date', 'month', 'text'
                description: (typeof taskData === 'object' && taskData.description) || '',
                createdAt: new Date().toISOString()
            };
            project.tasks.push(task);
            project.updatedAt = new Date().toISOString();
            this.saveToStorage();
            return task;
        }
        return null;
    },

    updateTaskInProject(projectId, taskId, updates) {
        const project = this.getProject(projectId);
        if (project) {
            const taskIndex = project.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                project.tasks[taskIndex] = {
                    ...project.tasks[taskIndex],
                    ...updates
                };
                project.updatedAt = new Date().toISOString();
                this.saveToStorage();
                return project.tasks[taskIndex];
            }
        }
        return null;
    },

    deleteTaskFromProject(projectId, taskId) {
        const project = this.getProject(projectId);
        if (project) {
            const taskIndex = project.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                project.tasks.splice(taskIndex, 1);
                project.updatedAt = new Date().toISOString();
                this.saveToStorage();
                return true;
            }
        }
        return false;
    },

    // プロジェクトの全タスクを取得（ダッシュボード連携用）
    getAllProjectTasks() {
        const allTasks = [];
        this.projects.forEach(project => {
            project.tasks.forEach(task => {
                allTasks.push({
                    ...task,
                    projectId: project.id,
                    projectName: project.name,
                    projectIcon: project.icon,
                    category: project.category,
                    source: 'project'
                });
            });
        });
        return allTasks;
    },

    // 期限でタスクを取得（プランナー連携用）
    getTasksByDeadline(dateStr) {
        const tasks = [];
        this.projects.forEach(project => {
            project.tasks.forEach(task => {
                if (task.deadline === dateStr && !task.completed) {
                    tasks.push({
                        ...task,
                        projectId: project.id,
                        projectName: project.name,
                        category: project.category
                    });
                }
            });
        });
        return tasks;
    },

    // 月の期限タスクを取得
    getTasksByMonth(year, month) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const tasks = [];
        this.projects.forEach(project => {
            project.tasks.forEach(task => {
                if (task.deadline && task.deadline.startsWith(monthStr) && !task.completed) {
                    tasks.push({
                        ...task,
                        projectId: project.id,
                        projectName: project.name,
                        category: project.category
                    });
                }
            });
        });
        return tasks;
    },

    toggleTaskInProject(projectId, taskId) {
        const project = this.getProject(projectId);
        if (project) {
            const task = project.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                project.updatedAt = new Date().toISOString();
                this.saveToStorage();
                return task;
            }
        }
        return null;
    },

    getProjectProgress(projectId) {
        const project = this.getProject(projectId);
        if (!project || project.tasks.length === 0) return 0;
        const completed = project.tasks.filter(t => t.completed).length;
        return Math.round((completed / project.tasks.length) * 100);
    },

    getCategoryCount(category) {
        return this.getProjectsByCategory(category).length;
    },

    getStatusCount(status) {
        return this.projects.filter(p => p.status === status).length;
    },

    getAllProjects() {
        return this.projects;
    },

    // ダッシュボード連携: プロジェクトに関連するタスクを取得
    getRelatedTasks(projectId) {
        const project = this.getProject(projectId);
        if (!project) return [];
        
        // TaskManagerからプロジェクト名で関連タスクを取得
        if (typeof TaskManager !== 'undefined') {
            return TaskManager.tasks.filter(t => t.projectName === project.name);
        }
        return project.tasks;
    },

    // プランナー連携: 期限があるプロジェクトを取得
    getProjectsWithDeadline(startDate, endDate) {
        return this.projects.filter(p => {
            if (!p.deadline) return false;
            const deadline = new Date(p.deadline);
            return deadline >= startDate && deadline <= endDate;
        });
    },

    // 今週締め切りのプロジェクトを取得
    getProjectsDueThisWeek() {
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + (7 - today.getDay()));
        
        return this.projects.filter(p => {
            if (!p.deadline || p.status === 'completed') return false;
            const deadline = new Date(p.deadline);
            return deadline >= today && deadline <= weekEnd;
        });
    }
};

// ===================================
// データ連携ユーティリティ
// ===================================

const DataSync = {
    // 全データを初期化
    async initAll() {
        await TaskManager.init();
        await ProjectsManager.init();
    },

    // タスクの期限でグループ化
    getTasksByDate(dateStr) {
        const tasks = TaskManager.getAllTasks().filter(t => t.deadline === dateStr);
        return tasks;
    },

    // 特定日の全タスク（プロジェクト内タスク含む）
    getAllTasksForDate(dateStr) {
        const tasks = [];
        
        // TaskManagerのタスク
        TaskManager.getAllTasks().forEach(t => {
            if (t.deadline === dateStr) {
                tasks.push({
                    ...t,
                    source: 'dashboard'
                });
            }
        });

        // ProjectsManagerのプロジェクト（期限が一致するもの）
        ProjectsManager.getAllProjects().forEach(p => {
            if (p.deadline === dateStr) {
                tasks.push({
                    id: p.id,
                    title: `📂 ${p.name}`,
                    deadline: p.deadline,
                    completed: p.status === 'completed',
                    priority: 'high',
                    source: 'project',
                    projectId: p.id
                });
            }
        });

        return tasks;
    },

    // 週間サマリーを取得
    getWeeklySummary(weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = weekStart.toISOString().split('T')[0];
        const endStr = weekEnd.toISOString().split('T')[0];

        const summary = {
            tasks: [],
            projects: [],
            deadlines: []
        };

        // タスク
        TaskManager.getAllTasks().forEach(t => {
            if (t.deadline && t.deadline >= startStr && t.deadline <= endStr) {
                summary.tasks.push(t);
                if (!t.completed) {
                    summary.deadlines.push({
                        type: 'task',
                        title: t.title,
                        deadline: t.deadline
                    });
                }
            }
        });

        // プロジェクト
        ProjectsManager.getAllProjects().forEach(p => {
            if (p.deadline && p.deadline >= startStr && p.deadline <= endStr) {
                summary.projects.push(p);
                if (p.status !== 'completed') {
                    summary.deadlines.push({
                        type: 'project',
                        title: `📂 ${p.name}`,
                        deadline: p.deadline
                    });
                }
            }
        });

        return summary;
    },

    // カテゴリ別統計
    getCategoryStats() {
        const categories = ['work', 'research', 'certification', 'private'];
        const stats = {};

        categories.forEach(cat => {
            const tasks = TaskManager.getTasksByCategory(cat);
            const projects = ProjectsManager.getProjectsByCategory(cat);

            stats[cat] = {
                taskCount: tasks.length,
                completedTasks: tasks.filter(t => t.completed).length,
                projectCount: projects.length,
                activeProjects: projects.filter(p => p.status !== 'completed').length
            };
        });

        return stats;
    },

    // プロジェクトとタスクを紐付け
    linkTaskToProject(taskId, projectName) {
        const task = TaskManager.getTaskById(taskId);
        if (task) {
            TaskManager.updateTask(taskId, { projectName });
        }
    },

    // プロジェクト名からカテゴリを取得
    getCategoryByProjectName(projectName) {
        const project = ProjectsManager.getProjectByName(projectName);
        return project ? project.category : null;
    }
};

// ===================================
// ユーザー設定管理
// ===================================

const UserSettings = {
    STORAGE_KEY: 'user_settings_v1',
    
    defaults: {
        userName: 'User'
    },
    
    settings: null,
    
    init() {
        this.load();
        this.applyToUI();
    },
    
    load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.settings = { ...this.defaults, ...JSON.parse(stored) };
            } catch (e) {
                this.settings = { ...this.defaults };
            }
        } else {
            this.settings = { ...this.defaults };
        }
    },
    
    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    },
    
    get(key) {
        return this.settings[key] ?? this.defaults[key];
    },
    
    set(key, value) {
        this.settings[key] = value;
        this.save();
    },
    
    applyToUI() {
        const userName = this.get('userName');
        const userNameEl = document.getElementById('user-name');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (userNameEl) {
            userNameEl.textContent = userName;
        }
        if (userAvatarEl) {
            userAvatarEl.textContent = userName.charAt(0).toUpperCase();
        }
    }
};

// ユーザー名編集関数（グローバル）
function editUserName() {
    const currentName = UserSettings.get('userName');
    const newName = prompt('ユーザー名を入力してください:', currentName);
    
    if (newName !== null && newName.trim() !== '') {
        UserSettings.set('userName', newName.trim());
        UserSettings.applyToUI();
    }
}

// ページ読み込み時にユーザー設定を適用
document.addEventListener('DOMContentLoaded', () => {
    UserSettings.init();
});
