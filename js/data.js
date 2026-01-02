// ===================================
// データ管理モジュール - Enhanced with Memos
// ===================================

// データ構造
const TaskManager = {
    // ローカルストレージのキー
    STORAGE_KEY: 'task_dashboard_data_v2',
    MEMO_STORAGE_KEY: 'task_dashboard_memos_v1',

    // タスクデータ
    tasks: [],
    // ミーティングメモ
    memos: [],

    // 初期化
    init() {
        this.loadFromStorage();
        this.loadMemosFromStorage();
    },

    // LocalStorageからデータを読み込み
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

    // LocalStorageにデータを保存
    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tasks));
        } catch (error) {
            console.error('データの保存に失敗:', error);
        }
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
        try {
            localStorage.setItem(this.MEMO_STORAGE_KEY, JSON.stringify(this.memos));
        } catch (error) {
            console.error('メモの保存に失敗:', error);
        }
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

// カテゴリー定義 - Extended
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
        description: '研究・論文・実験関連',
        subcategories: ['experiment', 'paper', 'survey']
    },
    certification: {
        id: 'certification',
        name: '資格試験',
        icon: '📚',
        color: '#f59e0b',
        description: '資格取得・試験勉強',
        subcategories: ['study', 'practice', 'mock']
    },
    private: {
        id: 'private',
        name: 'プライベート',
        icon: '🏠',
        color: '#ec4899',
        description: '個人的なタスク'
    }
};

// サブカテゴリー定義 - Extended
const SUBCATEGORIES = {
    // Research
    experiment: { id: 'experiment', name: '実験', icon: '🧪' },
    paper: { id: 'paper', name: '論文', icon: '📄' },
    survey: { id: 'survey', name: '調査', icon: '🔍' },
    // Certification
    study: { id: 'study', name: '学習', icon: '📖' },
    practice: { id: 'practice', name: '演習', icon: '✏️' },
    mock: { id: 'mock', name: '模試', icon: '📝' }
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

    init() {
        this.loadFromStorage();
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
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.projects));
        } catch (error) {
            console.error('プロジェクトデータの保存に失敗:', error);
        }
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

    addTaskToProject(projectId, taskTitle) {
        const project = this.getProject(projectId);
        if (project) {
            const task = {
                id: 'task_' + Date.now(),
                title: taskTitle,
                completed: false,
                priority: 'medium',
                createdAt: new Date().toISOString()
            };
            project.tasks.push(task);
            project.updatedAt = new Date().toISOString();
            this.saveToStorage();
            return task;
        }
        return null;
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
    initAll() {
        TaskManager.init();
        ProjectsManager.init();
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
