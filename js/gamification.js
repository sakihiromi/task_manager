// ===================================
// ゲーミフィケーションロジック
// ===================================

const GamificationManager = {
    // ストレージキー
    STORAGE_KEY: 'quest_board_user_data',

    // ユーザーデータ
    userData: {
        level: 1,
        currentExp: 0,
        title: '見習い冒険者',
        avatar: '🐯'
    },

    // 経験値テーブル（レベルごとの必要経験値）
    levelTable: [],

    // 初期化
    init() {
        this.generateLevelTable();
        this.loadData();
        this.updateUI();
    },

    // レベルテーブル生成（単純な計算式）
    generateLevelTable() {
        // レベル100まで。必要経験値はレベル*100
        for (let i = 1; i <= 100; i++) {
            this.levelTable[i] = i * 100;
        }
    },

    // データ読み込み
    loadData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            try {
                this.userData = JSON.parse(data);
            } catch (e) {
                console.error('User data load error', e);
            }
        }
    },

    // データ保存
    saveData() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userData));
    },

    // 経験値獲得
    gainExp(amount) {
        this.userData.currentExp += amount;
        this.checkLevelUp();
        this.saveData();
        this.updateUI();
        return this.userData.currentExp;
    },

    // レベルアップチェック
    checkLevelUp() {
        const nextLevelExp = this.getNextLevelExp();
        if (this.userData.currentExp >= nextLevelExp) {
            this.userData.level++;
            this.userData.currentExp -= nextLevelExp; // 次のレベルへ持ち越し（累積型にするなら計算変更）
            this.levelUpEffect();
            this.updateTitle();
            // 再帰的にチェック（一度に複数レベルアップする場合）
            this.checkLevelUp();
        }
    },

    // 次のレベルに必要な経験値を取得
    getNextLevelExp() {
        return this.levelTable[this.userData.level] || 999999;
    },

    // 称号の更新
    updateTitle() {
        const level = this.userData.level;
        if (level >= 50) this.userData.title = '伝説の勇者';
        else if (level >= 30) this.userData.title = 'マスター研究者';
        else if (level >= 20) this.userData.title = 'ベテラン冒険者';
        else if (level >= 10) this.userData.title = '一人前の冒険者';
        else if (level >= 5) this.userData.title = '駆け出し研究者';
        else this.userData.title = '見習い冒険者';
    },

    // UI更新
    updateUI() {
        const levelEl = document.getElementById('user-level');
        const expBarEl = document.getElementById('exp-bar');
        const currentExpEl = document.getElementById('current-exp');
        const nextLevelExpEl = document.getElementById('next-level-exp');
        const expNeededEl = document.getElementById('exp-needed');
        const titleEl = document.getElementById('user-title');
        const avatarEl = document.getElementById('user-avatar');

        if (!levelEl) return;

        const nextExp = this.getNextLevelExp();
        const progress = (this.userData.currentExp / nextExp) * 100;

        levelEl.textContent = this.userData.level;
        currentExpEl.textContent = this.userData.currentExp;
        nextLevelExpEl.textContent = nextExp;
        expNeededEl.textContent = nextExp - this.userData.currentExp;
        titleEl.textContent = this.userData.title;
        avatarEl.textContent = this.userData.avatar;

        // アニメーション付きでバーを更新
        expBarEl.style.width = `${progress}%`;
    },

    // レベルアップ演出
    levelUpEffect() {
        // 紙吹雪とは別の、より派手な演出
        alert(`🎉 レベルアップ！ Lv.${this.userData.level} になりました！\n称号: ${this.userData.title}`);

        // ここで専用のモーダルやエフェクトを出せるとベスト
        this.createSparkles();
    },

    // キラキラエフェクト
    createSparkles() {
        const colors = ['#FFD700', '#FFA500', '#FF4500'];
        for (let i = 0; i < 50; i++) {
            const sparkle = document.createElement('div');
            sparkle.style.position = 'fixed';
            sparkle.style.left = '50%';
            sparkle.style.top = '50%';
            sparkle.style.width = '10px';
            sparkle.style.height = '10px';
            sparkle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            sparkle.style.borderRadius = '50%';
            sparkle.style.zIndex = '9999';
            sparkle.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;

            const angle = Math.random() * Math.PI * 2;
            const velocity = 5 + Math.random() * 10;
            const tx = Math.cos(angle) * velocity * 20;
            const ty = Math.sin(angle) * velocity * 20;

            sparkle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 1000,
                easing: 'cubic-bezier(0, .9, .57, 1)',
                fill: 'forwards'
            });

            document.body.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 2000);
        }
    }
};
