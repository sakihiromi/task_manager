// ===================================
// Analytics & Statistics Manager - Enhanced
// ===================================

const StatsManager = {
    charts: {},

    // メインの更新メソッド
    updateStatsUI() {
        const tmTasks = TaskManager.getAllTasks();
        const projectTasks = this.getProjectTasks();
        const plannerTasks = this.getPlannerTasks();
        
        // 統合したタスク
        const allTasks = [...tmTasks, ...projectTasks, ...plannerTasks];
        const completedTasks = allTasks.filter(t => t.completed);

        // 基本統計
        this.updateBasicStats(allTasks, completedTasks);

        // グラフ更新
        this.renderContributionHeatmap(completedTasks);
        this.renderCategoryChart(allTasks);
        
        // プロジェクト統計
        this.updateProjectStats();
    },

    // プロジェクトからタスクを取得
    getProjectTasks() {
        if (typeof ProjectsManager === 'undefined') return [];
        
        const tasks = [];
        ProjectsManager.projects.forEach(project => {
            project.tasks.forEach(task => {
                tasks.push({
                    ...task,
                    category: project.category,
                    projectId: project.id,
                    projectName: project.name,
                    source: 'project'
                });
            });
        });
        return tasks;
    },

    // プランナーからタスクを取得
    getPlannerTasks() {
        // PlannerUIが読み込まれている場合はそちらを使用
        if (typeof PlannerUI !== 'undefined' && PlannerUI.data) {
            return this._extractPlannerTasks(PlannerUI.data);
        }
        
        // CalendarManagerのキャッシュがあればそれを使用
        if (typeof CalendarManager !== 'undefined' && CalendarManager._plannerDataCache) {
            return this._extractPlannerTasks(CalendarManager._plannerDataCache);
        }
        
        // ローカルストレージから読み込む
        const stored = localStorage.getItem('planner_data_v1');
        if (!stored) return [];
        
        try {
            const plannerData = JSON.parse(stored);
            return this._extractPlannerTasks(plannerData);
        } catch (e) {
            console.warn('プランナーデータの読み込みに失敗:', e);
            return [];
        }
    },
    
    _extractPlannerTasks(plannerData) {
        const tasks = [];
        const dailyTasks = plannerData.dailyTasks || {};
        
        // 日ごとのタスク
        Object.entries(dailyTasks).forEach(([dateStr, dayTasks]) => {
            dayTasks.forEach((task, idx) => {
                tasks.push({
                    id: `planner_daily_${dateStr}_${idx}`,
                    title: task.text,
                    deadline: dateStr,
                    completed: task.completed,
                    completedAt: task.completed ? (task.completedAt || dateStr + 'T12:00:00.000Z') : null,
                    source: 'planner',
                    plannerType: 'daily'
                });
            });
        });
        
        // 週のTODO
        const weekPlans = plannerData.weekPlans || {};
        Object.entries(weekPlans).forEach(([weekKey, plan]) => {
            if (plan.todos) {
                plan.todos.forEach((task, idx) => {
                    // 週の開始日を期限として使用
                    const match = weekKey.match(/week-(\d{4})-(\d{2})-(\d{2})/);
                    if (match) {
                        const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
                        tasks.push({
                            id: `planner_week_${weekKey}_${idx}`,
                            title: task.text,
                            deadline: dateStr,
                            completed: task.completed,
                            completedAt: task.completed ? (task.completedAt || dateStr + 'T12:00:00.000Z') : null,
                            source: 'planner',
                            plannerType: 'week'
                        });
                    }
                });
            }
        });
        
        // 月のTODO
        const monthPlans = plannerData.monthPlans || {};
        Object.entries(monthPlans).forEach(([monthKey, plan]) => {
            if (plan.todos) {
                plan.todos.forEach((task, idx) => {
                    // completedAtがあればそれを使用、なければ月の初日を使用
                    const monthDate = monthKey + '-01';
                    tasks.push({
                        id: `planner_month_${monthKey}_${idx}`,
                        title: task.text,
                        deadline: monthDate,
                        completed: task.completed,
                        completedAt: task.completed ? (task.completedAt || null) : null,
                        source: 'planner',
                        plannerType: 'month',
                        label: task.label
                    });
                });
            }
        });
        
        return tasks;
    },
    
    updateProjectStats() {
        if (typeof ProjectsManager === 'undefined') return;
        
        const projects = ProjectsManager.getAllProjects();
        const activeProjects = projects.filter(p => 
            p.status !== 'completed' && p.status !== 'archived'
        );
        
        // 統計表示更新
        const elStreak = document.getElementById('stat-streak');
        if (elStreak) {
            const streakBox = elStreak.closest('.stat-box');
            const trendEl = streakBox?.querySelector('.stat-trend');
            if (trendEl && activeProjects.length > 0) {
                trendEl.innerHTML = `<span>🔥</span> 日 <span style="color: var(--accent-primary); margin-left: 8px;">📂 ${activeProjects.length}</span>`;
            }
        }
    },

    updateBasicStats(allTasks, completedTasks) {
        const total = allTasks.length;
        const completed = completedTasks.length;
        const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
        const pending = total - completed;
        const streak = TaskManager.getStreak();
        const weeklyCompleted = TaskManager.getWeeklyCompletedCount();

        const elCompleted = document.getElementById('stat-completed-count');
        const elPending = document.getElementById('stat-pending-count');
        const elRate = document.getElementById('stat-completion-rate');
        const elStreak = document.getElementById('stat-streak');
        const elWeekly = document.getElementById('stat-weekly');

        if (elCompleted) elCompleted.textContent = completed;
        if (elPending) elPending.textContent = pending;
        if (elRate) {
            elRate.textContent = `${rate}%`;
            elRate.classList.toggle('gradient', rate >= 50);
        }
        if (elStreak) elStreak.textContent = streak;
        if (elWeekly) elWeekly.textContent = weeklyCompleted;

        // Focus Score (legacy support)
        const elScore = document.getElementById('stat-focus-score');
        if (elScore) {
        const score = this.calculateFocusScore(completedTasks);
            elScore.textContent = score;
        }
    },

    calculateFocusScore(completedTasks) {
        if (completedTasks.length === 0) return 0;

        let weightedSum = 0;
        completedTasks.forEach(t => {
            if (t.priority === 'high') weightedSum += 3;
            else if (t.priority === 'medium') weightedSum += 2;
            else weightedSum += 1;
        });

        return weightedSum;
    },

    // 貢献度ヒートマップ（GitHub Style - Dark Mode）
    renderContributionHeatmap(completedTasks) {
        const container = document.getElementById('contribution-heatmap');
        if (!container) return;

        container.innerHTML = '';

        // 過去30日分の日付を生成
        const daysToShow = 30;
        const today = new Date();

        // 日付ごとの完了数を集計
        const activityMap = {};
        completedTasks.forEach(task => {
            if (task.completedAt) {
                const date = task.completedAt.split('T')[0];
                activityMap[date] = (activityMap[date] || 0) + 1;
            }
        });

        for (let i = daysToShow; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            const count = activityMap[dateStr] || 0;
            let level = 0;
            if (count > 0) level = 1;
            if (count > 2) level = 2;
            if (count > 4) level = 3;
            if (count > 6) level = 4;

            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.dataset.level = level;
            cell.title = `${dateStr}: ${count} tasks`;
            cell.dataset.tooltip = `${dateStr}: ${count}`;
            container.appendChild(cell);
        }
    },

    // カテゴリー別分布チャート (Chart.js) - Extended categories
    renderCategoryChart(allTasks) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const counts = {
            work: 0,
            research: 0,
            study: 0,
            private: 0
        };

        allTasks.forEach(t => {
            if (!t.completed && counts[t.category] !== undefined) {
                counts[t.category]++;
            }
        });

        const data = [counts.work, counts.research, counts.study, counts.private];
        const labels = ['仕事', '研究', '学習', 'プライベート'];
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

        if (this.charts.category) {
            this.charts.category.data.labels = labels;
            this.charts.category.data.datasets[0].data = data;
            this.charts.category.data.datasets[0].backgroundColor = colors;
            this.charts.category.update();
        } else {
            this.charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { family: 'Outfit', size: 11 },
                                color: '#a1a1aa',
                                padding: 16
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    }
};
