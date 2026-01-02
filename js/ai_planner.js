// ===================================
// AI Planner Manager - Enhanced Version
// 資格試験・研究・仕事など様々な目標に対応
// ===================================

const AIPlanner = {
  isGenerating: false,
    generatedTasks: null,
    selectedType: 'certification',
    currentProjectName: '', // 現在のプロジェクト名

    // 目標タイプ定義
    goalTypes: {
        certification: {
            id: 'certification',
            name: '資格試験',
            icon: '📚',
            description: '資格取得の勉強計画',
            placeholder: '例: 応用情報技術者試験に合格する',
            category: 'certification',
            promptHint: '資格試験対策'
        },
        research: {
            id: 'research',
            name: '研究プロジェクト',
            icon: '🔬',
            description: '研究・論文執筆の計画',
            placeholder: '例: 機械学習に関する論文を投稿する',
            category: 'research',
            promptHint: '研究・論文'
        },
        work: {
            id: 'work',
            name: '仕事プロジェクト',
            icon: '💼',
            description: 'ビジネス目標の達成',
            placeholder: '例: 新規プロジェクトをリリースする',
            category: 'work',
            promptHint: 'ビジネス・仕事'
        },
        skill: {
            id: 'skill',
            name: 'スキル習得',
            icon: '🚀',
            description: '新しいスキルの習得',
            placeholder: '例: Pythonを使ってWebアプリを作れるようになる',
            category: 'private',
            promptHint: 'スキル習得・学習'
        }
    },

  init() {
    this.renderButton();
    this.renderModal();
    this.attachEvents();
  },

  renderButton() {
        const nav = document.querySelector('.sidebar nav, .nav-section');
    if (!nav) return;

    // Check if button already exists
        if (!document.querySelector('.ai-planner-btn')) {
      const btn = document.createElement('div');
            btn.className = 'nav-item ai-special ai-planner-btn';
      btn.innerHTML = `
                <span class="icon">✨</span>
                <span>AI プランナー</span>
        `;
      btn.onclick = () => this.openModal();
      nav.appendChild(btn);
    }
  },

  renderModal() {
    const existing = document.getElementById('ai-modal');
    if (existing) existing.remove();

        const typeOptionsHTML = Object.values(this.goalTypes).map(type => `
            <div class="ai-type-option ${type.id === this.selectedType ? 'selected' : ''}" 
                 data-type="${type.id}" onclick="AIPlanner.selectType('${type.id}')">
                <div class="icon">${type.icon}</div>
                <div class="label">${type.name}</div>
                <div class="desc">${type.description}</div>
            </div>
        `).join('');

    const div = document.createElement('div');
    div.id = 'ai-modal';
    div.className = 'modal-overlay';
    div.innerHTML = `
            <div class="modal-container" style="width: 720px; max-width: 95vw;">
                <div class="modal-header ai-modal-header">
                    <h3>
                        <span style="font-size: 1.5rem;">✨</span>
                        AI タスクプランナー
          </h3>
                    <button class="btn-icon" onclick="AIPlanner.closeModal()" style="background: rgba(255,255,255,0.2); border: none; color: white;">×</button>
        </div>
        <div class="modal-body">
          
                    <!-- Step 1: Goal Type Selection -->
          <div id="ai-form-view">
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px;">
                            目標を入力すると、AIが最適なタスク計画を自動生成します。
                        </p>

                        <div style="margin-bottom: 20px;">
                            <label class="form-label">目標タイプを選択</label>
                            <div class="ai-type-selector">
                                ${typeOptionsHTML}
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label class="form-label">プロジェクト名（グループ名）</label>
                            <input type="text" id="ai-project-name" class="form-control" 
                                placeholder="例: 司法予備試験、機械学習論文、新規事業開発">
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                                ※この名前でタスクがグループ化されます
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label class="form-label">達成したい目標（詳細）</label>
                            <textarea id="ai-goal" class="form-control" rows="3" 
                                placeholder="${this.goalTypes[this.selectedType].placeholder}"></textarea>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                            <div>
                                <label class="form-label">目標期限</label>
                                <input type="date" id="ai-deadline" class="form-control" value="${this.getDefaultDeadline()}">
                            </div>
                            <div>
                                <label class="form-label">現在のレベル</label>
                                <select id="ai-level" class="form-control">
                                    <option value="beginner">初心者</option>
                                    <option value="intermediate" selected>中級者</option>
                                    <option value="advanced">上級者</option>
                                </select>
                            </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                            <label class="form-label">週あたりの学習可能時間</label>
                            <select id="ai-hours" class="form-control">
                                <option value="5">5時間以下</option>
                                <option value="10" selected>5〜10時間</option>
                                <option value="20">10〜20時間</option>
                                <option value="30">20時間以上</option>
                            </select>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button class="btn btn-primary" onclick="AIPlanner.generatePlan()" id="btn-generate">
                                🚀 計画を生成
              </button>
            </div>
          </div>

          <!-- Loading View -->
                    <div id="ai-loading-view" class="ai-loading" style="display:none;">
                        <div class="spinner">🤖</div>
                        <p class="message">AIが最適な計画を分析中...</p>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">
                            目標に合わせたマイルストーンを作成しています
                        </p>
          </div>

          <!-- Result Preview View -->
          <div id="ai-result-view" style="display:none;">
                        <div style="margin-bottom: 16px; padding: 12px 16px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; border-left: 4px solid var(--accent-primary);">
                            <div style="font-size: 0.75rem; color: var(--text-muted);">プロジェクト</div>
                            <div id="ai-preview-project-name" style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);"></div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                            <h4 style="font-size: 1rem; font-weight: 700;">📋 生成されたタスク</h4>
                            <span id="ai-task-count" style="font-size: 0.85rem; color: var(--text-accent);"></span>
                        </div>
                        
                        <div id="ai-plan-preview" style="max-height: 450px; overflow-y: auto; margin-bottom: 24px;">
              <!-- Generated tasks -->
            </div>
                        
                        <div style="display: flex; justify-content: space-between; gap: 12px;">
                            <button class="btn btn-secondary" onclick="AIPlanner.resetForm()">
                                ← 戻る
                            </button>
                            <div style="display: flex; gap: 12px;">
                                <button class="btn btn-secondary" onclick="AIPlanner.generatePlan()">
                                    🔄 再生成
                                </button>
                                <button class="btn btn-success" onclick="AIPlanner.importTasks()">
                                    ✅ ダッシュボードに追加
                                </button>
                            </div>
            </div>
          </div>

                    <!-- Error View -->
                    <div id="ai-error-view" style="display:none; text-align: center; padding: 40px;">
                        <div style="font-size: 3rem; margin-bottom: 16px;">😵</div>
                        <p id="ai-error-message" style="color: var(--accent-danger); margin-bottom: 20px;"></p>
                        <button class="btn btn-secondary" onclick="AIPlanner.resetForm()">戻る</button>
                    </div>

        </div>
      </div>
    `;
    document.body.appendChild(div);
  },

  attachEvents() {
        // Click outside to close
        document.getElementById('ai-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'ai-modal') {
                this.closeModal();
            }
        });
    },

    selectType(typeId) {
        this.selectedType = typeId;
        
        // Update UI
        document.querySelectorAll('.ai-type-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.type === typeId);
        });

        // Update placeholder
        const goalInput = document.getElementById('ai-goal');
        if (goalInput) {
            goalInput.placeholder = this.goalTypes[typeId].placeholder;
    }
  },

  getDefaultDeadline() {
    const d = new Date();
        d.setMonth(d.getMonth() + 2); // Default 2 months
    return d.toISOString().split('T')[0];
  },

  openModal() {
    document.getElementById('ai-modal').classList.add('active');
  },

  closeModal() {
    document.getElementById('ai-modal').classList.remove('active');
    this.resetForm();
  },

  async generatePlan() {
        const projectName = document.getElementById('ai-project-name').value.trim();
    const goal = document.getElementById('ai-goal').value.trim();
    const deadline = document.getElementById('ai-deadline').value;
        const level = document.getElementById('ai-level').value;
        const hours = document.getElementById('ai-hours').value;

        if (!projectName) {
            alert('プロジェクト名を入力してください');
            return;
        }

    if (!goal) {
            alert('目標を入力してください');
      return;
    }

        // プロジェクト名を保存
        this.currentProjectName = projectName;

    this.setView('loading');

    try {
            const goalType = this.goalTypes[this.selectedType];
            
      // Call local python server proxy
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goal: goal,
                    projectName: projectName,
                    deadline: deadline,
                    goalType: goalType.promptHint,
                    category: goalType.category,
                    level: level,
                    hoursPerWeek: hours
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();
      const planContent = data.choices[0].message.content;
      const plan = JSON.parse(planContent);

            // Set category and projectName for all tasks
            this.generatedTasks = plan.tasks.map(t => ({
                ...t,
                category: goalType.category,
                projectName: projectName,
                aiGenerated: true
            }));
            
            this.renderPreview(this.generatedTasks);
      this.setView('result');

    } catch (error) {
      console.error(error);
            this.showError(error.message);
    }
  },

  renderPreview(tasks) {
    const container = document.getElementById('ai-plan-preview');
        const countEl = document.getElementById('ai-task-count');
        const projectNameEl = document.getElementById('ai-preview-project-name');
        
        // プロジェクト名を表示
        if (projectNameEl) {
            projectNameEl.textContent = this.currentProjectName;
        }
        
        // サブタスクの総数を計算
        const totalSubtasks = tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
        
        if (countEl) {
            countEl.textContent = `${tasks.length} タスク・${totalSubtasks} サブタスク`;
        }

        container.innerHTML = tasks.map((t, idx) => {
            const priorityClass = t.priority === 'high' ? 'badge-high' : 
                                  t.priority === 'medium' ? 'badge-medium' : 'badge-low';
            const priorityLabel = t.priority === 'high' ? '重要' : 
                                  t.priority === 'medium' ? '通常' : '低';
            
            return `
                <div class="ai-preview-item" style="border-left-color: ${t.priority === 'high' ? 'var(--accent-danger)' : t.priority === 'medium' ? 'var(--accent-warning)' : 'var(--accent-success)'};">
                    <div class="task-num">STEP ${idx + 1} / ${tasks.length}</div>
                    <div class="task-title">${this.escapeHTML(t.title)}</div>
                    <div class="task-meta">
                        <span>📅 期限: ${t.deadline}</span>
                        <span class="badge ${priorityClass}">${priorityLabel}</span>
                        ${t.subtasks?.length ? `<span style="color: var(--text-muted);">📝 ${t.subtasks.length}項目</span>` : ''}
        </div>
        ${t.subtasks && t.subtasks.length > 0 ? `
                        <div class="subtasks" style="margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">📋 やること:</div>
                            <ul style="margin: 0; padding-left: 0; list-style: none;">
                                ${t.subtasks.map((s, i) => `
                                    <li style="padding: 6px 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.85rem; display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="color: var(--text-accent); font-weight: 600; min-width: 20px;">${i + 1}.</span>
                                        <span>${this.escapeHTML(s.title)}</span>
                                    </li>
                                `).join('')}
          </ul>
                        </div>
        ` : ''}
      </div>
            `;
        }).join('');
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

  importTasks() {
        if (!this.generatedTasks || this.generatedTasks.length === 0) return;

    this.generatedTasks.forEach(t => {
      TaskManager.addTask({
        title: t.title,
                category: t.category || 'private',
                projectName: t.projectName || this.currentProjectName,
        priority: t.priority || 'medium',
        deadline: t.deadline,
        subtasks: t.subtasks || [],
                description: 'AI Plannerで自動生成',
                aiGenerated: true
      });
    });

        // Refresh UI
        if (typeof renderAllTasks === 'function') renderAllTasks();
    if (typeof StatsManager !== 'undefined') StatsManager.updateStatsUI();
    if (typeof CalendarManager !== 'undefined') CalendarManager.renderCalendar();

        // Show success message
        this.showSuccessToast(`${this.generatedTasks.length}個のタスクを追加しました！`);
    this.closeModal();
  },

    showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
            z-index: 2000;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = '✨ ' + message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showError(message) {
        const errorMessage = document.getElementById('ai-error-message');
        if (errorMessage) {
            errorMessage.textContent = message + '\n\nserver.pyが起動していること、.envにAPI keyが設定されていることを確認してください。';
        }
        this.setView('error');
    },

  setView(viewName) {
    document.getElementById('ai-form-view').style.display = viewName === 'form' ? 'block' : 'none';
    document.getElementById('ai-loading-view').style.display = viewName === 'loading' ? 'block' : 'none';
    document.getElementById('ai-result-view').style.display = viewName === 'result' ? 'block' : 'none';
        document.getElementById('ai-error-view').style.display = viewName === 'error' ? 'block' : 'none';
  },

  resetForm() {
    this.setView('form');
    this.generatedTasks = null;
  }
};
